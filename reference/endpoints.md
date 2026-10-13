# Chatick bridge — endpoint map

Generated from the bridge source, not written by hand: `bridge.ts` is the
single source, and the list below equals it as of generation time.

**This is a map, not the final word.** Exact field semantics, this specific
person's permissions and anything added since live in `GET /x/guide` on the
server. This file exists so you need no network call to answer "is there an
endpoint for this at all".

Base: `https://api.chatick.com`. Header: `authorization: Bearer <token>`.
On a company or master token every project call also needs `?project=<id>`.

Chatick 2.0: work moves by **handoffs** (`/x/tasks/:id/handoff`) and "what is
on me" is `/x/ball/mine` — see "The ball" below and SKILL.md §6.

## Connection

```
POST   /x/device
POST   /x/device/poll
```

```
GET    /x/guide
```

```
POST   /x/disconnect
```

## Inbox

```
GET    /x/mentions                             ?unread=0 &since=<ISO>
GET    /x/inbox                                ?unread=0 &since=<ISO>
POST   /x/inbox/read                           {"ids":["..."]} or {"all":true}
       {"entityType":"task","entityId":"<id>"}  clears every notification about
                                                one task — the id you already have
```

`/x/inbox` is the entry point: its `branches` say what kind of thing is
waiting and how much — `announcements`, `ball` (a ball passed to this person),
`mentions`, `answers` (replies inside a checklist), `comments`, `tasks`, … —
and open a branch only when its count says there is something in it.
`/x/mentions` is the `mentions` branch on its own: what was addressed to this
person, including `kind="question"` — a task waiting for their answer, which
is answered with a handoff, not a comment.

## Releases

```
GET    /x/releases                             list + "live" + stage ladders
GET    /x/releases/:id                         one version, its history and tasks
POST   /x/releases/request                     {"version","buildType","assignee?","comment?","buildProfile?","estimateMinutes?"}
POST   /x/releases                             {"version","buildType","status?","referenceUrl?","buildPageUrl?","notes?","comment?","buildProfile?"}
PATCH  /x/releases/:id                         {"version?","appName?","referenceUrl?","buildPageUrl?","notes?","buildProfile?"}
                                               Fix an existing version instead of creating a second one for the
                                               same build: two rows split its history, and the EAS webhook then
                                               updates only one of them. buildPageUrl is the page with the logs,
                                               referenceUrl is the artifact people download.
POST   /x/releases/:id/stage                   {"status","comment"}  comment REQUIRED
```

/x/releases/request is the usual one: it creates the task (with an assignee,
who is notified), the version and the link in a single call. Plain POST
/x/releases registers something already built.

Off by default: 404 until a project owner enables them. No DELETE — a version
is a fact, close a wrong one with a stage change. Tasks link to versions from
the task side: `releaseIds` in POST/PATCH `/x/tasks`.

## The ball

```
GET    /x/ball/mine                            ?sort=held|due|priority|created &group=move|project &move=do|review|answer
                                               "На мне": every task whose ball is with this person, across
                                               the connection's projects. "table" (at most 3), then "items":
                                               answers first, then reviews, then work; waiting for the client
                                               last. Each item: "last" (latest handoff + note), "isNew",
                                               "moves" (handoff actions allowed right now), "url".
GET    /x/ball/from-me                         ?group=holder  "От меня": owned by this person, held by
                                               someone else — what am I waiting for, from whom.
POST   /x/ball/table                           {"task","on":true|false}  at most 3 per holder; a 4th → table_full
POST   /x/ball/quick                           {"text","preview?","project?","company?"}
                                               "fix the header @Elisha #Atlas" — preview first; ambiguous
                                               names come back as "candidates"
POST   /x/tasks/:id/handoff                    {"action","to?","note?"}
                                               action: take | pass | review | accept | return | ask | answer |
                                               wait_client | client_replied | cancel | reopen
                                               note REQUIRED for review, return, ask, answer, cancel.
                                               "to": "me", a name or a user id; pass with "to": null = backlog.
                                               A refusal carries "hint"; 409 "conflict" = re-read the task.
GET    /x/tasks/:id/handoffs                   the handoff log: who passed it to whom, note, round
```

The list «Все» of the app has no bridge twin: use `GET /x/tasks` per project.

## Tasks

