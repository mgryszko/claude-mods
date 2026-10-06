import type { Elements, Register, RenderNode } from 'claude-code'

const QUESTION_BAR = '#5f87d7'
const ANSWER_BAR = '#5faf5f'
const SEPARATED = new Set(['composer', 'bridge'])

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

    return withBar(Box, ANSWER_BAR, drawn)
  })
}
