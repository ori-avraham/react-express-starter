# 2. Express and REST

[← The journey](01-the-journey.md) · [Back to the index](../README.md) · [עברית](../he/02-express-and-rest.md)

This page explains the backend's building blocks: middleware, why the code is
split into folders, and the REST conventions every API in this project follows.

## Middleware: the core idea of Express

A **middleware** is a function that receives the request and decides what
happens next:

```js
function myMiddleware(req, res, next) {
  // 1. look at or change req
  // 2. then do ONE of:
  next();                                 //   pass to the next function
  res.status(200).json({ ... });          //   or answer and stop
  throw httpError(403, "Not allowed.");   //   or fail → jump to onError
}
```

| Parameter | What it is |
| --------- | ---------- |
| `req` | The request: `req.method`, `req.params`, `req.query`, `req.body`, `req.headers`. Middleware can add to it: `req.user`, `req.valid`. |
| `res` | The response you're building: `res.status(201).json(data)`. |
| `next` | "I'm done, continue." |

A controller is just the **last** middleware: it always answers.

### Order matters

Express runs middleware in the order you register them, like a pipeline:

```
request → logger → cors → helmet → express.json → router → notFound → onError
                                                      │
                                         requireAuth → validate → controller
```

That's why:

- `express.json()` must come **before** the routers. Otherwise `req.body` is
  `undefined`.
- Better Auth comes **before** `express.json()`, because it reads the raw body
  itself.
- `requireAuth` comes **before** `requireRole`, because `requireRole` needs
  `req.user`.
- `notFound` comes **after** all routes: it only runs if nothing else answered.
- `onError` is **last**, and has **four** parameters `(error, req, res, next)`.
  The four parameters are how Express knows it's an error handler.

### Errors jump straight to `onError`

In Express 5, if any middleware or controller **throws** (or an `await`
fails), Express skips everything else and calls `onError`. That's why the
controllers have no `try/catch`:

```js
export async function getNote(req, res) {
  const note = await Note.findById(req.valid.params.id);   // a DB error → onError (500)
  if (!note) throw httpError(404, "Note not found.");       // → onError (404)
  res.json(note);
}
```

`onError` (`middleware/on-error.js`) turns every error into the same JSON
shape, so the frontend always knows what to expect:

```json
{ "message": "Readable message", "errors": { "field": ["problem"] } }
```

## Why the backend is split into folders

Each folder answers **one question**:

| Folder | Question it answers | Example |
| ------ | ------------------- | ------- |
| `routes/` | Which URLs exist, and who may call them? | `notesRouter.patch("/:id/archive", requireRole(MANAGER), ...)` |
| `schemas/` | What data may the client send? | `title` is 3–100 characters |
| `controllers/` | What happens, and which business rules apply? | "Archived notes can't be edited" |
| `models/` | What is stored in the database? | `Note` has `title`, `status`, `owner`... |
| `middleware/` | What runs for many routes? | `requireAuth`, `validate`, `onError` |
| `lib/` | Setup and helpers | `auth.js`, `database.js`, `roles.js`, `http-error.js` |

When something goes wrong, the folder tells you where to look:

| Problem | Look in |
| ------- | ------- |
| 404 "Route not found" | `routes/` and `app.js` (is the router mounted? is the method right?) |
| 400 with field errors | `schemas/` (or the model, for Mongoose errors) |
| 401 / 403 | The router's middleware, or the ownership check in the controller |
| Wrong data returned, wrong rule | `controllers/` |
| Field missing in the database | `models/` |

A **router file reads like a table of contents** of the resource: every URL,
who may call it, what's validated. The logic lives elsewhere.

## REST: how the URLs are designed

**REST** is a set of conventions for HTTP APIs. The idea: URLs name **things**
(resources), and the **HTTP method** says what to do with them.

| Method | Meaning | Example | Success status |
| ------ | ------- | ------- | -------------- |
| `GET` | Read | `GET /api/notes` · `GET /api/notes/123` | `200 OK` |
| `POST` | Create | `POST /api/notes` | `201 Created` |
| `PATCH` | Change some fields | `PATCH /api/notes/123` | `200 OK` |
| `PUT` | Replace completely | (not used here) | `200 OK` |
| `DELETE` | Delete | `DELETE /api/notes/123` | `204 No Content` |

