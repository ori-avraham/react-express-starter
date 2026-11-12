# 2. Auth in the backend

[← Concepts](01-how-auth-works.md) · [Next: the frontend →](03-frontend.md) · [עברית](../he/02-backend.md)

Files covered on this page:

```
backend/
  .env                        BETTER_AUTH_SECRET, BETTER_AUTH_URL, CLIENT_URL
  src/lib/roles.js            The roles and what they may do in Better Auth
  src/lib/auth.js             The Better Auth configuration
  src/app.js                  Connects Better Auth to Express
  src/middleware/auth.js      requireAuth and requireRole
  src/controllers/notes.controller.js   Ownership checks (example)
  src/seed.js                 Creates demo users
```

## Environment variables (`backend/.env`)

| Variable             | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | Secret used to sign cookies. Must be long and random (32+ characters). If it changes, every user is signed out. **Never commit the real one.** |
| `BETTER_AUTH_URL`    | The backend's own address (`http://localhost:3000`).                    |
| `CLIENT_URL`         | The frontend's address. Better Auth only accepts sign-in requests that come from here (`trustedOrigins`), and CORS allows it. |

To generate a secret: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.

## `lib/roles.js`: the roles

```js
export const ROLES = {
  MEMBER: "member",
  MANAGER: "manager",
};

export const DEFAULT_ROLE = ROLES.MEMBER;
```

- `ROLES` is the list you use everywhere in your code: `ROLES.MANAGER` instead of
  typing `"manager"`. A typo in a constant is an error; a typo in a string is a
  silent bug.
- `DEFAULT_ROLE` is the role given to anyone who signs up through the website.
  Nobody can choose their own role at sign-up.

The second part of the file is for Better Auth's **admin plugin** (explained
below):

```js
const ac = createAccessControl(defaultStatements);

export const authRoles = {
  [ROLES.MANAGER]: ac.newRole(adminAc.statements), // all admin powers
  [ROLES.MEMBER]: ac.newRole(userAc.statements),   // no admin powers
};

export const ADMIN_ROLES = [ROLES.MANAGER];
```

The admin plugin has built-in actions such as *list users*, *set role*, *ban
user*. `authRoles` says which role may do which of them. You don't need to
understand `createAccessControl` in depth: the manager gets everything, other
roles get nothing. If you add a role, add it here too.

## `lib/auth.js`: the configuration

```js
export const auth = betterAuth({
  database: mongodbAdapter(database),   // store users and sessions in MongoDB
  trustedOrigins: [clientUrl],          // accept requests from the frontend
  emailAndPassword: {
    enabled: true,                      // sign up / sign in with email + password
  },
  plugins: [
    adminPlugin({
      roles: authRoles,                 // from roles.js
      defaultRole: DEFAULT_ROLE,        // role for new sign-ups
      adminRoles: ADMIN_ROLES,          // roles that may use admin endpoints
    }),
  ],
});
```

- **`database`**: Better Auth creates and manages the `user`, `account`,
  `session` and `verification` collections.
- **`emailAndPassword`**: turns on the sign-up and sign-in endpoints. Passwords
  must be at least 8 characters by default.
- **`adminPlugin`**: adds the `role` field to every user, and adds the
  user-management endpoints used by the *Users* page.

The exported `auth` object is used in three places: `app.js` (to handle
requests), `middleware/auth.js` (to read the session) and `seed.js` (to create
users).

## `app.js`: connecting Better Auth to Express

```js
// Better Auth must receive the raw request body before express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
```

Every request whose URL starts with `/api/auth/` goes to Better Auth. It must
come **before** `express.json()`, because Better Auth reads the request body
itself.

You don't write any of these routes. Better Auth provides them:

| Method | URL                              | What it does                          |
| ------ | -------------------------------- | ------------------------------------- |
| POST   | `/api/auth/sign-up/email`        | Create an account and sign in         |
| POST   | `/api/auth/sign-in/email`        | Sign in (creates a session + cookie)  |
| POST   | `/api/auth/sign-out`             | Sign out (deletes the session)        |
| GET    | `/api/auth/get-session`          | The current user and session, or `null` |
| GET    | `/api/auth/admin/list-users`     | All users (admin roles only)          |
| POST   | `/api/auth/admin/set-role`       | Change a user's role (admin roles only) |
| POST   | `/api/auth/admin/create-user`    | Create a user with a role (admin roles only) |

Try them with `backend/docs/auth.http`.

## `middleware/auth.js`: protecting your own routes

Better Auth protects its own endpoints. **Your** endpoints (`/api/notes`,
`/api/incidents`...) are protected with two middleware functions.

