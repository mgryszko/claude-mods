import { expect, test } from 'claude-code/testing'

import { wasDictated } from './clean'

test('takes text that never came through edits as dictated', () => {
  expect(wasDictated("I'm di dictating a sentence and submitting it with a new count.", 3)).toBe(true)
})

test('takes typed text as not dictated, backspaces included', () => {
  expect(wasDictated('typing a short prompt', 23)).toBe(false)
})

test('takes pasted text as not dictated', () => {
  expect(wasDictated('Next:\n  - Paste some text and submit it.', 40)).toBe(false)
})

test('takes a dictated prompt with a few typed fixes as dictated', () => {
  expect(wasDictated('can you check the the failing tests in the parser module', 6)).toBe(true)
})

test('leaves slash commands and shell escapes alone', () => {
  expect(wasDictated('/model haiku', 0)).toBe(false)
  expect(wasDictated('! echo hello', 0)).toBe(false)
})
