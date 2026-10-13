# claude-skill-chatick

A Claude Code skill for working inside [Chatick](https://chatick.com) 2.0 —
tasks and the ball, handoffs, checklists, comments, time tracking, the work log.

## Install

```bash
git clone https://github.com/unbywyd/claude-skill-chatick.git \
  ~/.claude/skills/chatick
```

Then give Claude the tools. Two ways, pick one:

- **MCP by address — nothing to install.** Chatick serves the same tools at
  `https://api.chatick.com/mcp`:

  ```bash
  claude mcp add --scope user --transport http chatick https://api.chatick.com/mcp
  ```

  In a new session run `/mcp` → Authenticate, sign in to Chatick in the
  browser and choose what to share: one project, a whole company, or
  everything.

- **The local program in `mcp/`** — adds what needs your machine: connecting
  through the desktop app with one button, uploading and downloading files,
  opening links in your browser.

  ```bash
  node ~/.claude/skills/chatick/scripts/install.mjs
  ```

  It installs the server's deps and registers it in `~/.claude.json`, so Claude
  gets a `chatick_connect` tool instead of printing a code every session. It is
  safe to re-run, backs up `~/.claude.json` before writing, and restores it if
  the write does not read back.

Then **restart Claude Code** and ask what is on your plate in Chatick.

Skip both and the skill still works: Claude falls back to the device flow over
`curl` and types out a code. Nothing breaks, it is just the long way round.

## Update

```bash
cd ~/.claude/skills/chatick && git pull
node scripts/install.mjs   # only if you use the local program and mcp/ changed
```

Restart Claude Code afterwards: a running session holds the old copy of both
the skill and the MCP server.

Re-running the installer is harmless when nothing changed, so when in doubt,
run it. What you must not skip is the restart — without it you keep talking to
the version you started with, and the symptom is confusing: the files on disk
are new, the behaviour is old.

## What is inside

| File | What it is |
| --- | --- |
| `SKILL.md` | how to work: the ball, rules, connecting, the shape of a session |
| `reference/endpoints.md` | map of all 126 bridge endpoints with request bodies |
| `mcp/` | the local MCP server: 88 tools, and the token storage behind them |
| `scripts/install.mjs` | installs the server's deps and registers it |

`mcp/` is the build of `apps/mcp` in the Chatick repo (`pnpm --filter
@chatick/mcp build`, then `dist/{index,tools,bridge,auth}.js`). The same
`tools.js` runs the MCP served by address, minus the six tools that need your
machine.

The reference is taken from the bridge source rather than written from memory.
Exact field semantics and a given person's permissions always live in
`GET /x/guide` on the server, which ships with the API.

## The rules that matter

- **No task, no work.** Task first, the ball with you, then code.
- **Hand over with a note.** Done means `review` to the owner with what to
  check — never closing your own work. Accepting and cancelling are the
  owner's call.
- **A question is a move.** `ask` gives the ball to whoever must answer;
  `answer` gives it back. A comment does not move the ball.
- **Side fixes get their own tasks**, so the trail shows what was actually done.
- **An estimate is mandatory** (`estimateMinutes`): without it nobody can say
  what fits in a day, and the number never gets added later.
- **Tick checklist items as you go**, not in a batch at the end.
- **Every result goes in a task comment** — work handed over without one reads
  as a task silently passed along.
- **Never stop someone's timer.** Not running: offer to start one. Running:
  leave it alone.
- **Explain tasks in your own words** instead of pasting the lists back.

## Language

The skill is written in English, but its triggers deliberately include Russian
phrases ("поставь задачу", "что на мне", "отправь на проверку"). Chatick teams
work in several languages, and the skill has to be found regardless of which
one the person is typing in.
