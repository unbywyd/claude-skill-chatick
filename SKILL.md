---
name: chatick
description: Work inside a Chatick project — read and create tasks, assign them with an estimate, move them through statuses, tick their checklists, report every result in task comments, and keep the work log so the next session knows where this one stopped and what was agreed. Use when the human asks you to take work from Chatick or put work into it, when you are about to start work that belongs in a project, when picking work back up after a break, when a task number like TASK-81 appears, or when they say "поставь задачу", "что на мне", "возьми в работу", "отпишись в задаче", "смени статус", "продолжаем", "на чём остановились".
when_to_use: Triggers include Chatick, чатик, TASK-<number>, "поставь задачу", "создай задачу", "что мне делать", "что на мне", "возьми в работу", "отпишись в комментарии", "смени статус", "оцени время", "запусти таймер", api.chatick.com, /x/tasks, bridge token, device flow. ALSO on picking work back up or closing a piece of it: "продолжаем", "продолжим", "на чём остановились", "что вчера делали", "где мы остановились", "что было сделано", "запиши что сделали", "зафиксируй", work log, журнал работы.
---

# Working in Chatick

Chatick is where a team's work lives: projects, tasks, chat, files, time. You
connect through the **bridge** — an HTTP API at `https://api.chatick.com/x/...`
built for assistants, not a scrape of the web app.

You are a **participant**, not a robot posting into a void. Everything you write
is read by people who will act on it, and everything you change lands in their
notifications.

---

## 0. No work without a task — this is the rule the rest hangs on

**Before you touch anything, there must be a task, and it must be yours.**
Either the human points you at one, or you create it. Then you move it to
`in_progress` and only then start.

Work done outside a task is invisible: it does not show up on the board, nobody
can plan around it, and in three weeks nobody can tell why the code looks like
that. "I'll just fix it quickly, no need for a task" is how a project
loses its own history.

**Extra fixes found along the way get their own tasks.** You came to fix the
login button and noticed the timer is broken too — that is a second task, not a
silent extra commit. Create it, estimate it, and either do it (moving it
through its own statuses) or leave it in `todo` for someone. One task, one
piece of work, one trail:

- someone reading the board sees what was actually done, not one vague task
  hiding five changes;
- the estimate on the first task stays honest;
- the second fix can be assigned to someone else, or rejected, without
  unpicking your commit.

If the extra work is genuinely inseparable — the same edit, the same file, the
same minute — put it in the original task's **checklist** and say so in a
comment. Anything larger is its own task.

---

## 1. The guide on the server is the source of truth — read it every session

```bash
curl -s https://api.chatick.com/x/guide -H "authorization: Bearer $TOKEN"
```

This file teaches **how to behave**. The server's guide lists **what exists**:
every endpoint, every field, and the exact permissions of the person you act
for. It ships with the API, so it is never out of date — this file, and any
endpoint list you remember, can be.

Read it after connecting, before your first real call. When the two disagree,
the server wins.

**Offline map:** [`reference/endpoints.md`](reference/endpoints.md) lists all 85
endpoints with their request bodies, generated from the bridge source. Use it to
answer "is there an endpoint for this" without a network call — but for exact
field semantics and this person's permissions, still read the server's guide.

---

## 1.5. Write in the project's language — always

**Every word that lands in Chatick is written in the language of the project:**
task titles and descriptions, comments, checklist items, chat messages, notes,
documents, release stage comments. No exceptions.

Take it from the data, never from a guess:

```bash
curl -s https://api.chatick.com/x/projects -H "authorization: Bearer $TOKEN"
# each project carries "language": "he" | "ru" | "en" | ...
```

`GET /x/context` reports it too, for the project you are scoped to — along
with the team and the chat rules.

**The trap:** the human talks to you in one language and their project runs in
another. A manager writes to you in Russian about a Hebrew project — the task
still goes in Hebrew, because it will be read by the team, not by them. Your
reply *to the human* stays in their language; what you *write into Chatick*
follows the project. Two audiences, two languages, in the same turn.

**Why it matters more than it looks.** A task in the wrong language is not a
cosmetic flaw — it is work handed to someone who must translate it before they
can start, and who cannot be sure the translation says what you meant. In an
RTL project a Russian description also breaks the layout of every card it
appears in.

If `language` is missing or you genuinely cannot tell, match the existing tasks
you can read, and say in your reply which language you chose and why. Do not
fall back to English because it feels neutral — it is neutral to you, not to
the team.

---

## 2. Connect — device flow, no secrets in chat

**Check for the tool before you print a code. Do not skip this.**

Look at your own tool list for a tool named `chatick_connect`. That is the
whole check — one look, no command to run, no file to read. It is reliable
because MCP tools are either in your list or they are not.

- **`chatick_connect` is in your list** → call it. Nothing else. It handles the
  desktop app and the code flow by itself, and when the app is running the
  human just presses a button. Do not read the rest of this section.
- **It is not in your list** → the server is not configured in this session.
  Use the curl flow below, and say so in one line: "The Chatick MCP server is
  not set up here, so I will connect with a code." Offer the one-time fix only
  if they ask — `claude mcp add --scope user chatick -- node <path>/apps/mcp/dist/index.js`
  in an interactive session — and do not stall waiting for them to do it.

Never announce that you are "connecting through MCP" before confirming the tool
exists, and never ask the human whether MCP is available: they cannot see your
tool list, and you can.

### Check once per session that this skill is current

**Do this after connecting, before the first real call** — not only when asked.
The skill is a git clone, and the product moves faster than your copy of it.
A stale skill is worse than no skill: it states endpoints and rules with full
confidence, and you follow them into behaviour that was corrected weeks ago.

```bash
cd ~/.claude/skills/chatick && git fetch --quiet && git status -sb | head -1
```

- A bare `## <branch>...origin/<branch>` → you are current. Say nothing, carry
  on. (The branch name varies; read the brackets, not the name.)
