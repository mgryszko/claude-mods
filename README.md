# claude-mods

Mods for Claude Code: small plugins that hook into the terminal UI and the prompt flow.

| Mod | What it does |
| --- | --- |
| `voice-cleanup` | Cleans up prompts dictated with voice mode using a Claude Haiku model, before they reach the main model |
| `turn-separator` | Separates question and answer blocks in the transcript with a line and coloured bars |

## Install

Inside Claude Code, install the mods you want:

```
/plugin install voice-cleanup --marketplace mgryszko/claude-mods
/plugin install turn-separator --marketplace mgryszko/claude-mods
```

The first install asks whether to add the `claude-mods` marketplace: answer `y`.
Then pick a scope. The user scope makes the mod load in every session.

If a mod does not seem to work right after installing, restart Claude Code.

From a shell, the same is:

```
claude plugin marketplace add mgryszko/claude-mods
claude plugin install voice-cleanup@claude-mods
claude plugin install turn-separator@claude-mods
```

## Update, disable, uninstall

```
claude plugin marketplace update claude-mods
claude plugin update voice-cleanup@claude-mods
claude plugin disable voice-cleanup@claude-mods
claude plugin uninstall voice-cleanup@claude-mods
```

`/plugin` inside Claude Code does the same from a menu.

## voice-cleanup

Voice transcription keeps fillers, stutters and repeated words, and non-native speakers also get the odd grammar slip.
The cleanup is done by a Claude Haiku model (the `haiku` alias), called separately from the model your session runs on.
It goes through your own Claude Code login, so no extra API key is needed.
When you submit a dictated prompt, the mod sends it to Haiku, which:

- removes fillers and hesitations (um, uh, er, hmm)
- removes repeated words, stutters and false starts
- fixes grammar, word order and articles
- keeps code, commands, file paths, identifiers, URLs and numbers as they are

A toast shows the cleaned text, and that text is what the model receives.
The prompt box keeps the raw dictation until you press Enter, since voice mode gives mods no event when dictation ends.

### What counts as dictated

Voice mode puts its transcript in the prompt box without going through the editor,
so the mod counts the text that appeared in the box between your edits,
and treats a prompt as dictated when that text outweighs what you typed.
Pasted text counts for neither side, so a prompt that mixes dictation and a paste is cleaned, whatever their order and sizes.
Haiku sees only the dictated part of such a prompt, and the pasted text reaches the model as you pasted it.
These prompts are left alone:

- typed or pasted prompts, and typed prompts with a paste
- slash commands and `!` shell commands
- prompts recalled with the up arrow or restored with rewind
- a suggestion accepted with Tab
- prompts sent by other plugins, notifications or other sessions

To recognise recalled prompts, the mod keeps your last 100 submitted prompts in its plugin store, a JSON file under `~/.claude`.

### Cost and failures

Each dictated prompt is one Haiku call on your account, adding about a second before the prompt is sent.
If Haiku fails or takes longer than 8 seconds, the original prompt goes through unchanged and a toast says why.

## turn-separator

Draws a dim line above each prompt you send, a blue bar beside your questions and a green bar beside Claude's answers.
The last message of each turn, Claude's recap of what it did, gets an amber bar instead of a green one, so it stands out from the steps before it.
Copying a selection in fullscreen mode leaves the bars out of the clipboard.

## Development

Run a mod from a working copy without installing it:

```
claude --plugin-dir /path/to/claude-mods
```

Check and test a mod:

```
claude plugin validate voice-cleanup
claude plugin test voice-cleanup
```

Bump `version` in the mod's `.claude-plugin/plugin.json` with each change, so installs see the update.
