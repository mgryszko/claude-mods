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
