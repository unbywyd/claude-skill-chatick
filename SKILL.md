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

**If they ask you to update this skill**, it is a git clone — run it for them
from the skill directory (`~/.claude/skills/chatick` unless they installed it
elsewhere):

```bash
cd ~/.claude/skills/chatick && git pull
node scripts/install.mjs   # only if mcp/ changed; harmless otherwise
```

Then tell them to restart Claude Code, and say why: you are running the copy
loaded at startup, so until they restart, the files on disk are new and your
behaviour is old. Do not claim the update took effect in this session — it did
not, and you cannot verify it from inside.

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

**What language.** Write in the language the project already speaks — read a
few existing tasks and match them. A Russian task in a Hebrew project is one
more thing for someone to translate before they can start.

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

**Give the human the `url` from the reply — never a link you assembled.** Every
task in a response carries a ready one. The address format has changed once
already, and a guessed `/#/p/<id>` looks plausible while opening a blank
screen: the route does not exist, the router renders nothing, and the person
concludes the product is broken.

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
- **Attach evidence.** `POST /x/files` first, then `"attachmentIds"` (up to
  10). A screenshot of the failure often IS the answer.

A closing comment says: what you did, what you verified it with, and what is
still open. "Done" is not a report.

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

---

## 14. The shape of a working session

```bash
# what concerns this person, across every project
curl -s https://api.chatick.com/x/inbox -H "authorization: Bearer $TOKEN"
```

`GET /x/inbox` is the answer to "what is on my plate" — it spans all projects,
item carries `whatIsAsked`, written for you. Start there.

Then, for a piece of work:

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
   and who you granted access to.
10. **`done` or `review`** — and never without that comment.

When you are done for good: `POST /x/disconnect` closes the tunnel.
