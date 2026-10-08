import { atom, read, update } from 'claude-code'
import type { Elements, Register, RenderNode } from 'claude-code'

import type { Recaps } from '../types'
import { withoutBarIndent } from './copy'

const QUESTION_BAR = '#5f87d7'
const ANSWER_BAR = '#5faf5f'
const RECAP_BAR = '#ffaf00'
const KEPT_RECAPS = 200
const SEPARATED = new Set(['composer', 'bridge'])

const recaps = atom({ plugin: 'turn-separator', key: 'recaps' } as const, [] as Recaps)

const isRecap = (text: string, kept: Recaps) => text.trim() !== '' && kept.some(recap => recap.endsWith(text.trim()))

const withBar = (Box: Elements[keyof Elements]['Box'], color: string, body: RenderNode) => (
  <Box flexDirection="row">
    <Box width={1} flexShrink={0} backgroundColor={color} />
    <Box paddingLeft={1} flexGrow={1}>
      {body}
    </Box>
  </Box>
)

export const register: Register = on => {
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (!SEPARATED.has(e.props.origin.kind)) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const width = e.viewport?.columns ?? 80

    return (
      <Box flexDirection="column">
        <Text dimColor>{'━'.repeat(width)}</Text>
        {withBar(Box, QUESTION_BAR, <Text>{e.props.text}</Text>)}
      </Box>
    )
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const { Box } = $.ui.resolve(e)
    const drawn = await next({ ...e, props: { ...e.props, isFirstOfReply: false } })

    if (!e.props.isSummary && isRecap(e.props.text, await read($, recaps))) {
      return withBar(Box, RECAP_BAR, drawn)
    }
    return withBar(Box, ANSWER_BAR, drawn)
  })

  on('turn.complete', async ($, e, next) => {
    const answer = e.answer.trim()
    if (e.agentId === undefined && answer !== '') {
      await update($, recaps, kept => [...kept, answer].slice(-KEPT_RECAPS))
    }
    return next(e)
  })

  on('ui.copy', async ($, e, next) => {
    const selected = await $.ui.selection()

    if (selected?.text !== e.text) {
      return next(e)
    }

    return next({ ...e, text: withoutBarIndent(e.text) })
  })
}
