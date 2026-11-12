# Full Stack Project Starter

A starting point for your final project: a React frontend, an Express API,
MongoDB, sign-in with roles, and one complete example resource (**Notes**)
that shows every pattern you need.

> **How to use this repo:** run it, sign in with the demo users, click through
> the Notes pages, then read the Notes code from top to bottom. When you build
> your own resources (incidents, reservations, loans...), copy the Notes files
> and follow [docs/adding-a-resource.md](docs/adding-a-resource.md).

## Stack

| Part     | Technology                                                                |
| -------- | ------------------------------------------------------------------------- |
| Frontend | React, Vite, TanStack Router, TanStack Form, Tailwind CSS, shadcn/ui      |
| Backend  | Node.js, Express 5, Zod (validation)                                      |
| Database | MongoDB with Mongoose                                                     |
| Auth     | Better Auth: email and password, hashed passwords, sessions, roles        |

## Getting started

You need **Node.js 22+** and a running **MongoDB**.

```bash
# 1. Backend
cd backend
cp .env.example .env     # then set BETTER_AUTH_SECRET to a long random string
npm install
npm run seed             # creates the demo users and notes (wipes the database!)
npm run dev              # http://localhost:3000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Open http://localhost:5173 and sign in.

The frontend calls the API with plain `fetch('/api/...')`. Vite forwards every
`/api` request to the backend on port 3000 (see `frontend/vite.config.js`), so
the browser sees a single site and the session cookie is sent automatically.

### Demo users

All demo users have the password `password1234`.

| Email              | Role    | Can do                                       |
| ------------------ | ------- | -------------------------------------------- |
| `manager@demo.com` | manager | See all notes, archive notes, manage users   |
| `member@demo.com`  | member  | Create, edit and delete their own notes      |
| `member2@demo.com` | member  | Same as above, with different notes          |

Run `npm run seed` in `backend/` at any time to reset the database to this state.

## Project structure

```
backend/
  src/
    app.js                     Express app: middleware and routes are mounted here
    index.js                   Starts the server
    seed.js                    Demo data (npm run seed)
    lib/
      auth.js                  Better Auth setup
      roles.js                 The roles of your project  <- rename for your brief
      http-error.js            httpError(404, "Not found") helper
    middleware/
      auth.js                  requireAuth, requireRole(...)
      validate.js              validate("body", schema)
      on-error.js              Turns every error into { message, errors }
    models/                    Mongoose models (database tables)
    schemas/                   Zod schemas (what the client may send)
    controllers/               Route handlers and business rules
    routes/                    URL -> middleware -> controller
  docs/*.http                  Ready-made API requests (REST Client)

frontend/
  src/
    routes/                    One file per page (file-based routing)
      dashboard/route.jsx      Layout for signed-in pages
      dashboard/notes/         The Notes example: cards, new/edit in dialogs
      dashboard/users.jsx      Manager-only page
    components/
      notes/                   Note form, card, new/edit/archive/delete dialogs
      form-fields.jsx          TextField, TextareaField, SelectField, ServerError
      page-header.jsx          PageHeader, PageBody
      page-states.jsx          Loading, error and empty states
      app-sidebar.jsx          Sidebar links (with role filtering)
      ui/                      shadcn/ui components (generated, don't edit)
    lib/
      auth-client.js           Better Auth client
      roles.js                 Same roles as the backend
      guards.js                requireRole(...) for pages
      config.js                APP_NAME  <- rename for your project
```

## The Notes API

Every endpoint requires a signed-in user.

| Method | Path                       | Who               | What it does                                  |
| ------ | -------------------------- | ----------------- | --------------------------------------------- |
| GET    | `/api/notes?status=open`   | anyone            | Members get their notes, managers get all     |
| GET    | `/api/notes/stats`         | anyone            | Counts by status                              |
| GET    | `/api/notes/:id`           | owner or manager  | One note                                      |
| POST   | `/api/notes`               | anyone            | Create; always starts as `open`               |
| PATCH  | `/api/notes/:id`           | owner or manager  | Update; archived notes are read-only (409)    |
| PATCH  | `/api/notes/:id/archive`   | manager           | Archive                                       |
| DELETE | `/api/notes/:id`           | owner or manager  | Delete                                        |

Auth endpoints (sign up, sign in, sign out, list users, set role) are provided
by Better Auth under `/api/auth/*`. See `backend/docs/auth.http`.

### Error responses

Every error has the same JSON shape, so the frontend can always show it:

```json
{ "message": "Some fields are invalid.", "errors": { "title": ["Title must be at least 3 characters."] } }
```

| Status | When                                                        |
| ------ | ----------------------------------------------------------- |
| 400    | Invalid data (Zod or Mongoose validation, malformed id)     |
| 401    | Not signed in                                               |
| 403    | Signed in, but the role or owner is wrong                   |
| 404    | Not found                                                   |
| 409    | Breaks a business rule or a unique index                    |

## Guides

- [Request flow guide (English + עברית)](docs/request-flow/README.md): one click from the browser to the database and back. **Start here**
- [Authentication guide (English + עברית)](docs/auth/README.md): sessions, roles, permissions
- [Database guide (English + עברית)](docs/database/README.md): MongoDB, models, queries, seed data
- [Routing and data loading guide (English + עברית)](docs/routing/README.md): pages, links, loaders, refreshing data
- [Forms guide (English + עברית)](docs/forms/README.md): TanStack Form, Zod, field recipes, server errors
- [Adding a resource, step by step](docs/adding-a-resource.md)
- [Business rule recipes](docs/business-rules.md): overlapping bookings, "only once", date order...
- [README template for your project](docs/templates/README.template.md)
- [Test documentation template](docs/templates/tests.md)

## Scripts

| Where     | Command          | What it does                              |
| --------- | ---------------- | ----------------------------------------- |
| backend   | `npm run dev`    | Start the API and restart on file changes |
| backend   | `npm run seed`   | Reset the database with demo data         |
| backend   | `npm run lint`   | Find problems in the code                 |
| frontend  | `npm run dev`    | Start the website                         |
| frontend  | `npm run check`  | Format and lint check                     |
| frontend  | `npm run build`  | Production build                          |
