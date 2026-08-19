---
name: chatick
description: Work inside a Chatick project — read and create tasks, assign them with an estimate, move them through statuses, tick their checklists, and report every result in task comments. Use when the human asks you to take work from Chatick or put work into it, when you are about to start work that belongs in a project, when a task number like TASK-81 appears, or when they say "поставь задачу", "что на мне", "возьми в работу", "отпишись в задаче", "смени статус".
when_to_use: Triggers include Chatick, чатик, TASK-<number>, "поставь задачу", "создай задачу", "что мне делать", "что на мне", "возьми в работу", "отпишись в комментарии", "смени статус", "оцени время", "запусти таймер", api.chatick.com, /x/tasks, bridge token, device flow.
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

---

## 6. Statuses — move the task as the work moves

`todo` → `in_progress` → `review` → `done`

```bash
curl -s -X PATCH "https://api.chatick.com/x/tasks/TASK-81?project=$P" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"status":"in_progress"}'
```

- **Take it before you work.** Move to `in_progress` when you start, not when
  you finish. A task sitting in `todo` while you edit its files means someone
  else may pick it up and do the same work twice.
- **`review` means a human must look.** Use it when the work is done but
  someone should check it — a merge, a deploy, a decision you are not entitled
  to make. Do not park things there to avoid saying they are finished.
- **`done` means done and verified**, not "I wrote the code". If tests failed
  or you could not check it, say that in a comment and leave it in `review`.
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

---

## 14. The shape of a working session

```bash
# where THIS PERSON was asked something — check this first
curl -s https://api.chatick.com/x/mentions -H "authorization: Bearer $TOKEN"

# everything else waiting for them, across every project
curl -s https://api.chatick.com/x/inbox -H "authorization: Bearer $TOKEN"
```

**Start with `GET /x/mentions`.** It returns only what is addressed to the
person directly — mentions in comments, chat and notes, plus tasks assigned to
them. It is a short list, and it is the one that has someone waiting on the
other end.

`GET /x/inbox` is the wider answer to "what is on my plate": it spans all
projects and every item carries `whatIsAsked`, written for you. But it mixes
weights — "someone closed their own task" sits next to "a person asked me a
question", and the second drowns in the first. That has already cost real
time: a question left in a comment took three separate calls to find, because
the general feed did not surface it.

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
