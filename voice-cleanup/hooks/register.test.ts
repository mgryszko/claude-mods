import type { PromptEditInput, PromptEditResult } from 'claude-code'
import { expect, test, type TestBody } from 'claude-code/testing'

const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' as const } })

const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

type On = Parameters<TestBody>[1]

const withSession = (on: On, stored: Record<string, unknown> = {}) => {
  on('store.get', (_$, e) => ({ value: stored[e.key] }))
  on('store.set', (_$, e) => {
    stored[e.key] = e.value
    return { value: undefined }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
}

const withComposer = (on: On) => {
  on('prompt.edit', (_$, e) => ({
    text: e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end),
    cursor: e.start + e.inputText.length,
  }))
}

type Engine = Parameters<TestBody>[0]

const raiseEdit = ($: Engine, e: PromptEditInput) =>
  ($.prompt as unknown as { edit: (e: PromptEditInput) => Promise<PromptEditResult> }).edit(e)

const edit = ($: Engine, draft: string, inputText: string, key?: string) =>
  raiseEdit($, {
    origin: { kind: 'composer' },
    text: draft,
    cursor: draft.length,
    start: draft.length,
    end: draft.length,
    inputText,
    ...(key ? { key: { key } } : {}),
  })

const type = async ($: Engine, draft: string, text: string) => {
  for (const char of text) {
    await edit($, draft, char, char)
    draft += char
  }
}

const haiku = (on: On, text: string) => {
  const calls: string[] = []
  on('model.complete', (_$, e) => {
    calls.push(e.prompt)
    return { value: { isAnswered: true, text, usage } }
  })
  return calls
}

test('sends a dictated prompt to Haiku and submits its cleaned text', async ($, on) => {
  withSession(on)
  const asked: string[] = []
  on('model.complete', (_$, e) => {
    asked.push(e.model, e.prompt)
    return { value: { isAnswered: true, text: 'I want the tests to pass.\n', usage } }
  })

  const result = await $.prompt.submit(typed('um I want the the tests to pass'))

  expect(asked[0]).toBe('haiku')
  expect(asked[1]).toContain('um I want the the tests to pass')
  expect(result.text).toBe('I want the tests to pass.')
})

test('keeps the original prompt when Haiku gives no answer', async ($, on) => {
  withSession(on)
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'aborted', usage } }))

  const result = await $.prompt.submit(typed('uh fix the parser'))

  expect(result.text).toBe('uh fix the parser')
})

test('does not call Haiku for a slash command', async ($, on) => {
  withSession(on)
  const calls = haiku(on, 'changed')

  const result = await $.prompt.submit(typed('/model haiku'))

  expect(calls).toHaveLength(0)
  expect(result.text).toBe('/model haiku')
})

test('does not touch a prompt another plugin sent in its own name', async ($, on) => {
  withSession(on)
  const calls = haiku(on, 'changed')

  const result = await $.prompt.submit({ text: 'um the build failed', wait: false, origin: { kind: 'plugin', name: 'other' } })

  expect(calls).toHaveLength(0)
  expect(result.text).toBe('um the build failed')
})

test('does not clean a prompt recalled from history again', async ($, on) => {
  withSession(on)
  const calls = haiku(on, 'I want the tests to pass.')

  await $.prompt.submit(typed('um I want the the tests to pass'))
  const recalledOriginal = await $.prompt.submit(typed('um I want the the tests to pass'))
  const recalledCleaned = await $.prompt.submit(typed('I want the tests to pass.'))

  expect(calls).toHaveLength(1)
  expect(recalledOriginal.text).toBe('um I want the the tests to pass')
  expect(recalledCleaned.text).toBe('I want the tests to pass.')
})

test('does not clean a prompt submitted before a restart, as after a rewind', async ($, on) => {
  withSession(on, { submitted: ['Run the parser tests.'] })
  const calls = haiku(on, 'changed')

  const result = await $.prompt.submit(typed('Run the parser tests.'))

  expect(calls).toHaveLength(0)
  expect(result.text).toBe('Run the parser tests.')
})

test('does not clean a suggestion accepted with Tab', async ($, on) => {
  withSession(on)
  const calls = haiku(on, 'changed')
  on('prompt.suggest', () => ({ isShown: true }))

  await $.prompt.suggest({ text: 'Run the tests again', origin: { kind: 'suggestion' } })
  const result = await $.prompt.submit(typed('Run the tests again'))

  expect(calls).toHaveLength(0)
  expect(result.text).toBe('Run the tests again')
})

