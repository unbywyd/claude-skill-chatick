# claude-skill-chatick

A Claude Code skill for working inside [Chatick](https://chatick.com) — tasks,
checklists, statuses, comments, time tracking.

## Install

```bash
git clone https://github.com/unbywyd/claude-skill-chatick.git \
  ~/.claude/skills/chatick
node ~/.claude/skills/chatick/scripts/install.mjs
```

Then **restart Claude Code** and ask what is on your plate in Chatick.

The second command is what makes connecting painless. It installs the MCP
server in `mcp/` and registers it in `~/.claude.json`, so Claude gets a
`chatick_connect` tool instead of printing a code for you to copy every
session — and with the Chatick desktop app running, connecting is one button.

Skip it and the skill still works: Claude falls back to the device flow and
types out a code. Nothing breaks, it is just the long way round. Run the
installer whenever you like — it is safe to re-run, backs up `~/.claude.json`
before writing, and restores it if the write does not read back.

## Update

```bash
cd ~/.claude/skills/chatick && git pull
node scripts/install.mjs   # only if mcp/ changed
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
| `SKILL.md` | how to work: rules, connecting, the shape of a session |
| `reference/endpoints.md` | map of all 84 bridge endpoints with request bodies |
| `mcp/` | the MCP server: 19 tools, and the token storage behind them |
| `scripts/install.mjs` | installs the server's deps and registers it |

The reference is generated from the bridge source rather than written by hand.
Exact field semantics and a given person's permissions always live in
`GET /x/guide` on the server, which ships with the API.

## The rules that matter

- **No task, no work.** Task first, then `in_progress`, then code.
- **Side fixes get their own tasks**, so the trail shows what was actually done.
- **An estimate is mandatory** (`estimateMinutes`): without it nobody can plan a
  sprint or say what fits in a day, and the number never gets added later.
- **Tick checklist items as you go**, not in a batch at the end.
- **Every result goes in a task comment** — work closed without one reads as a
  task silently marked done.
- **Never stop someone's timer.** Not running: offer to start one. Running:
  leave it alone.
- **Explain tasks in your own words** instead of pasting the dashboard back.

## Language

The skill is written in English, but its triggers deliberately include Russian
phrases ("поставь задачу", "что на мне"). Chatick teams work in several
languages, and the skill has to be found regardless of which one the person is
typing in.
