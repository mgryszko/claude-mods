export type Recaps = string[]

declare module 'claude-code' {
  interface PluginState {
    'turn-separator': { recaps: Recaps }
  }
}
