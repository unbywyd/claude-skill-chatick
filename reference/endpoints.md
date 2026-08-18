# Chatick bridge — endpoint map

Generated from the bridge source, not written by hand: `bridge.ts` is the
single source, and the list below equals it as of generation time.

**This is a map, not the final word.** Exact field semantics, this specific
person's permissions and anything added since live in `GET /x/guide` on the
server. This file exists so you need no network call to answer "is there an
endpoint for this at all".

Base: `https://api.chatick.com`. Header: `authorization: Bearer <token>`.
On a company token every request also needs `?project=<id>`.

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

`/x/mentions` is only what was addressed to this person: mentions in comments,
chat and notes, plus tasks assigned to them. Check it before `/x/inbox` — the
wider feed mixes "someone closed their own task" with "a person is waiting for
my answer", and the second gets lost in the first.

## Releases

```
GET    /x/releases                             list + "live" + stage ladders
GET    /x/releases/:id                         one version, its history and tasks
POST   /x/releases/request                     {"version","buildType","assignee?","comment?","buildProfile?","estimateMinutes?"}
POST   /x/releases                             {"version","buildType","status?","referenceUrl?","notes?","comment?","buildProfile?"}
POST   /x/releases/:id/stage                   {"status","comment"}  comment REQUIRED
```

/x/releases/request is the usual one: it creates the task (with an assignee,
who is notified), the version and the link in a single call. Plain POST
/x/releases registers something already built.

Off by default: 404 until a project owner enables them. No DELETE — a version
is a fact, close a wrong one with a stage change. Tasks link to versions from
the task side: `releaseIds` in POST/PATCH `/x/tasks`.

## Tasks

```
GET    /x/tasks
PATCH  /x/tasks/bulk                           {"tasks":["TASK-4","TASK-7"], "set":{...}, "refs":{"TASK-4":"19.1"}}
DELETE /x/tasks/bulk                           {"tasks":["TASK-4","TASK-7"]}
GET    /x/tasks/:id
POST   /x/tasks                                {"title","description?","assignee?","status?","priority?","estimateMinutes?","sprintId?","attachmentIds?","resourceIds?","refs?"}
PATCH  /x/tasks/:id
DELETE /x/tasks/:id
POST   /x/tasks/:id/restore
GET    /x/tasks/:id/blockers
POST   /x/tasks/:id/blockers                   {"tasks":["TASK-3","TASK-5"], "side":"blockedBy"|"blocking"}
DELETE /x/tasks/:id/blockers/:linkId
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

## Sprints

```
GET    /x/sprints
POST   /x/sprints                              {"name","startsAt?","endsAt?"}
PATCH  /x/sprints/:id                          {"name?","color?"}
DELETE /x/sprints/:id
```

## Time

```
GET    /x/time/running
POST   /x/time/start                           {"task?":"TASK-12","description?":"...","startedAt?":"<ISO>"}
POST   /x/time/stop                            {"id?":"<entryId>"}  — id needed only if several run
POST   /x/time                                 {"startedAt","endedAt","task?","description?"} — after the fact
GET    /x/time
PATCH  /x/time/:id                             {"description?","task?","startedAt?","endedAt?","project?"}
POST   /x/time/resume                          {"id?":"<entryId>"}  — carry on after a break
GET    /x/time/report
```

## Members

```
GET    /x/members
GET    /x/members/available
POST   /x/members                              {"userId"|"email", "role"?: "admin"|"member"}
PATCH  /x/members/:userId
```

## Projects

```
GET    /x/projects
POST   /x/projects                             {"name","about?","chatRules?"} — new project
PATCH  /x/projects/:id                         {"name"?, "about"?, "chatRules"?, "color"?}
```

## Project chat

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

## Resources

```
GET    /x/resources
POST   /x/resources                            {"name"?,"url"?,"description"?,"secrets"?,"viewers"?}
PATCH  /x/resources/:id
DELETE /x/resources/:id/secrets/:secretId
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

## companies

```
GET    /x/companies
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
POST   /x/documents                            {"title","content"}   content is HTML
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
status     todo | in_progress | review | done
priority   low | normal | high | urgent
assignee   <userId> | "me"
estimateMinutes   integer, minutes
```

Endpoints in total: 85.

