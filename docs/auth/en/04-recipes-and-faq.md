# 4. Recipes and FAQ

[← The frontend](03-frontend.md) · [Back to the index](../README.md) · [עברית](../he/04-recipes-and-faq.md)

## Recipe: rename the roles for your project

Every brief has two roles with its own names, e.g. LabSlot has *student* and
*lab manager*.

**1. Backend: `backend/src/lib/roles.js`**

```js
export const ROLES = {
  STUDENT: "student",
  LAB_MANAGER: "lab_manager",
};

export const DEFAULT_ROLE = ROLES.STUDENT;

export const authRoles = {
  [ROLES.LAB_MANAGER]: ac.newRole(adminAc.statements),
  [ROLES.STUDENT]: ac.newRole(userAc.statements),
};

export const ADMIN_ROLES = [ROLES.LAB_MANAGER];
```

**2. Frontend: `frontend/src/lib/roles.js`**: the same values, plus labels:

```js
export const ROLES = {
  STUDENT: 'student',
  LAB_MANAGER: 'lab_manager',
}

export const ROLE_LABELS = {
  [ROLES.STUDENT]: 'Student',
  [ROLES.LAB_MANAGER]: 'Lab manager',
}
```

**3. Replace the old names.** Search both projects for `ROLES.MANAGER` and
`ROLES.MEMBER` and replace them. Your editor will help: an unknown constant
like `ROLES.MANAGER` shows up as `undefined` and the check silently fails, so
search carefully.

**4. Update `seed.js`** with demo users for the new roles, then run
`npm run seed`. Users created before the change still have the old role names.

## Recipe: the role that new sign-ups get

`DEFAULT_ROLE` decides it. Usually it is the "regular" role (worker, student,
reporter). The privileged role is given by the seed, or by a manager on the
*Users* page.

**What if the brief says users choose their role at sign-up?** (e.g.
FoodBridge: *publisher* or *collector*.) Neither is more powerful, so it's
reasonable. Don't add `role` to the sign-up form; Better Auth won't accept it,
on purpose. Instead, sign up with the default role, then let a manager set the
role, or ask your lecturer which approach they prefer. Never let users choose
a privileged role themselves.

## Recipe: more than two roles

Add the role to `ROLES` (both sides), to `authRoles`, and to `ROLE_LABELS`.
If it should manage users, add it to `ADMIN_ROLES`. Then use it like the others:
`requireRole(ROLES.MANAGER, ROLES.MAINTENANCE)`.

## Recipe: show the user's name next to a record

Store the user's id, and populate when reading:

```js
// model
createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

// controller
const incidents = await Incident.find().populate("createdBy", "name email");
```

Only ask for the fields you need (`"name email"`). Never send password data.
It isn't in the `user` collection anyway; it lives in `account`.

## Recipe: a dropdown of users (e.g. "assign to")

Managers can use the admin plugin from the frontend:

```js
const { data } = await authClient.admin.listUsers({
  query: { filterField: 'role', filterValue: 'worker', limit: 100 },
})
// data.users → [{ id, name, email, role, ... }]
```

If **non-managers** also need the list, add your own small endpoint, because
the admin endpoints are managers-only:

```js
// routes/users.routes.js
usersRouter.get("/", requireAuth, async (_req, res) => {
  const users = await User.find({}, "name email role").sort({ name: 1 });
  res.json(users);
});
```

## Testing auth with the `.http` files

`backend/docs/auth.http` and `backend/docs/notes.http` sign in first. The REST
Client keeps the cookie, so the following requests are signed in. To test as
another user, run a different sign-in request.

Good auth tests for your test document:

| Test                                         | Expected |
| -------------------------------------------- | -------- |
| Call a protected endpoint without signing in | 401      |
| Sign in with a wrong password                | 401, "Invalid email or password" |
| A regular user calls a manager-only endpoint | 403      |
| A user opens someone else's record           | 403      |
| A regular user opens a manager-only page     | Redirected to the dashboard |
| Sign out, then call a protected endpoint     | 401      |

---

## FAQ

### I signed in, but every request returns 401

- **Is the backend running and is MongoDB up?** The session lives in the database.
- **Are you calling the API through the proxy?** `fetch('/api/notes')` ✅,
  `fetch('http://localhost:3000/api/notes')` ❌ (a different site, so the cookie
  is not sent).
- **Did `BETTER_AUTH_SECRET` change?** All existing cookies become invalid. Sign in again.
- **Did you run `npm run seed`?** It deletes all sessions too. Sign in again.

### Sign-in fails with "Invalid origin" (403)

The frontend's address isn't in `trustedOrigins`. Check that `CLIENT_URL` in
`backend/.env` is exactly the address in your browser (e.g.
`http://localhost:5173`, without a trailing `/`).

### I changed a user's role but the app still shows the old one

The role is read when the session is loaded. Refresh the page, or sign out and
in again.

### Can I see a user's password?

No, and neither can anyone else. Only the hash is stored (in the `account`
collection). To reset a demo user's password, run `npm run seed`.

### Should I use JWT instead?

Your brief allows "JWT **or** session". This project uses **sessions**, which
fully meet the requirement. They are also simpler and safer for a web app:
the token sits in an `HttpOnly` cookie that JavaScript can't read, and signing
out really ends the session on the server.

### Where do I check permissions: router or controller?

| The rule depends on...                      | Check it in        | Example                    |
| ------------------------------------------- | ------------------ | -------------------------- |
| Only the user's role                        | Router: `requireRole` | "Only a manager can create events" |
| The record (owner, assignee, status)        | Controller, after loading it | "Only your own reservation" |
| Both                                        | Both               | "Only maintenance staff, and only open issues" |

### Is checking in the frontend enough?

**No.** The frontend check is for a nice experience. The backend check is the
security. Anyone can send requests directly to your API.

### What's the difference between `useSession()` and `getSession()`?

| | `useSession()` | `getSession()` |
| --- | --- | --- |
| Type | React hook | async function |
| Where | Inside components | `beforeLoad`, loaders, event handlers |
| Updates automatically | Yes (re-renders on sign-in/out) | No, a one-time read |