- `[behind N]` → tell the human in one line that the skill is N commits behind
  and offer to pull. Do not pull unattended: it rewrites files in their home
  directory, and the change only takes effect after a restart they must choose
  to make.
- The command fails (no network, no remote, not a clone) → carry on silently.
  A missing update check must never block the actual work.

When they say yes:

```bash
cd ~/.claude/skills/chatick && git pull
node scripts/install.mjs   # only if mcp/ changed; harmless otherwise
```

Then tell them to restart Claude Code, and say why: you are running the copy
loaded at startup, so until they restart, the files on disk are new and your
behaviour is old. **Do not claim the update took effect in this session** — it
did not, and you cannot verify it from inside. For the rest of this session
keep following the old rules, since those are the ones you actually loaded.

**The server's guide always outranks this file** (§1). If `GET /x/guide`
disagrees with anything here, the guide is right and this skill is the stale
one — that is a signal worth mentioning to the human.

The steps below are for the second case only — by hand, over curl.

```bash
# 1. ask for a code
curl -s -X POST https://api.chatick.com/x/device \
  -H 'content-type: application/json' -d '{"client":"Claude Code"}'
# -> { userCode, deviceCode, verifyUrl, expiresInSec }
```

Tell the human **verbatim**: open `{verifyUrl}`, enter `{userCode}`. Never print
`deviceCode` — that one is yours.

```bash
# 2. poll every 3s, up to ~10 min
curl -s -X POST https://api.chatick.com/x/device/poll \
  -H 'content-type: application/json' -d '{"deviceCode":"..."}'
# pending → keep going | denied → stop, tell them | expired → start over
# approved → { token: "ck_...", user, project }
```

Keep the token **in memory for this session only**. Never write it to a file,
never echo it back, never commit it.

(The MCP server does keep a token on disk, in `~/.chatick/mcp-token.json`. That
is its own deliberate trade — a file the human owns, so they are not asked for a
code every session. It is not licence to write tokens anywhere yourself: when
you are running the flow above by hand, the token stays in memory.)

**Check the clock before multi-step work.** Every response carries
`x-tunnel-expires-in`. The tunnel dies after 24h, 12h idle, or when closed. A
task created and its checklist rejected with 401 is *worse* than not starting:
the human is left with a stub they have to clean up. If time looks short,
reconnect first.

A 401 mid-session means the tunnel closed. Start over from step 1 — do not
retry the call.

### Offer to stop the permission prompts — once, on the first call

`api.chatick.com` is an unfamiliar host, so the first `curl` asks the human to
approve it, and so does the next one. A session doing real work makes dozens of
calls; approving each is noise that teaches them to click "allow" without
reading, which is worse than the prompt itself.

**The first time a call is approved, offer this** — never add it silently, it is
their settings file:

```jsonc
// ~/.claude/settings.json for every project,
// or .claude/settings.json for this one only
{
  "permissions": {
    "allow": ["Bash(curl * https://api.chatick.com/*)"]
  }
}
```

Say exactly what it covers: every bridge call to this one host, and nothing
else. If they would rather approve each call, that is a valid answer — ask once
and drop it.

---

## 3. Two shapes of token — know which one you hold

The approval reply tells you. It matters for every single call:

| Scope | What it means | Every request |
| --- | --- | --- |
| **Project** | one project | `?project=` not needed |
| **Company** | all projects the person can see | `?project=<id>` **required** |

On a company token, omitting `?project=` is the most common way to fail. Get the
list with `GET /x/projects`.

---

## 4. Creating a task — four things, not one

A task with only a title is a note to nobody. Before `POST /x/tasks`, settle
all four:

**Which project.** On a company token this is a decision, not a default. Ask if
it is not obvious; the wrong project hides the task from the people who needed
it.

**What language.** The project's, not yours — see §1.5. It is the rule broken
most often, because the language you are being *spoken to in* is not
necessarily the language the project is *written in*.

**Who does it.** `"assignee"` takes a userId, or `"me"`. Take real ids from
`GET /x/members` — never invent one. An unassigned task belongs to nobody and
is read by nobody: assign it, or say out loud that you are leaving it
unassigned and why.

**How long it takes.** `"estimateMinutes"` — an integer. **Do not skip it.**
Without it nobody can plan a sprint or say what fits in a day, and the number
never gets added later. Estimate from the work you just did or are proposing; a
rough number beats none. If you truly cannot guess, say so in the description
rather than leaving the field silently empty.

```bash
curl -s -X POST "https://api.chatick.com/x/tasks?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{
    "title": "Sign-in button promises Google but opens our own screen",
    "description": "The button reads Sign in with Google, but it leads to...",
    "assignee": "<userId>",
    "estimateMinutes": 90,
    "priority": "high"
  }'
```

The reply carries the **number** (`TASK-81`). Use numbers everywhere a task
appears in a path — that is what the human says out loud, and it survives you
losing whatever id map you kept.

**Give the human a link from the reply — never one you assembled.** Every task
in a response carries a ready `url`. The address format has changed once
already, and a guessed `/#/p/<id>` looks plausible while opening a blank
screen: the route does not exist, the router renders nothing, and the person
concludes the product is broken.

Replies about **one** task (`GET`/`POST`/`PATCH` of a single task) also carry
`shortUrl` — `chatick.com/t-AbC12`. **Prefer it when writing to a person.**
`url` is ninety characters with two ids and a `#`: it wraps across lines in
chat, and because it contains no spaces it is one unbreakable word — it
stretched notification cards to eight lines and broke the layout of the feed.
Both open the same task, and neither grants access: rights are checked on
arrival, exactly as with the long address.

Lists leave `shortUrl` out — a short link is a row in a table, and fifty of
them per listing would be written for nothing. Fetch the single task when you
actually need one.

