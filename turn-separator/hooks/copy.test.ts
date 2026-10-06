import { expect, test } from 'claude-code/testing'

import { withoutBarIndent } from './copy'

test('drops the bar indent from every copied line', () => {
  expect(withoutBarIndent('  first line\n  second line')).toBe('first line\nsecond line')
})

test('keeps indentation that belongs to the content', () => {
  expect(withoutBarIndent('  fun main() {\n      println()\n  }')).toBe('fun main() {\n    println()\n}')
})

test('leaves a line without the bar indent alone', () => {
  expect(withoutBarIndent('mid-line start\n  next line')).toBe('mid-line start\nnext line')
})
