import type { ModelCompleteRequest } from 'claude-code'

const RULES = `You clean up text a non-native English speaker dictated by voice to a coding assistant.

- Remove filler words and hesitations (um, uh, er, erm, ah, hmm, like and you know when used as fillers).
- Remove accidental word repetitions ("the the", "I I want") and stutters ("w- want", "th-the").
- Remove false starts the speaker corrected themselves on, keeping the corrected version.
- Fix grammar, word order, articles and verb forms so the text reads as natural English.
- Keep the meaning, the intent, the tone and the language. Do not add, answer, summarise or explain anything.
- Keep code, commands, file paths, identifiers, URLs, numbers and technical terms exactly as written.
- If the text is already clean, return it unchanged.

Reply with the cleaned text only, without quotes, tags or commentary.`

export const wasDictated = (text: string, insertedByEdits: number) =>
  !/^\s*[/!]/.test(text) && text.length - insertedByEdits > text.length / 2

export const cleanupRequest = (text: string): ModelCompleteRequest => ({
  model: 'haiku',
  system: RULES,
  prompt: `<dictation>\n${text}\n</dictation>`,
  effort: 'low',
  maxTokens: Math.min(64000, 256 + Math.ceil(text.length / 2)),
  timeoutMs: 8000,
})
