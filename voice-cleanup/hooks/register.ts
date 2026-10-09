import type { EngineInterface, Register } from 'claude-code'

import { cleanupRequest, unpasted, wasDictated, withoutPastes, withPastes } from './clean'

const RECALL_DEPTH = 100

let box = ''
let typed = 0
let dictated = 0
let suggestion = ''

const arrivedWithoutEdits = (text: string) => Math.max(0, unpasted(text).length - unpasted(box).length)

const startOver = () => {
  box = ''
  typed = 0
  dictated = 0
}

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
    if (e.text) {
      dictated += arrivedWithoutEdits(e.text)
    } else {
      startOver()
    }
    if (e.key) {
      typed += e.inputText.length
    }
    const result = await next(e)
    if (result.text) {
      box = result.text
    } else {
      startOver()
    }
    return result
  })

  on('prompt.suggest', async ($, e, next) => {
    const result = await next(e)
    if (result.isShown) {
      suggestion = e.text
    }
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer') {
      await remember($, e.text)
      return next(e)
    }

    const isDictated = wasDictated(e.text, typed, dictated + arrivedWithoutEdits(e.text))
    startOver()

    const recalled = e.text === suggestion || (await submitted($)).includes(e.text.trim())
    if (recalled || !isDictated) {
      await remember($, e.text)
      return next(e)
    }

    const { spoken, pastes } = withoutPastes(e.text)
    const reply = await $.model.complete(cleanupRequest(spoken))
    const cleanedSpoken = reply.isAnswered ? reply.text.trim() : ''
    const cleaned = cleanedSpoken && withPastes(cleanedSpoken, pastes)

    if (!cleaned) {
      const why = !reply.isAnswered ? reply.reason : !cleanedSpoken ? 'empty reply' : 'pasted text lost'
      $.ui.toast(`Voice cleanup skipped: ${why}`)
      await remember($, e.text)
      return next(e)
    }

    $.ui.toast(`Voice cleanup: ${cleanedSpoken}`)
    await remember($, e.text, cleaned)
    return next({ ...e, text: cleaned })
  })
}