```
GET    /x/open?link=<link or TASK-81>          task behind a pasted link — short, full URL or number
GET    /x/tasks                                ?assignee=me &status= &q= &fields=brief &limit=
                                               &blocked=1 &stale=<days> &noEstimate=1 &overdue=1
PATCH  /x/tasks/bulk                           {"tasks":["TASK-4","TASK-7"], "set":{...}, "refs":{"TASK-4":"19.1"}}
DELETE /x/tasks/bulk                           {"tasks":["TASK-4","TASK-7"]}
GET    /x/tasks/:id                            carries "ball": {move, ownerId, round, heldSince, askFromId,
                                               waitingClientSince, onTable}
POST   /x/tasks                                {"title","assignee","description?","status?","priority?","estimateMinutes?","dueDate?","sprintId?","attachmentIds?","resourceIds?","releaseIds?","refs?","links?"}
                                               assignee is REQUIRED: it gets the ball. Ask who should do it.
PATCH  /x/tasks/:id                            status/assignee here still work — turned into handoffs, no note.
                                               Prefer /handoff.
DELETE /x/tasks/:id
GET    /x/tasks/:id/history                    who created it, assigned it, moved its status — milestones only
GET    /x/search/tasks?q=…                     find a task across EVERY project, by meaning
                                               Comments are indexed with their task, so "where did we
                                               discuss X" lands on the task holding the discussion.
                                               Items found that way carry matchedBy="meaning".
POST   /x/tasks/:id/restore
GET    /x/tasks/:id/blockers
POST   /x/tasks/:id/blockers                   {"tasks":["TASK-3","TASK-5"], "side":"blockedBy"|"blocking"}
DELETE /x/tasks/:id/blockers/:linkId

# Links: where a task came from, what resembles it. NOT blockers — they hold
# nothing back. kind: "derived" (grew out of, directed) | "related" (symmetric).
GET    /x/tasks/:id/links
POST   /x/tasks/:id/links                      {"tasks":["TASK-3"], "kind":"derived"|"related"}
DELETE /x/tasks/:id/links/:linkId

# Access a task needs. Name and address only — never secret values.
# Prefer these over "resourceIds" in PATCH: that field REPLACES the whole list.
GET    /x/tasks/:id/resources
POST   /x/tasks/:id/resources                  {"resources":["<resourceId>"]}
DELETE /x/tasks/:id/resources/:resourceId

GET    /x/tasks/:id/checklist
POST   /x/tasks/:id/checklist                  {"items":["...","..."]} or {"text":"...","note":"..."}
PATCH  /x/tasks/:id/checklist/:itemId
DELETE /x/tasks/:id/checklist/:itemId
GET    /x/tasks/:id/comments
POST   /x/tasks/:id/comments                   {"text", "replyTo?", "attachmentIds?"}
PATCH  /x/tasks/:id/comments/:commentId
DELETE /x/tasks/:id/comments/:commentId
```

## Blockers

```
GET    /x/blockers
```

## Sprints (legacy)

Gone from the interface in 2.0; kept for old integrations. Use only when the
human explicitly asks — nobody sees a sprint in the app.

```
GET    /x/sprints
POST   /x/sprints                              {"name","startsAt?","endsAt?"}
PATCH  /x/sprints/:id                          {"name?","color?"}
DELETE /x/sprints/:id
```

## Time

```
GET    /x/time/running
POST   /x/time/start                           {"task?":"TASK-12","description?":"...","startedAt?":"<ISO>","onCompany?":true}
POST   /x/time/stop                            {"id?":"<entryId>"}  — id needed only if several run
POST   /x/time                                 {"startedAt","endedAt","task?","description?","onCompany?":true} — after the fact
GET    /x/time                                 ?from= &to= &task= &mine=1 &onCompany=1
PATCH  /x/time/:id                             {"description?","task?","startedAt?","endedAt?","project?"}
                                               "project": null moves the entry onto the company
POST   /x/time/resume                          {"id?":"<entryId>"}  — carry on after a break
GET    /x/time/report
```

`onCompany`: time on the company itself, no project and no task — a call,
planning, mail.

## Company

No project needed. On a master connection add `?company=<id>`.

```
GET    /x/companies                            companies with the projects this person is in
GET    /x/company/members                      everyone in the company, company role and job title
PATCH  /x/company/members/:userId              {"jobTitle"?, "responsibility"?, "role"?}  company admin only;
                                               manager/admin see EVERY project — ask first
GET    /x/company/time                         ?from= &to= &person=  hours by person and project
GET    /x/company/documents                    ?q=  documents of every project you can read
GET    /x/company/releases                     versions of every project + "live"
POST   /x/announce                             {"title","body?","project?","users?","email?"}  company admin;
                                               interrupts everybody — ask the human first
```

