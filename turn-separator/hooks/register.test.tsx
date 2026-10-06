import { expect, test } from 'claude-code/testing'

const props = (kind: 'composer' | 'task-notification') => ({
  text: 'hello',
  origin: { kind },
  isExpanded: true,
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws a separator above a typed prompt on ${surface}`, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, $ => {
      const { Text } = $.ui.resolve({ surface, component: 'UserMessage' })
      return <Text>{'> hello'}</Text>
    })

    const ui = await $.ui.mount({
      plugin: 'turn-separator',
      surface,
      component: 'UserMessage',
      requestId: 'm1',
      viewport: { columns: 10, rows: 20 },
      props: props('composer'),
    })

    expect((await ui.find({ type: 'Text', text: /━/ }))?.text).toBe('━'.repeat(10))
    expect(await ui.find({ text: '> hello' })).toBeDefined()
  })

  test(`leaves a task notification alone on ${surface}`, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, $ => {
      const { Text } = $.ui.resolve({ surface, component: 'UserMessage' })
      return <Text>{'task done'}</Text>
    })

    const ui = await $.ui.mount({
      plugin: 'turn-separator',
      surface,
      component: 'UserMessage',
      requestId: 'm2',
      props: props('task-notification'),
    })

    expect(await ui.find({ text: /━/ })).toBeUndefined()
  })
}