### `requireAuth`: "you must be signed in"

```js
export async function requireAuth(req, _res, next) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    throw httpError(401, "You must be signed in.");
  }

  req.user = session.user;
  next();
}
```

Step by step:

1. `fromNodeHeaders(req.headers)` hands the request headers (which include the
   cookie) to Better Auth.
2. `auth.api.getSession()` reads the token from the cookie, looks up the
   session in MongoDB, and returns `{ session, user }`, or `null` if there is no
   valid session (no cookie, expired, signed out).
3. No session → stop with **401**.
4. Otherwise the user is saved on `req.user` so the next functions can use it:

```js
req.user = {
  id: "6aef8ef455dab10df0c77b89",
  name: "Dan Member",
  email: "member@demo.com",
  role: "member",
  // ...
}
```

### `requireRole(...roles)`: "you must have one of these roles"

```js
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw httpError(401, "You must be signed in.");
    if (!roles.includes(req.user.role)) {
      throw httpError(403, `Only ${roles.join(" or ")} users can do this.`);
    }
    next();
  };
}
```

`requireRole` is a function that **returns** a middleware. That is why you call
it with parentheses: `requireRole(ROLES.MANAGER)`. You can pass more than one
role: `requireRole(ROLES.MANAGER, ROLES.MAINTENANCE)`.

It reads `req.user`, so it must always come **after** `requireAuth`.

### Using them in a router

From `routes/notes.routes.js`:

```js
// Every route in this file requires a signed-in user.
notesRouter.use(requireAuth);

notesRouter.get("/", validate("query", listNotesQuery), listNotes);

// Only managers can archive.
notesRouter.patch(
  "/:id/archive",
  requireRole(ROLES.MANAGER),
  validate("params", noteIdParams),
  archiveNote,
);
```

A request travels through the functions left to right. If one throws, the rest
never run and `onError` sends the error response:

```
PATCH /api/notes/123/archive
   │
   ├─ requireAuth          no cookie?        → 401
   ├─ requireRole(MANAGER) member?           → 403
   ├─ validate(params)     bad id?           → 400
   └─ archiveNote          not found? → 404 · already archived? → 409 · OK → 200
```

## Ownership: "only your own"

Roles answer *"what kind of user are you?"*. Many rules are about **which
records** a user may touch: *"a student may cancel only their own
reservation"*. That can't be done in the router, because the router doesn't
know who owns the record yet. You check it in the controller, after loading it.

From `controllers/notes.controller.js`:

```js
async function findAccessibleNote(id, user) {
  const note = await Note.findById(id).populate("owner", "name email");

  if (!note) {
    throw httpError(404, "Note not found.");
  }

  if (!isManager(user) && !isOwner(user, note)) {
    throw httpError(403, "You can only access your own notes.");
  }

  return note;
}
```

And for lists, filter by owner so members only receive their own data:

```js
if (!isManager(req.user)) {
  filter.owner = req.user.id;
}
```

### Comparing ids

`req.user.id` is a **string**. `note.owner` is a MongoDB **ObjectId** (or a
whole user document after `.populate()`). Comparing them with `===` is always
`false`. Convert to a string first:

```js
note.owner.toString() === req.user.id          // owner not populated
note.owner._id.toString() === req.user.id      // owner populated
```

### Never trust the client for "who"

When creating a record, take the owner from the session, not from the request body:

```js
await Note.create({ ...req.valid.body, owner: req.user.id });   // ✅
await Note.create(req.body);  // ❌ the client could send someone else's id as owner
```

The Zod schema doesn't even contain `owner`, so it is impossible to send.

## Creating users from code (`seed.js`)

Users must be created through Better Auth, so the password is hashed and the
`account` document is created:

```js
const { user } = await auth.api.createUser({
  body: {
    name: "Maya Manager",
    email: "manager@demo.com",
    password: "password1234",
    role: ROLES.MANAGER,
  },
});
```

Never insert users with `db.collection("user").insertOne(...)`: they would have
no password and could never sign in.

## Summary

| You want to...                                  | Use                                             |
| ----------------------------------------------- | ----------------------------------------------- |
| Require a signed-in user                        | `requireAuth` (router)                          |
| Allow only some roles                           | `requireRole(ROLES.X)` after `requireAuth`      |
| Allow only the owner (or a manager)             | Load the record, compare ids, `throw httpError(403, ...)` |
| Know who is calling                             | `req.user.id`, `req.user.role`                  |
| Set the owner of a new record                   | `owner: req.user.id` in the controller          |
| Create users from code                          | `auth.api.createUser(...)`                      |
