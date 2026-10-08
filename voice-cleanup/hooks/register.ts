import type { EngineInterface, Register } from 'claude-code'

import { cleanupRequest, wasDictated } from './clean'

const RECALL_DEPTH = 100

let insertedByEdits = 0
let suggestion = ''

async function submitted($: EngineInterface) {
  const stored = await $.store.get('submitted')
  return Array.isArray(stored) ? stored.filter((text): text is string => typeof text === 'string') : []
}

async function remember($: EngineInterface, ...texts: string[]) {
  const kept = [...(await submitted($)), ...texts.map(text => text.trim())]
  await $.store.set('submitted', kept.slice(-RECALL_DEPTH))
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

    const recalled = e.text === suggestion || (await submitted($)).includes(e.text.trim())
    if (e.origin.kind !== 'composer' || recalled || !wasDictated(e.text, inserted)) {
      await remember($, e.text)
      return next(e)
    }

    const reply = await $.model.complete(cleanupRequest(e.text))
    const cleaned = reply.isAnswered ? reply.text.trim() : ''

    if (!cleaned) {
      $.ui.toast(`Voice cleanup skipped: ${reply.isAnswered ? 'empty reply' : reply.reason}`)
      await remember($, e.text)
      return next(e)
    }

    $.ui.toast(`Voice cleanup: ${cleaned}`)
    await remember($, e.text, cleaned)
    return next({ ...e, text: cleaned })
  })
}
