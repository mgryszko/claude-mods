import type { Register } from 'claude-code'

const SEPARATED = new Set(['composer', 'bridge'])

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
        {await next(e)}
      </Box>
    )
  })
}
