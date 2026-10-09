import type { ModelCompleteRequest } from 'claude-code'

const RULES = `You clean up text a non-native English speaker dictated by voice to a coding assistant.

- Remove filler words and hesitations (um, uh, er, erm, ah, hmm, like and you know when used as fillers).
- Remove accidental word repetitions ("the the", "I I want") and stutters ("w- want", "th-the").
- Remove false starts the speaker corrected themselves on, keeping the corrected version.
- Fix grammar, word order, articles and verb forms so the text reads as natural English.
- Keep the meaning, the intent, the tone and the language. Do not add, answer, summarise or explain anything.
- Keep code, commands, file paths, identifiers, URLs, numbers and technical terms exactly as written.
- Keep every ⟦paste N⟧ marker exactly as written and where it stands: each stands for text the speaker pasted.
- If the text is already clean, return it unchanged.

Reply with the cleaned text only, without quotes, tags or commentary.`

const PASTE = /<pasted_content id="([^"]*)">[\s\S]*?<\/pasted_content(?: id="\1")?>/g

const marker = (index: number) => `⟦paste ${index + 1}⟧`

const PLACEHOLDER = /\[Pasted text #\d+[^\]]*\]/g

export const unpasted = (text: string) => text.replace(PASTE, '').replace(PLACEHOLDER, '').trim()

export const withoutPastes = (text: string) => {
  const pastes: string[] = []
  const spoken = text.replace(PASTE, paste => marker(pastes.push(paste) - 1))
  return { spoken, pastes }
}

export const withPastes = (cleaned: string, pastes: readonly string[]) =>
  pastes.every((_, index) => cleaned.split(marker(index)).length === 2)
    ? pastes.reduce((text, paste, index) => text.replace(marker(index), () => paste), cleaned)
    : undefined

export const wasDictated = (text: string, typed: number, dictated: number) =>
  !/^\s*[/!]/.test(text) && dictated > typed

export const cleanupRequest = (text: string): ModelCompleteRequest => ({
  model: 'haiku',
  system: RULES,
  prompt: `<dictation>\n${text}\n</dictation>`,
  effort: 'low',
  maxTokens: Math.min(64000, 256 + Math.ceil(text.length / 2)),
  timeoutMs: 8000,
})