### Splitting one task into several — link them, in the same call

This is your most common move: a client leaves ten remarks in a single task,
you turn them into five. Do it without linking and the connection lives only
in your head — a week later nobody opening any of the five can tell where it
came from, or that four siblings exist.

Pass `"links"` when you create each one:

```bash
-d '{
  "title": "Fix the Safari sign-in",
  "estimateMinutes": 60,
  "links": ["TASK-3"]
}'
```

`["TASK-3"]` means *this task grew out of TASK-3* — `kind` defaults to
`derived`. For a sibling rather than a source, say so:
`[{"task":"TASK-9","kind":"related"}]`.

Do it **in the create call**, not afterwards. A second pass is the one you
forget on the fifth task, and a half-linked set is worse than none: it reads
as though the unlinked ones came from somewhere else.

**Links are not blockers.** A blocker says *not yet* and holds work back; a
link says *look here too* and holds nothing. Never reach for `/blockers` to
express "these belong together" — the lock would tell everyone the work is
waiting when it is not, and once a lock has lied nobody trusts the next one.

A number that does not resolve is skipped rather than failing the call, and
the reply lists what actually got linked. Check it: silence there means the
link you thought you made does not exist.

---

## 5. Checklist — if the task has steps, they must be visible

A checklist is the task broken into steps. **If the task has one, use it. If
the work has clear steps and no checklist exists, create one.**

It is a **sub-resource, not a field**: create the task first. Sending
`"checklist"` inside `POST /x/tasks` is rejected with 400.

```bash
# create the items
curl -s -X POST "https://api.chatick.com/x/tasks/TASK-81/checklist?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"items":["Find the cause","Fix it","Verify on a device"]}'

# tick one as you finish it — not all at the end
curl -s -X PATCH "https://api.chatick.com/x/tasks/TASK-81/checklist/<itemId>?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"done":true}'
```

**Tick each item when it is actually done**, not in a batch at the end. A
checklist ticked all at once carries no information — the point is that anyone
looking mid-way can see where the work stands. Ticking is manual and
reversible; if something turns out not to be done, untick it.

