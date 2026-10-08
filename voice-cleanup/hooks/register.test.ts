import { expect, test } from 'claude-code/testing'

const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' as const } })

const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('sends a dictated prompt to Haiku and submits its cleaned text', async ($, on) => {
  const asked: string[] = []
  on('model.complete', (_$, e) => {
    asked.push(e.model, e.prompt)
    return { value: { isAnswered: true, text: 'I want the tests to pass.\n', usage } }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  const result = await $.prompt.submit(typed('um I want the the tests to pass'))

  expect(asked[0]).toBe('haiku')
  expect(asked[1]).toContain('um I want the the tests to pass')
  expect(result.text).toBe('I want the tests to pass.')
})

test('keeps the original prompt when Haiku gives no answer', async ($, on) => {
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'aborted', usage } }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  const result = await $.prompt.submit(typed('uh fix the parser'))

  expect(result.text).toBe('uh fix the parser')
})

test('does not call Haiku for a slash command', async ($, on) => {
  let called = false
  on('model.complete', () => {
    called = true
    return { value: { isAnswered: true, text: 'changed', usage } }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  const result = await $.prompt.submit(typed('/model haiku'))

  expect(called).toBe(false)
  expect(result.text).toBe('/model haiku')
})

test('does not touch a prompt another plugin sent in its own name', async ($, on) => {
  let called = false
  on('model.complete', () => {
    called = true
    return { value: { isAnswered: true, text: 'changed', usage } }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  const result = await $.prompt.submit({ text: 'um the build failed', wait: false, origin: { kind: 'plugin', name: 'other' } })

  expect(called).toBe(false)
  expect(result.text).toBe('um the build failed')
})

test('does not clean a prompt recalled from history again', async ($, on) => {
  let calls = 0
  on('model.complete', () => {
    calls += 1
    return { value: { isAnswered: true, text: 'I want the tests to pass.', usage } }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  await $.prompt.submit(typed('um I want the the tests to pass'))
  const recalledOriginal = await $.prompt.submit(typed('um I want the the tests to pass'))
  const recalledCleaned = await $.prompt.submit(typed('I want the tests to pass.'))

  expect(calls).toBe(1)
  expect(recalledOriginal.text).toBe('um I want the the tests to pass')
  expect(recalledCleaned.text).toBe('I want the tests to pass.')
})

test('does not clean a suggestion accepted with Tab', async ($, on) => {
  let called = false
  on('model.complete', () => {
    called = true
    return { value: { isAnswered: true, text: 'changed', usage } }
  })
  on('prompt.suggest', () => ({ isShown: true }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))

  await $.prompt.suggest({ text: 'Run the tests again', origin: { kind: 'suggestion' } })
  const result = await $.prompt.submit(typed('Run the tests again'))

  expect(called).toBe(false)
  expect(result.text).toBe('Run the tests again')
})