### URL conventions

- **Plural nouns**, not verbs: `/api/notes`, not `/api/getNotes` or `/api/createNote`.
- **The id in the path** for one item: `/api/notes/123`.
- **Filters in the query string**: `/api/notes?status=open`.
- **Relations as nested paths**: `/api/issues/123/updates` (the updates of issue 123).
- **Actions that aren't simple edits** get their own sub-path, usually with
  `PATCH` or `POST`: `/api/notes/123/archive`, `/api/food-posts/123/claim`,
  `/api/loans/123/return`.
- **"Mine"** for the signed-in user's own items: `/api/reservations/mine`.

### Reading the API in your brief

The routes in your brief already follow these conventions:

| Brief route | Meaning | In this project's style |
| ----------- | ------- | ----------------------- |
| `GET /api/incidents?status=open` | List, filtered | `router.get("/", validate("query", ...), listIncidents)` |
| `POST /api/incidents` | Create | `router.post("/", validate("body", ...), createIncident)` |
| `PATCH /api/incidents/:id` | Update | `router.patch("/:id", ..., updateIncident)` |
| `POST /api/events/:id/assign` | An action on one event | `router.post("/:id/assign", requireRole(MANAGER), ...)` |
| `GET /api/assignments/mine` | My items | `router.get("/mine", listMyAssignments)` (before `/:id`!) |
| `PATCH /api/loans/:id/return` | An action | `router.patch("/:id/return", ..., returnLoan)` |
| `POST /api/auth/login` | Sign in | Provided by Better Auth: `POST /api/auth/sign-in/email` |

> **Route order inside a router:** fixed paths (`/mine`, `/stats`) must come
> **before** `/:id`. Otherwise Express treats `mine` as an id.

### Status codes

| Code | Name | Use it when |
| ---- | ---- | ----------- |
| 200 | OK | Read or updated successfully |
| 201 | Created | Created something (send the new item back) |
| 204 | No Content | Deleted (send no body) |
| 400 | Bad Request | The data is invalid |
| 401 | Unauthorized | Not signed in |
| 403 | Forbidden | Signed in, but not allowed |
| 404 | Not Found | The item (or the URL) doesn't exist |
| 409 | Conflict | Breaks a business rule or a uniqueness rule |
| 500 | Internal Server Error | A bug. You never send this on purpose |

**4xx means the client did something wrong. 5xx means the server did.**

### What to send back

- **After creating or updating:** the item itself, so the frontend has the
  final version (with `id`, `createdAt`, defaults...).
- **Lists:** an array, even when empty (`[]`, status 200, not 404).
- **Errors:** always `{ message }`, plus `errors` for field problems. `onError`
  does this for you.
- **Never:** password data, other users' private data, stack traces in production.

## The two servers

In development, two programs run side by side:

| | Frontend | Backend |
| --- | --- | --- |
| Folder | `frontend/` | `backend/` |
| Started with | `npm run dev` (Vite) | `npm run dev` (Node with `--watch`) |
| Port | 5173 | 3000 |
| Serves | The React app (HTML, JS, CSS) | JSON at `/api/...` |
| Restarts on change | Updates the page instantly (HMR) | Restarts the server |

The browser only talks to 5173. Vite answers page requests itself and forwards
`/api/...` to 3000.

## Checklist: adding an endpoint

- [ ] Choose the method and URL using the REST conventions above
- [ ] Add the route in `routes/<resource>.routes.js`, with `requireAuth` / `requireRole`
- [ ] Add a Zod schema for the body / params / query in `schemas/`
- [ ] Write the controller: load, check rules, save, answer with the right status
- [ ] Mount the router in `app.js` (new resources only)
- [ ] Add a request (and a failing one) to `backend/docs/<resource>.http`
- [ ] Call it from the frontend: a loader for reading, an event handler for changes

→ The full walkthrough: [adding-a-resource.md](../../adding-a-resource.md)