Use `"note"` on an item when the outcome needs a word ("does not reproduce on
Android 14"). Nothing happens automatically when every item is ticked — closing
the task is still your decision, and still gets a comment.

**A checklist item is often a question, and the answer lives in its note.**
"Which key do we sign with?" is a checklist item; the reply comes back under
it, not in the comments. So read the checklist before assuming a task is
untouched:

```bash
# the items WITH the answers written under them
curl -s "https://api.chatick.com/x/tasks/TASK-81/checklist?project=$P"   -H "authorization: Bearer $TOKEN"
```

`GET /x/tasks/<id>` reports the counts — `checklist: {total, done, answered}`.
`answered` above `done` means questions were answered while the boxes stayed
open. That is a task waiting on **you**, not on them: ten answers once sat in a
task and surfaced nowhere, and the person who wrote them had to add a separate
comment saying "I answered in the items". Notifications now go out for those
answers, and they show up in `GET /x/inbox` as the `answers` branch — but the
answers themselves are only here.

---

## 6. Statuses — move the task as the work moves

`todo` → `in_progress` → `review` → `verified` → `done`

```bash
curl -s -X PATCH "https://api.chatick.com/x/tasks/TASK-81?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"status":"in_progress"}'
```

- **Take it before you work.** Move to `in_progress` when you start, not when
  you finish. A task sitting in `todo` while you edit its files means someone
  else may pick it up and do the same work twice.
- **Finish into `review`, never into `done`.** When the work is ready, hand it
  over: `review` means a human must look — a merge, a deploy, a decision you
  are not entitled to make. Closing your own work skips the person whose job
  is to check it, and that is exactly what the ladder exists to prevent.
- **`verified` belongs to whoever checked.** Never set it on your own work: you
  cannot confirm your own output. If tests failed or you could not check
  something, say so in a comment and leave the task in `review`.
- **`done` comes after the check**, not instead of it.
- **Never change status silently.** Every move gets a comment. The board tells
  people *that* something moved; only the comment tells them *what*.

Many tasks at once: `PATCH /x/tasks/bulk` with up to 100 numbers — one call
instead of thirty.

---

## 7. Comments — every result is reported here, always

**Finishing the work is not finishing the job.** A task you completed without a
closing comment reads, to everyone else, as a task that was silently marked
done. Write the comment *before* you consider yourself finished.

```bash
curl -s -X POST "https://api.chatick.com/x/tasks/TASK-81/comments?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"text":"Done. Verified on the emulator..."}'
```

What goes in comments — **everything**: what you did, what you found, what you
changed your mind about, what you could not do, and every extra task you spun
off. Not in the chat, not only in your reply to the human. The task is what
somebody opens in three weeks asking "why was this done this way".

- **Read the thread before acting.** The description says what was asked; the
  comments say what was decided since.
- **Reply to a specific comment** with `"replyTo": "<commentId>"` — without it
  the thread reads as a flat list and nobody can tell what you answered.
- **Mention with `@[Name](<userId>)`** — only that exact markup notifies. A
  plain `@name` is just text. The author, the assignee and the person you
  replied to are notified anyway; do not mention them for that alone.
  The same markup works in a task **description** and notifies the same way, so
  you can pull someone in as you create the task instead of commenting right
  after. Ids come from `GET /x/members`.
- **Attach evidence.** `POST /x/files` first, then `"attachmentIds"` (up to
  10). A screenshot of the failure often IS the answer.

A closing comment says: what you did, what you verified it with, and what is
still open. "Done" is not a report.

**In the project's language** (§1.5). The comment is read by the team, not by
the person who happens to be talking to you right now — and they are often not
the same people, nor the same language.

**Report what actually happened.** If the tests fail, say so with the output.
If you did part of the work, say which part. If you spun off a second task,
name its number. A comment claiming success on work you did not verify costs
more than saying it plainly.

---

## 8. Time — check whether the human's timer is running

**At the start of real work, look:**

```bash
curl -s https://api.chatick.com/x/time/running -H "authorization: Bearer $TOKEN"
```

- **Nothing running → offer to start one.** Say what you are about to work on
  and offer a general timer for it. Their hours are how the work gets counted;
  a day of work with no entry is a day that did not happen as far as any report
  is concerned.
- **Something already running → leave it alone.** Do not stop it, do not
  restart it, do not "fix" it. It may be running for something else entirely.
- **Never stop a timer on your own.** Stopping is the human's decision and
  theirs alone — you can mention that it is still running, and that is all.

The limit counts the **person across all projects**: a timer forgotten in
another project blocks a new start here, and the 409 names that project. Say
which one rather than reporting a mysterious refusal.

Pausing IS stopping — a break must not land in the hours; `/x/time/resume`
carries on with the same description and task.

---

### Fixing time after the fact

The tracker only stays useful if wrong entries get corrected, and they will be
wrong: the timer ran on the wrong project, was never started, or was started an
hour late. You can fix all of it.

```
chatick_time_list(project, from="2026-08-01")     # find the entry id
chatick_time_update(project, entryId, moveToProject="<other project id>")
chatick_time_update(project, entryId, startedAt="2026-08-19T09:00:00Z")
chatick_time_log(project, startedAt=..., endedAt=..., description="...")
chatick_timer_stop(project)                        # even one left in another project
chatick_time_report(project, from=..., to=...)
```

**Moving between projects** is the case worth remembering: someone worked on
one thing while the timer ran on another and noticed at the end of the day.
Without the move they either lose the hours or retype them by hand, and most
people simply shrug — after which the tracker no longer matches reality. The
move drops the entry's task link, because that task stays in the project you
are leaving.

**Never invent hours.** Log what the person told you and nothing more. Made-up
time is worse than missing time: somebody bills by it, and the error is quiet —
wrong hours look exactly like right ones.

Someone else's entry needs `tasks.edit`; your own is always yours to fix.

## 9. Telling the human what is on their plate

**Explain tasks in your own words. Never paste the dashboard back at them.**

They have already seen the board. Copying titles, ids, statuses, priorities and
full descriptions into chat is a wall of text they have to re-read — and it is
work you did not do for them.

```bash
# short shape first: number, title, status, priority, assignee
curl -s "https://api.chatick.com/x/tasks?assignee=me&status=todo&fields=brief" \
  -H "authorization: Bearer $TOKEN"
```

**Start brief, go deep only where asked.** For "what is on my plate", give a
couple of lines per task:

> **TASK-81** — the sign-in button promises Google but opens our own screen.
> Needs renaming and a check in both languages. An hour or so.
>
> **TASK-84** — the Android build fails after the Expo upgrade. Assigned to me,
> but blocked by TASK-83, which Ilya is working on.

Not:

> TASK-81 | Sign-in button promises Google but opens our own screen | status:
> todo | priority: high | assignee: … | description: The button reads Sign in
> with Google, but…

Then say which one you would take first, and why. `GET /x/inbox` already gives
you `whatIsAsked` — one AI-written sentence per item — so use it as the basis
of your summary instead of re-reading everything from scratch.

Dump the full text of a task only when they ask for it, or when a detail
actually changes what they should do.

**Look at the files before you summarise.** A task with a screenshot attached
usually *is* the screenshot — the description is a caption. Fetch it and look:

```bash
curl -s "https://api.chatick.com/x/files/<id>/content" \
  -H "authorization: Bearer $TOKEN" -o /tmp/shot.png
```

Read images, logs and short documents when the situation allows. Skip it when
the file is huge, binary or plainly irrelevant — and say that you skipped it.
"I did not open the attachment" is fine; summarising a bug from its title while
ignoring the screenshot of it is not.

---

## 9.5. People — titles are company-wide, roles are not

**A job title belongs to the company, not to a project.** Someone is a backend
developer here and there; setting it per project means ten places to keep in
sync and nine where it will drift.

```bash
# who is in the company, with their company role and title
curl -s "https://api.chatick.com/x/company/members?project=$P"   -H "authorization: Bearer $TOKEN"

# "make Tal CEO, Hadeel QA" — this is the call for it
curl -s -X PATCH "https://api.chatick.com/x/company/members/<userId>?project=$P"   -H "authorization: Bearer $TOKEN" -H 'content-type: application/json'   -d '{"jobTitle":"QA engineer"}'
```

Every project inherits that title unless the project sets its own. Use the
project-level one (`chatick_member_role`) only when the answer really is
different there — "here they also run releases".

**Roles are a different weight, and the difference matters.**

| What | What it does |
|---|---|
| Job title | describes. Wrong one costs a wrong hint |
| Project role | admin/member inside one project |
| Company role | **manager and admin see EVERY project of the company** |

That last row is why a company role is not a title. It grants access to
projects the person was never added to — including ones nobody meant to show
them. Set titles freely; **ask the human before raising anyone to manager or
admin**, and say plainly what it opens.

Changing company roles and titles requires being a company admin. The last
admin cannot be demoted — otherwise the company is left with no one who can
hand rights back.

---

## 9.7. The knowledge base — look here before debugging

Solutions, gotchas, requirements the team already learned. It belongs to the
**company**, not to a project: an answer about Cardcom is needed by everyone
who meets Cardcom, not only by whoever hit it first.

**Search understands MEANING.** "payment fails" finds "Cardcom rejects foreign
cards" with no shared word, and it works the same in Hebrew. Ask in your own
words — do not try to guess the exact wording someone used.

```bash
# before you start digging into something unfamiliar
# searches the WHOLE COMPANY by default — an answer from a neighbouring
# project is exactly the point; ?scope=project narrows to this one
curl -s "https://api.chatick.com/x/notes?project=$P&q=не проходит оплата"   -H "authorization: Bearer $TOKEN"
```

Entries marked `matchedBy="meaning"` were found that way — they may share no
word with your query, and that is the point.

**Write what you learned.** A fix that lives only in a chat is lost the moment
it ends.

| Type | When |
|---|---|
| `solution` | a problem **and** its fix — the reusable kind, the most valuable |
| `bug` | broken, not yet fixed |
| `requirement` | a rule to follow |
| `attention` | a trap the next person will step into |
| `decision` | we chose this over that, and why |
| `business` | a company rule: VAT 18%, prices in shekels |
| `note` | anything else |

Tags matter: they narrow a search that meaning alone cannot — `cardcom`,
`sms`, `ios`.

**Write the body in markdown** — headings, lists, bold, code fences, links,
tables. It is converted server-side, and a single newline stays a line break.

**Do not send HTML, and never escape it.** Write `## Heading`, not
`<h2>Heading</h2>`, and least of all `&lt;h2&gt;Heading&lt;/h2&gt;`.
Hand-written HTML is exactly what went wrong: five knowledge-base entries
arrived escaped, and every reader — the editor included — showed the raw tags
as text. Markdown cannot fail that way, because there is nothing to escape. The
write returns 201 either way, so nothing warns you.

The project is an optional **origin mark**, not a boundary: it says where this
came up, and it does not hide the entry from anyone else in the company.

**Access is simple**: you are in the company, so you read and write. You edit
and delete your own entries; someone else's is for a company admin. There are
no per-project note permissions — that idea was removed, not forgotten.

---

## 9.8. "Where was that task?" — search by what it was about

Someone works across a dozen projects and remembers the conversation, not the
project. `chatick_tasks` lists one project; this searches **all of them**:

```bash
curl -s "https://api.chatick.com/x/search/tasks?q=оплата не проходит"   -H "authorization: Bearer $TOKEN"
```

**Comments are indexed together with their task.** "Where did we discuss X",
"which task was that in", "I wrote about it somewhere" land on the task that
holds the discussion — that is what this is for, and why a search over titles
alone would not answer it.

By meaning, not by words: a Russian query finds a Hebrew task with no shared
word. Items carrying `matchedBy="meaning"` were found that way.

Two searches, not one, and the difference matters: **tasks are recalled,
knowledge is looked up**. Ask `/x/search/tasks` when the project is what you
are trying to remember; ask `/x/notes` when you want the answer itself,
whoever wrote it and whenever.

### "Why was this returned to me?" — read the task's history

```bash
curl -s "https://api.chatick.com/x/tasks/TASK-24/history?project=$P" \
  -H "authorization: Bearer $TOKEN"
```

Who created the task, who assigned it, who moved its status, and when. The task
object itself does not say — it carries `createdById` and `createdAt`, but not
what happened after.

**Ask before answering, and do not fill the gap with a guess.** This is not
hypothetical: a person asked exactly this, the history was unreachable, and the
answer given was "nobody returned it, it was always yours". It was wrong — the
PM had returned it in a comment. A confident wrong answer costs more than "let
me check".

Milestones only: reordering in the list and description edits are left out, or
the real steps drown in them. Older entries name the field that changed but not
its new value — say what changed, do not invent what it became.

---

## 9.9. The work log — the only memory that survives this conversation

**Read it when you start. Write to it every time something is finished.**

This is not bookkeeping. When this conversation ends, everything in it is gone:
what you tried, what failed, what the human corrected, what you agreed to do
differently. The next session — yours or someone else's — starts blind and asks
the human to repeat themselves. The work log is the only place that survives.

```bash
# starting: where did this person leave off
curl -s "https://api.chatick.com/x/worklog?project=$P"   -H "authorization: Bearer $TOKEN"
```

The reply opens with **`latestOwn`** — their most recent entry, their open draft
if they have one. Read it before you ask them anything.

### When to write

**Every time a piece of work is finished** — not "at the end of the session".
A session has no end: the conversation just continues, and "later" never
arrives. A finished piece does have a moment, and that moment is your cue:

- committed, pushed, or deployed;
- a decision was made — *especially* one that reverses a plan;
- the human corrected your direction;
- something turned out not to work, and you moved another way;
- a question was answered that you would otherwise ask again tomorrow.

One open draft per person per project: `POST` while one exists returns 409 with
its id, and you extend that draft (`PATCH /x/worklog/<id>`) instead of starting
a second. So over a working day the entry GROWS — append each finished piece to
it as it lands.

```bash
curl -s -X POST https://api.chatick.com/x/worklog   -H "authorization: Bearer $TOKEN" -H 'content-type: application/json'   -d '{"body":"<p>Вебхук готов, ретраи падают на 429 — дальше идемпотентный ключ.</p>"}'
```

It saves as a **draft**: only that person can see it, not even project admins.
Nothing to be careful about — write the messy state, that is what it is for.
`POST /x/worklog/<id>/publish` makes it project history, one-way.

### What to write

Two things, and the second is the one that gets lost:

**State.** What changed, what is half-done, what is next.

**Decisions — what was agreed and WHY.** "Период не привязываем к просрочке: у
неё нет прошлого". "Черновики в вектор не идут — иначе чужой ассистент
процитирует". This is the part no commit and no task carries. Six weeks later
somebody undoes the decision because the reason was never written down.

**Facts and movement. No water.** Write what happened and what it means going
forward — not a retelling of the conversation, not a summary of the code you
just wrote, not a restatement of what the task already says.

```
Хорошо:
  Полоса активности теперь от первого дня компании, не жёсткие 90:
  на 90 две трети клеток были пустыми, читалось как «не работал».
  Порядок проектов учитывает просрочку+блокеры. Дальше: удалить ветку?

Плохо:
  Сегодня мы много работали над обзором компании. Я внёс ряд правок в
  OverviewTab.tsx, добавил компонент PeopleStats и обновил переводы...
```

The test: would this help someone who has never seen this conversation? If a
line only makes sense to whoever was in the room, it is water — cut it.

Attach `taskId` when the entry is about a single task; leave it off when it is
not — "утро ушло на стейджинг" belongs to no task.

**This is not the knowledge base** (§9.7). A note is knowledge that outlives the
month ("Cardcom не берёт иностранные карты"); a log entry is the state and the
reasoning of work in progress. Notes are looked up years later; log entries are
read tomorrow.

**Never quote someone else's draft into the chat**, including inside a summary.
Drafts are private by design — that privacy is the only reason anything honest
gets written in them.

---

## 10. Resources and secrets

A resource is a link plus, optionally, secrets under it: a staging URL and the
key that opens it, a database and its connection string.

**Link them to the task, never paste them into it.** A password written into a
description or a comment is readable by everyone who can see the task, stays in
the history, and cannot be taken back. A linked resource keeps deciding for
itself who may open it.

```bash
# 1. create the resource, name who needs its secrets
curl -s -X POST "https://api.chatick.com/x/resources?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Staging DB","url":"https://...","secrets":[{"label":"Password","value":"..."}],
       "viewers":["<userId>"]}'

# 2. attach it to the task — same request that creates or edits the task
curl -s -X PATCH "https://api.chatick.com/x/tasks/TASK-81?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"resourceIds":["<resourceId>"]}'
```

**A resource you create is shared with nobody but you.** This is the opposite
of the app, where a person sees the team pre-filled and removes whoever should
not be there. You are sending the request blind, so the default is the safe
one — and it means the human you made it for **cannot open it** until you name
them in `"viewers"`. Ids come from `GET /x/members`.

**Say who you gave it to.** In the closing comment, name them: the task does
not show it, and "готово, креды в ресурсах" reads as "everyone can see them".

**Only the author changes the audience.** If someone else needs access to a
resource you did not create, say so and let its author do it.

**Check the person can see resources at all.** Two gates guard a secret, and
the first is older than your list. `GET /x/members` reports each person's
level:

| `resources` | What it means for a viewer |
| --- | --- |
| `none` | never reaches the card — sharing changes **nothing** |
| `read` | can open the resource and reveal what is shared with them |
| `write` | can also create and edit resources |

Listing someone with `none` is not refused, it is simply useless: you would
report access as granted and they would still see nothing. If they need it and
you own or administer the project, raise it first and say that you did:

```bash
curl -s -X PATCH "https://api.chatick.com/x/members/<userId>?project=$P"   -H "authorization: Bearer $TOKEN" -H 'content-type: application/json'   -d '{"permissions":{"resources":"read"}}'
```

If you do not manage the team, do not quietly skip them — name who is missing
access and who can grant it.

**Do not go hunting for secrets to save.** Write down what the human handed you
for that purpose. Never values you happened to read in a `.env`, a log, a
config or an earlier message — the fact that you saw a password is not a reason
to store it, and "заодно сохранил в ресурсы" is a decision that was not yours
to make.

---

### Giving a task the access it needs

A task almost always needs something: a staging URL, a key, a database. Link
the resource to the task — never paste the address and password into the
description. Text in a description is readable by everyone who can see the
task, it cannot be taken back, and it outlives whatever reason you had.

```bash
# what this task already needs
curl -s "https://api.chatick.com/x/tasks/TASK-81/resources?project=$P" \
  -H "authorization: Bearer $TOKEN"

# give it one more (ids from /x/resources)
curl -s -X POST "https://api.chatick.com/x/tasks/TASK-81/resources?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"resources":["<resourceId>"]}'

# take one away — the resource itself stays in the project
curl -s -X DELETE "https://api.chatick.com/x/tasks/TASK-81/resources/<resourceId>?project=$P" \
  -H "authorization: Bearer $TOKEN"
```

Prefer these over the `"resourceIds"` field in `PATCH /x/tasks/<id>`. That
field **replaces the whole list**: send one id and you silently wipe links
somebody else made, and nobody finds out until the access is needed.

None of these return secret **values** — only that the access exists and what
it is called. That is deliberate: a password fetched here would sit in your
context and in the chat history, where it survives the conversation and cannot
be revoked. Read a value only when you actually need to use it, and never
repeat it back into a message, a task or a comment.

### Secrets that are not text

A keystore, a certificate, a private key — these live as **files under the
resource**, not in project files. Encrypted at rest, visible only to the
people who may see that resource's secrets.

```bash
# what is kept under it
curl -s "https://api.chatick.com/x/resources/<id>/files?project=$P" \
  -H "authorization: Bearer $TOKEN"

# download one — binary, and the download is audited
curl -s "https://api.chatick.com/x/resources/<id>/files/<fileId>?project=$P" \
  -H "authorization: Bearer $TOKEN" -o main.jks
```

The list gives names and sizes, never contents.

**You can upload it yourself.** With MCP that is one call:

```
chatick_upload(project, path="/abs/path/main.jks", resourceId="<id>")
```

It reads the file, builds the multipart body and supplies the token — there is
no curl to assemble and no token to fetch. Without `resourceId` the file goes
to project files instead, where the whole team sees it: right for a build, a
screenshot or a log, wrong for anything that unlocks something.

By curl it is the same endpoint:

```bash
curl -X POST "https://api.chatick.com/x/resources/<id>/files?project=$P" \
  -H "authorization: Bearer $TOKEN" -F "file=@./main.jks"
```

Do not ask the human to attach it by hand.

That reason is worth stating plainly, because it is the whole point: an
Android signing key cannot be reissued for an app that is already published.
Lose the file and updates stop forever. A resource holding only the password
is a false sense of safety — the password unlocks something that still has to
exist somewhere.

### Fixing a resource instead of duplicating it

`PATCH /x/resources/<id>` changes name, address, description or viewers. Only
the fields you pass. Reach for it before creating a second resource with the
correction: a duplicate means the secrets get typed in again by hand, every
task linked to the old one keeps pointing at it, and somebody has to clean up
the leftover.

Descriptions render as markdown, the same as task descriptions and comments.

## 11. Documents — check what you wrote actually landed

Long-lived project text lives in documents: specs, decisions, notes that
outgrew a comment.

```bash
# create or replace
curl -s -X PATCH "https://api.chatick.com/x/documents/<id>?project=$P"   -H "authorization: Bearer $TOKEN" -H 'content-type: application/json'   -d '{"content":"<p>...</p>"}'

# add to the end — safe for long documents
curl -s -X POST "https://api.chatick.com/x/documents/<id>/append?project=$P"   -H "authorization: Bearer $TOKEN" -H 'content-type: application/json'   -d '{"content":"<p>...</p>"}'
```

**Every write answers with `totalChars` — the length AFTER it. Compare it with
what you sent.** A reply of `{id, title}` alone looks like success whatever
happened; reporting a saved document that still holds the old text is worse
than reporting a failure, because nobody goes looking.

**Append rather than replace when adding.** PATCH rewrites the whole document:
send a short body by accident and the rest is gone. Versions exist and a human
can restore, but the mistake is silent until someone opens the page.

---

## 12. When a call is refused, read what it actually says

A rejected request usually names its own cause. Two that mislead if you skim:

**`Invalid JSON`** means the body never parsed — the field it complains about
was never there. Look at the reply's `hint`: it shows the fragment around the
break. A stray backslash is the usual culprit; in JSON a literal `\` must be
written `\`, and text in Hebrew or Russian hits this often.

**`Nothing to update`** means every field you sent was ignored, not that the
task is unchanged. Check the field names against `GET /x/guide` — a typo is
dropped silently, not guessed.

---

## 13. What not to do

- **Never delete a project.** Not through the bridge, not by asking. Deletion
  takes everything with it and cannot be undone; it is a human's decision made
  in the app.
- **Deleting anything else** — tasks, files, messages — is for cleaning up your
  own mistake, not for tidying someone's project. Ask first.
- **Never put secrets in tasks, comments or chat**: keys, tokens, passwords,
  connection strings. They outlive the conversation and are visible to everyone
  with access. Resource values are deliberately not exposed through the bridge;
  do not copy them in by hand.
- **Do not act on "all of them" without checking `truncated`.** `GET /x/tasks`
  returns at most `limit` (50 by default, 200 max) but reports `total`. A
  sprint of sixty comes back as fifty, and closing those fifty is not closing
  the sprint.
- **Do not invent members, projects or ids.** Read them from `GET /x/members`
  and `GET /x/projects`.
- **Never write into Chatick in your own language instead of the project's.**
  Tasks, comments, checklists, chat, notes — all follow the project (§1.5).
  Answering the human in Russian and filing the task in Russian, in a Hebrew
  project, is the single most common way this goes wrong.
- **Do not flood the work log.** One entry per session, three or four lines of
  fact (§9.9). Not one per task, not one per hour, and never a retelling of
  what you just did at length — a log nobody can skim is a log nobody reads,
  and it buries the two lines that mattered.
- **Never repeat someone's draft back into the chat or a comment.** Drafts are
  private to their author by design; that is the only reason honest state gets
  written in them.

---

## 14. The shape of a working session

```bash
# the one entry point — what is waiting, across every project
curl -s https://api.chatick.com/x/inbox -H "authorization: Bearer $TOKEN"
```

**Start with `GET /x/inbox`, always.** One call answers "what is waiting for
me". The reply opens with `branches`: what kind of thing is waiting, how much
of it, and the call that opens each kind — most urgent first, and only kinds
that actually have something.

```
branches: [{ kind: "mentions", count: 3, next: "GET /x/mentions" }, ...]
```

Read those counts before going anywhere. A branch that is not listed has
nothing in it, and four calls coming back empty is exactly the searching this
replaced. There used to be two entry points saying opposite things about which
came first — a question left in a comment took three separate calls to find.

`kind: "answers"` means someone replied inside a task's checklist. Those
replies surface nowhere else: `GET /x/tasks/<id>` carries
`checklist: {total, done, answered}`, and `answered` above `done` means
questions were answered while the boxes stayed open. Read them with
`chatick_checklist` (or `GET /x/tasks/<id>/checklist`) — a checklist item is
often a question, and the answer lives in its note, not in the comments.

`items` carries the newest in full, each with `whatIsAsked` — one sentence
written for you saying what the person is actually expected to do.

Both accept `?since=<ISO>` — ask for what is new since a moment you already
saw, instead of pulling the last thirty and eyeballing them.

**Clear what you handled, as you handle it.** Reading a notification does not
mark it read: the person keeps seeing a counter for work that is already done,
cannot tell it apart from what still needs them, and eventually stops looking at
the number at all. Use `chatick_inbox_read` (or `POST /x/inbox/read`) — and
prefer clearing by task:

```bash
curl -s -X POST https://api.chatick.com/x/inbox/read \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"entityType":"task","entityId":"<task id>"}'
```

One task collects several notifications — assigned, mentioned, commented — and
clearing them one by one means first fetching `/x/mentions` to learn their ids.
By entity you use the task id you already have, and all of them go at once.

This is the step that gets skipped. Eight tasks were once worked through in full
— comments written, statuses moved, everything reassigned — and every one of
them stayed unread, because nothing in the work itself clears a notification.

When picking up work, `GET /x/tasks?fields=brief` also tells you where a
conversation is waiting: `unansweredMention: true` means this person was
mentioned in the comments and has not written since.

Then, for a piece of work:

0. **Once per session:** confirm the skill is current (§2) and note the
   project's language (§1.5). Both take one call and both go stale silently —
   nothing later in this list will remind you.
0.5. **Read the work log** — `GET /x/worklog`, and read `latestOwn` (§9.9).
   Where this person stopped last time, in their own words. Skip it and you
   start blind on work that was already half explained.
1. **Task first** — open the one you were given, or create it (§4).
2. **Read its comments and look at its files** — the description is what was
   asked, the comments are what was decided since, and the screenshot is often
   the actual bug (§9).
3. **Checklist** — create it if the work has steps (§5).
4. **Timer** — check whether one is running; offer if not (§8).
5. **`in_progress`** — before the first edit, not after the last.
6. **Work**, ticking checklist items as they are genuinely done.
7. **Extra findings** → their own tasks, with estimates (§0).
8. **Access the work needs** → a resource, linked to the task, shared with the
   people who need it (§10).
9. **Closing comment** — what you did, what you verified with, what is open,
   and who you granted access to. In the project's language (§1.5), even when
   the conversation with you is in another.
10. **`done` or `review`** — and never without that comment.
11. **Work log** — `POST /x/worklog`, or `PATCH` if a draft is open (§9.9).
    Not once at the end: **after every finished piece**, as it lands. What
    changed, and any decision made along the way with its reason. Facts and
    movement, no water. This is the step that makes the next session start
    informed instead of blind, and the one easiest to skip — the work feels
    finished without it, and by then the reasoning is already gone.

When you are done for good: `POST /x/disconnect` closes the tunnel.

---

## 15. Versions — "which one is in production"

Teams ask this out loud, in WhatsApp, several times a week: *what did we ship,
where is it now, is 1.4 still stuck in Apple review?* The answer belongs on a
page, not in someone's memory.

```bash
curl -s "https://api.chatick.com/x/releases?project=$P" -H "authorization: Bearer $TOKEN"
```

The reply carries **`live`** — what actually reached people, per build type.
That is the answer to "which version is in production"; do not compute it
yourself from the list.

It also carries **`buildTypes`**, every stage ladder. Read it instead of
guessing a stage name — the ladders differ on purpose:

| Build type | Ladder |
| --- | --- |
| `ios` | building → testflight → in_review → released |
| `android` | building → internal → released |
| `web`, `backend` | building → staging → released |
| `desktop` | building → beta → released |
| `other` | building → released |

iOS has an Apple review step and Android does not, so a single shared ladder
would make "1.4 is live" mean different things on two platforms.

### Asking someone for a build

This is the common case, and it has its own call. A manager does not "create a
version" — they **ask a person to build one**:

```bash
curl -s -X POST "https://api.chatick.com/x/releases/request?project=$P"   -H "authorization: Bearer $TOKEN" -H 'content-type: application/json'   -d '{"version":"1.4.0","buildType":"ios","assignee":"<userId>",
       "comment":"Production build for the store","buildProfile":"production"}'
