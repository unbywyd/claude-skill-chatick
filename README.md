# claude-skill-chatick

A Claude Code skill for working inside [Chatick](https://chatick.com) — tasks,
checklists, statuses, comments, time tracking.

## Install

```bash
git clone https://github.com/unbywyd/claude-skill-chatick.git \
  ~/.claude/skills/chatick
```

The skill is picked up automatically. To check it works, ask Claude what is on
your plate in Chatick.

## What is inside

| File | What it is |
| --- | --- |
| `SKILL.md` | how to work: rules, connecting, the shape of a session |
| `reference/endpoints.md` | map of all 84 bridge endpoints with request bodies |

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
