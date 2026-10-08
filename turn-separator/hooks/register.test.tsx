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


const recap = (text: string) => ({ answer: text, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' as const })

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws an amber bar beside the turn's closing recap on ${surface}`, async ($, on) => {
    on('turn.complete', (_$, e) => ({ text: e.answer }))
    on('ui.render', { component: 'AssistantMessage' }, $ => {
      const { Text } = $.ui.resolve({ surface, component: 'AssistantMessage' })
      return <Text>{'All tests pass.'}</Text>
    })

    await $.turn.complete(recap('All tests pass.'))
    const ui = await $.ui.mount({
      plugin: 'turn-separator',
      surface,
      component: 'AssistantMessage',
      requestId: 'a2',
      props: { ...answer, text: 'All tests pass.' },
    })

    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('"backgroundColor":"#ffaf00"')
    expect(drawn).not.toContain('#5faf5f')
  })

  test(`keeps the plain green bar on answer blocks before the recap on ${surface}`, async ($, on) => {
    on('turn.complete', (_$, e) => ({ text: e.answer }))
    on('ui.render', { component: 'AssistantMessage' }, $ => {
      const { Text } = $.ui.resolve({ surface, component: 'AssistantMessage' })
      return <Text>{"I'll look at the parser."}</Text>
    })

    await $.turn.complete(recap('All tests pass.'))
    const ui = await $.ui.mount({
      plugin: 'turn-separator',
      surface,
      component: 'AssistantMessage',
      requestId: 'a3',
      props: { ...answer, text: "I'll look at the parser." },
    })

    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('"backgroundColor":"#5faf5f"')
    expect(drawn).not.toContain('#ffaf00')
  })
}