const dictation = 'um can you explain the this error '
const paste = 'TypeError: x is undefined\n    at parse (src/parser.ts:42)\n    at main (src/index.ts:7)'

test('cleans dictation followed by a longer paste', async ($, on) => {
  withSession(on)
  withComposer(on)
  const calls = haiku(on, 'cleaned')

  await edit($, dictation, paste)
  await $.prompt.submit(typed(dictation + paste))

  expect(calls).toHaveLength(1)
})

test('cleans a longer paste followed by dictation', async ($, on) => {
  withSession(on)
  withComposer(on)
  const calls = haiku(on, 'cleaned')

  await edit($, '', paste)
  await $.prompt.submit(typed(paste + dictation))

  expect(calls).toHaveLength(1)
})

test('does not clean a typed prompt with a paste', async ($, on) => {
  withSession(on)
  withComposer(on)
  const calls = haiku(on, 'changed')

  await type($, '', 'explain ')
  await edit($, 'explain ', paste)
  await $.prompt.submit(typed('explain ' + paste))

  expect(calls).toHaveLength(0)
})

test('forgets what was typed into a draft that was cleared', async ($, on) => {
  withSession(on)
  withComposer(on)
  const calls = haiku(on, 'cleaned')

  const abandoned = 'a long typed prompt I changed my mind about'
  await type($, '', abandoned)
  await raiseEdit($, { origin: { kind: 'composer' }, text: abandoned, cursor: abandoned.length, start: 0, end: abandoned.length, inputText: '' })
  await $.prompt.submit(typed(dictation))

  expect(calls).toHaveLength(1)
})

test('keeps tracking the draft when another plugin submits meanwhile', async ($, on) => {
  withSession(on)
  withComposer(on)
  const calls = haiku(on, 'cleaned')

  await type($, '', 'ok ')
  await $.prompt.submit({ text: 'from elsewhere', wait: false, origin: { kind: 'plugin', name: 'other' } })
  await edit($, 'ok ' + dictation, paste)
  await $.prompt.submit(typed('ok ' + dictation + paste))

  expect(calls).toHaveLength(1)
})

const wrapped = `\n\n<pasted_content id="1002">\n${paste}\n</pasted_content>\n\n`

test('does not clean a paste the box took without an edit', async ($, on) => {
  withSession(on)
  const calls = haiku(on, 'changed')

  const result = await $.prompt.submit(typed(wrapped))

  expect(calls).toHaveLength(0)
  expect(result.text).toBe(wrapped)
})

test('cleans only the dictated part around a paste and keeps the paste as it was', async ($, on) => {
  withSession(on)
  const asked: string[] = []
  on('model.complete', (_$, e) => {
    asked.push(e.prompt)
    return { value: { isAnswered: true, text: 'Can you explain this error? ⟦paste 1⟧', usage } }
  })

  const result = await $.prompt.submit(typed(dictation + wrapped))

  expect(asked[0]).not.toContain('TypeError')
  expect(result.text).toBe(`Can you explain this error? <pasted_content id="1002">\n${paste}\n</pasted_content>`)
})

test('keeps the original prompt when Haiku drops a paste', async ($, on) => {
  withSession(on)
  haiku(on, 'Can you explain this error?')

  const result = await $.prompt.submit(typed(dictation + wrapped))

  expect(result.text).toBe(dictation + wrapped)
})

test('counts dictation after a paste the box shows as a placeholder', async ($, on) => {
  withSession(on)
  withComposer(on)
  const calls = haiku(on, 'cleaned')

  await type($, '[Pasted text #6 +31 lines]', ' ok')
  await $.prompt.submit(typed(`${wrapped} ok um can you explain the this error`))

  expect(calls).toHaveLength(1)
})

test('does not count a paste the box shows as a placeholder as dictation', async ($, on) => {
  withSession(on)
  withComposer(on)
  const calls = haiku(on, 'changed')

  await type($, '[Pasted text #6 +31 lines]', ' explain it')
  await $.prompt.submit(typed(`${wrapped} explain it`))

  expect(calls).toHaveLength(0)
})
