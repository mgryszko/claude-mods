import type { Register } from 'claude-code'

import { cleanupRequest, wasDictated } from './clean'

const RECALL_DEPTH = 100

let insertedByEdits = 0
let suggestion = ''
const submitted: string[] = []

function remember(...texts: string[]) {
  submitted.push(...texts)
  submitted.splice(0, Math.max(0, submitted.length - RECALL_DEPTH))
}

export const register: Register = on => {
  on('prompt.edit', async ($, e, next) => {
    insertedByEdits += e.inputText.length
    return next(e)
  })

  on('prompt.suggest', async ($, e, next) => {
    const result = await next(e)
    if (result.isShown) {
      suggestion = e.text
    }
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    const inserted = insertedByEdits
    insertedByEdits = 0

    const recalled = e.text === suggestion || submitted.includes(e.text)
    if (e.origin.kind !== 'composer' || recalled || !wasDictated(e.text, inserted)) {
      remember(e.text)
      return next(e)
    }

    const reply = await $.model.complete(cleanupRequest(e.text))
    const cleaned = reply.isAnswered ? reply.text.trim() : ''

    if (!cleaned) {
      $.ui.toast(`Voice cleanup skipped: ${reply.isAnswered ? 'empty reply' : reply.reason}`)
      remember(e.text)
      return next(e)
    }

    $.ui.toast(`Voice cleanup: ${cleaned}`)
    remember(e.text, cleaned)
    return next({ ...e, text: cleaned })
  })
}
