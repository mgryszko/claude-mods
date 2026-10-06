import { expect, test } from 'claude-code/testing'

const question = (kind: 'composer' | 'task-notification') => ({
  text: 'hello',
  origin: { kind },
  isExpanded: false,
})

const answer = { text: 'answer', isFirstOfReply: true }

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws a separator and a blue bar beside a typed question on ${surface}`, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, $ => {
      const { Text } = $.ui.resolve({ surface, component: 'UserMessage' })
      return <Text>{'❯ hello'}</Text>
    })

    const ui = await $.ui.mount({
      plugin: 'turn-separator',
      surface,
      component: 'UserMessage',
      requestId: 'm1',
      viewport: { columns: 10, rows: 20 },
      props: question('composer'),
    })

    expect((await ui.find({ type: 'Text', text: /━/ }))?.text).toBe('━'.repeat(10))
    expect((await ui.find({ type: 'Text', text: /hello/ }))?.text).toBe('hello')
    expect(JSON.stringify(await ui.drawn())).toContain('"backgroundColor":"#5f87d7"')
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
      props: question('task-notification'),
    })

    expect(await ui.find({ text: /━/ })).toBeUndefined()
    expect((await ui.find({ type: 'Text' }))?.text).toBe('task done')
  })

  test(`draws a green bar beside an answer without its bullet on ${surface}`, async ($, on) => {
    let isFirstOfReply: boolean | undefined
    on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
      isFirstOfReply = e.props.isFirstOfReply
      const { Text } = $.ui.resolve({ surface, component: 'AssistantMessage' })
      return <Text>{'answer'}</Text>
    })

    const ui = await $.ui.mount({
      plugin: 'turn-separator',
      surface,
      component: 'AssistantMessage',
      requestId: 'a1',
      props: answer,
    })

    expect(JSON.stringify(await ui.drawn())).toContain('"backgroundColor":"#5faf5f"')
    expect(isFirstOfReply).toBe(false)
  })
}