## Members

```
GET    /x/members
GET    /x/members/available
POST   /x/members                              {"userId"|"email", "role"?: "admin"|"member", "companyRole"?}
PATCH  /x/members/:userId                      {"role"?, "permissions"?, "jobTitle"?, "responsibility"?}
DELETE /x/members/:userId                      out of THIS project only — ask first
```

## Projects

```
GET    /x/projects
POST   /x/projects                             {"name","about?","chatRules?"} — new project
PATCH  /x/projects/:id                         {"name"?, "about"?, "chatRules"?, "color"?}
```

## Project chat

Chat lives only in the mobile app in 2.0; the bridge still serves it.

```
GET    /x/messages/:id/context
GET    /x/messages
POST   /x/messages                             {"text","replyToId?":"<messageId>","attachmentIds?":["<fileId>"]}
DELETE /x/messages/:id
```

## Files

```
POST   /x/files/:id/restore
GET    /x/files
POST   /x/files
GET    /x/files/:id/content
DELETE /x/files/:id
```

## Notes

```
GET    /x/notes
GET    /x/notes/:id
POST   /x/notes                                {"type","title","body","tags":[],"scope","sourceMessageIds":[],"mentionedIds":[],"remindAt"}
PATCH  /x/notes/:id
POST   /x/notes/:id/task
DELETE /x/notes/:id
```

## Work log

Where each person stopped. Read `latestOwn` when you start, extend your draft
after every finished piece of work (SKILL.md §9.9).

```
GET    /x/worklog?authorId=&from=&to=&limit=   reply opens with latestOwn
POST   /x/worklog                              {"body","taskId?"} — saves a DRAFT
PATCH  /x/worklog/:id                          {"body?","taskId?"} — own draft only; taskId:"" unlinks
POST   /x/worklog/:id/publish                  one-way
DELETE /x/worklog/:id                          own DRAFTS only
```

Drafts are visible to their author alone — never quote one into the chat.
Published entries can be added to, never edited.

## Resources

```
GET    /x/resources
POST   /x/resources                            {"name"?,"url"?,"description"?,"secrets"?,"viewers"?}
PATCH  /x/resources/:id
DELETE /x/resources/:id/secrets/:secretId

# Files kept under a resource: keystore, certificate, private key.
# Encrypted at rest, never listed among project files. Names and sizes only;
# downloading is a separate call and is audited.
GET    /x/resources/:id/files
GET    /x/resources/:id/files/:fileId          binary download
POST   /x/resources/:id/files                  multipart: file=@path
                                               (local MCP: chatick_upload with resourceId)
DELETE /x/resources/:id/files/:fileId          remove one attached by mistake
```

## Releases integration

```
GET    /x/integrations/expo                    is Expo connected? returns the ready command
POST   /x/integrations/expo                    connect it; returns the command to run in the app folder
```

## Report to the Chatick team

```
POST   /x/report                               {"kind":"request"|"bug"|"missing"|"docs","body","context?"}
```

## Activity

```
GET    /x/activity
```

## Trash

```
GET    /x/trash
```

## root

```
GET    /x/
```

## shares

```
POST   /x/shares/:type/:id
GET    /x/shares/:type/:id
DELETE /x/shares/:type/:id
```

## context

```
GET    /x/context
```

## db

```
GET    /x/db
POST   /x/db/:id/read                          {"sql":"select ...", "limit":100}
```

## documents

```
GET    /x/documents
GET    /x/documents/:id
POST   /x/documents                            {"title","content"}   content is markdown
                                               Write `## Heading`, not <h2>. Never send escaped HTML.
PATCH  /x/documents/:id                        {"title?","content?"}
POST   /x/documents/:id/append                 {"content"}       safe for long docs
GET    /x/documents/:id/versions
POST   /x/documents/:id/versions/:versionId/restore
DELETE /x/documents/:id
```

## chat

```
GET    /x/chat/summaries
GET    /x/chat/summaries/:id
GET    /x/chat/messages
```

## Field values

```
move       do | review | answer                  what the holder owes (ball.move)
action     take | pass | review | accept | return | ask | answer |
           wait_client | client_replied | cancel | reopen
status     todo | in_progress | review | done | cancelled
           derived from the moves; "verified" is gone (sent by an old client, it closes as done)
priority   low | normal | high | urgent
assignee   <userId> | "me" | a name | an email   — the holder of the ball
estimateMinutes   integer, minutes
```

Endpoints in total: 126.

