import { expect, test } from 'claude-code/testing'

import { wasDictated, withoutPastes, withPastes } from './clean'

test('takes text that never came through edits as dictated', () => {
  expect(wasDictated("I'm di dictating a sentence and submitting it with a new count.", 3, 61)).toBe(true)
})

test('takes typed text as not dictated', () => {
  expect(wasDictated('typing a short prompt', 23, 0)).toBe(false)
})

test('takes pasted text as not dictated', () => {
  expect(wasDictated('Next:\n  - Paste some text and submit it.', 0, 0)).toBe(false)
})

test('takes a dictated prompt with a few typed fixes as dictated', () => {
  expect(wasDictated('can you check the the failing tests in the parser module', 6, 50)).toBe(true)
})

test('takes a typed prompt with a short completion as not dictated', () => {
  expect(wasDictated('look at @src/parser.ts and fix the bug', 26, 12)).toBe(false)
})

test('leaves slash commands and shell escapes alone', () => {
  expect(wasDictated('/model haiku', 0, 12)).toBe(false)
  expect(wasDictated('! echo hello', 0, 12)).toBe(false)
})

const paste = '<pasted_content id="7">\nTypeError: x is undefined\n</pasted_content>'

test('swaps each paste for a marker and puts it back', () => {
  const { spoken, pastes } = withoutPastes(`um explain this ${paste} please`)

  expect(spoken).toBe('um explain this ⟦paste 1⟧ please')
  expect(withPastes('Explain this ⟦paste 1⟧, please.', pastes)).toBe(`Explain this ${paste}, please.`)
})

test('gives up when the cleaned text lost or doubled a marker', () => {
  const { pastes } = withoutPastes(`explain ${paste}`)

  expect(withPastes('Explain this.', pastes)).toBe(undefined)
  expect(withPastes('⟦paste 1⟧ ⟦paste 1⟧', pastes)).toBe(undefined)
})