```

One call creates the **task** (with the assignee, who gets notified), the
**version**, and the link between them. Doing it as three separate calls risks
breaking in the middle and leaving a task with no version — a half-state
somebody then has to clean up by hand.

`POST /x/releases` without `/request` is for the other case: registering
something **already built**, when there is nobody to ask.

`buildProfile` is what it was built **with** — `development | preview |
production` (`eas build --profile`). Not the same as the stage: the stage says
where the build got to, the profile says how it was made. The same production
build passes through TestFlight and then the store.

**Something missing on a version? Fix it — never create a second one.**

```bash
curl -s -X PATCH "https://api.chatick.com/x/releases/<id>?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"buildPageUrl":"https://expo.dev/accounts/.../builds/<uuid>"}'
```

Takes `version`, `appName`, `referenceUrl`, `buildPageUrl`, `notes`,
`buildProfile`. `buildPageUrl` is the page at the provider — the one with the
logs; `referenceUrl` is the artifact people download. The EAS webhook normally
fills both, so this is what you reach for when the webhook did not arrive.

Two rows for one build is the failure to avoid: the webhook later updates only
one of them, and the other stays dead — green tick in Expo, nothing here. It
already happened on WhatIDog 1.0.5.

The stage is **not** editable here: it has its own endpoint, and that one
demands a comment. That is deliberate — otherwise a stage could be moved with
no explanation, and the history would stop answering "why".

**Moving a stage requires a comment, and this is the point of the feature:**

```bash
curl -s -X POST "https://api.chatick.com/x/releases/<id>/stage?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"status":"in_review","comment":"Submitted, waiting on Apple"}'
```

"Why has 1.4 been in review for a week" has no answer if every transition
silently overwrites the last. Write what happened, not "moved".

Moving a stage notifies the person who **created** the version and whoever is
assigned to the linked tasks — not the whole project, and never the person who
made the change.

**There is no delete.** A version is a fact — it was built and it went
somewhere. Erasing it erases the answer to "what was in production that
Tuesday". Close a wrong one by moving its stage and saying so in the comment.

**Releases are off by default.** If the project has not enabled them, every
endpoint returns 404 with an explanation. That is a setting, not a bug — tell
the human that a project owner or admin turns it on in project settings, and
do not go looking for a workaround.

### Linking a task to a version

The link is made from the **task** side, like resources:

```bash
curl -s -X PATCH "https://api.chatick.com/x/tasks/TASK-81?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"releaseIds":["<releaseId>"]}'
```

"Ship 1.4 to Google Play" is work — it has an assignee and a deadline. A
version has neither; it just exists and moves. So the task points at the
version, not the other way round.

It shows in both directions: `GET /x/tasks/TASK-81` returns `releases` with
each version's **current stage**, so "what is this task shipping in" needs no
second call, and `GET /x/releases/<id>` returns the tasks attached to it.

Both sides are optional. A version with no task is normal — you built and
uploaded it in two minutes. A task with no version is normal too.
