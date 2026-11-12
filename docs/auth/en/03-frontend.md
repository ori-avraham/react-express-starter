# 3. Auth in the frontend

[← The backend](02-backend.md) · [Next: recipes and FAQ →](04-recipes-and-faq.md) · [עברית](../he/03-frontend.md)

Files covered on this page:

```
frontend/
  vite.config.js                       The /api proxy
  src/lib/auth-client.js               The Better Auth client
  src/lib/roles.js                     Same roles as the backend
  src/components/login-form.jsx        Sign in
  src/components/signup-form.jsx       Sign up
  src/routes/dashboard/route.jsx       Only signed-in users may enter /dashboard
  src/lib/guards.js                    requireRole() for pages
  src/components/app-sidebar.jsx       Links filtered by role
  src/routes/dashboard/users.jsx       Manager-only page using the admin plugin
```

## `lib/auth-client.js`: the client

```js
export const authClient = createAuthClient({
  baseURL: window.location.origin,   // e.g. http://localhost:5173
  basePath: '/api/auth',
  plugins: [adminClient()],
})
```

`authClient` is how React talks to Better Auth. It sends requests to
`/api/auth/...`, which Vite forwards to the backend. The `adminClient()` plugin
adds `authClient.admin.*` functions (list users, set role) to match the admin
plugin on the server.

The functions you will use:

| Code                                         | What it does                                         |
| -------------------------------------------- | ---------------------------------------------------- |
| `authClient.signUp.email({ name, email, password })` | Create an account (and sign in)              |
| `authClient.signIn.email({ email, password })`       | Sign in                                      |
| `authClient.signOut()`                       | Sign out                                             |
| `authClient.useSession()`                    | **Hook**: the current user inside a component        |
| `authClient.getSession()`                    | **Function**: the current user outside components (`beforeLoad`, loaders) |
| `authClient.admin.listUsers(...)`            | All users (admin roles only)                         |
| `authClient.admin.setRole({ userId, role })` | Change a role (admin roles only)                     |

### Results come back as `{ data, error }`

The `authClient` functions **don't throw** when the server says no. They return
an object with `data` or `error`:

```js
const result = await authClient.signIn.email({ email, password })

if (result.error) {
  // e.g. result.error.message === "Invalid email or password"
  setServerError(result.error.message)
  return
}

// result.data.user is the signed-in user
```

Always check `error` before continuing.

## Signing in and signing up

`components/login-form.jsx`:

```js
onSubmit: async ({ value }) => {
  setServerError('')
  const result = await authClient.signIn.email(value)  // { email, password }
  if (result.error) {
    setServerError(result.error.message || 'Unable to sign in.')
    return
  }
  await navigate({ to: '/dashboard' })
},
```

`components/signup-form.jsx` is the same with `authClient.signUp.email({ name,
email, password })`. Signing up also signs the user in, with the default role
(`member`).

What happens behind the scenes: the server checks the password, creates a
session and sends back the cookie. The browser stores it. From now on every
request carries it, so there is nothing else to do.

> The forms also validate with Zod in the browser (valid email, password ≥ 8
> characters). That only gives faster feedback; Better Auth checks again on
> the server.

## Reading the current user: `useSession()`

Inside any component:

```jsx
import { authClient } from '@/lib/auth-client'
import { ROLES } from '@/lib/roles'

function NotesPage() {
  const { data: session, isPending } = authClient.useSession()
  const isManager = session?.user.role === ROLES.MANAGER

  return (
    <>
      <p>Hello {session?.user.name}</p>
      {isManager && <Button>Archive</Button>}
    </>
  )
}
```

| Value                | Meaning                                                    |
| -------------------- | ---------------------------------------------------------- |
| `session`            | `null` when signed out; otherwise `{ user, session }`      |
| `session.user`       | `{ id, name, email, role, ... }`                           |
| `isPending`          | `true` while the first check is still loading              |

Why `session?.user` with `?.`: on the very first render the data may not have
arrived yet, so `session` is `null`. The `?.` avoids a crash.

`useSession()` is **reactive**: after `signIn` or `signOut`, every component
using it re-renders with the new value.

## Protecting pages

### Only signed-in users: `dashboard/route.jsx`

`route.jsx` is the **layout** for every page under `/dashboard`. Its
`beforeLoad` runs before any of those pages loads:

```js
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) throw redirect({ to: '/signin' })
    return { session }
  },
  component: DashboardLayout,
})
```

- `beforeLoad` is not a component, so hooks can't be used there. That's why
  it calls `getSession()` (a normal async function) instead of `useSession()`.
- No session → `throw redirect(...)` sends the user to the sign-in page before
  anything is shown.
- `return { session }` puts the session into the **route context**. Every child
  route under `/dashboard` receives it.

### Only some roles: `requireRole()` in `lib/guards.js`

```js
export function requireRole(...roles) {
  return ({ context }) => {
    if (!roles.includes(context.session.user.role)) {
      toast.error('You do not have permission to open that page.')
      throw redirect({ to: '/dashboard' })
    }
  }
}
```

It reads `context.session`, the value returned by the dashboard layout above.
Use it on any page under `/dashboard`:

```js
// routes/dashboard/users.jsx
export const Route = createFileRoute('/dashboard/users')({
  beforeLoad: requireRole(ROLES.MANAGER),
  loader: ...,
  component: UsersPage,
})
```

The order is: dashboard layout `beforeLoad` (signed in?) → page `beforeLoad`
(right role?) → page `loader` (fetch data) → page component.

## Hiding links and buttons

The sidebar (`components/app-sidebar.jsx`) shows a link only to the roles
listed for it:

```js
const navItems = [
  { title: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Notes', to: '/dashboard/notes', icon: NotebookPenIcon },
  { title: 'Users', to: '/dashboard/users', icon: UsersIcon, roles: [ROLES.MANAGER] },
]

const visibleItems = navItems.filter(
  (item) => !item.roles || item.roles.includes(user.role),
)
```

Buttons use the same `useSession()` check. The notes page computes `isManager`
and passes it to each card, which shows the *Archive* button only to managers
(`components/notes/note-card.jsx`).

> Remember: hiding is **not** protection. A member who types
> `/dashboard/users` is stopped by `requireRole()`, and a member who calls
> `PATCH /api/notes/:id/archive` directly is stopped by the backend.
> All three layers exist on purpose.

## Calling your API

Because of the Vite proxy, `fetch('/api/...')` goes to the same site as the
page, and the browser sends the session cookie automatically. No token, no
`Authorization` header:

```js
const response = await fetch('/api/notes')
```

If the user isn't signed in (or the session expired), the server answers
`401` and `response.ok` is `false`. On pages under `/dashboard` this rarely
happens, because the layout already checked the session.

## Signing out

In `dashboard/route.jsx`:

```js
async function handleSignOut() {
  await authClient.signOut()          // deletes the session, clears the cookie
  await navigate({ to: '/signin' })
}
```

## The Users page: the admin plugin in action

`routes/dashboard/users.jsx` has **no Express route behind it**. It calls the
admin plugin's endpoints directly:

```js
// loader: all users
const { data, error } = await authClient.admin.listUsers({
  query: { limit: 100, sortBy: 'name' },
})

// change a user's role
const { error } = await authClient.admin.setRole({ userId, role })
```

The server allows these calls only for roles in `ADMIN_ROLES`
(`backend/src/lib/roles.js`). A member calling them gets an error, even with
the REST Client.

The page also disables the role menu on the manager's own row, so a manager
can't accidentally remove their own access.

## Summary

| You want to...                       | Use                                                     |
| ------------------------------------ | ------------------------------------------------------- |
| The user inside a component          | `authClient.useSession()` → `session?.user`             |
| The user in `beforeLoad` / loader    | `context.session` (under `/dashboard`) or `authClient.getSession()` |
| Sign in / up / out                   | `authClient.signIn.email` / `signUp.email` / `signOut`  |
| A page for signed-in users only      | Put it under `routes/dashboard/`                        |
| A page for some roles only           | `beforeLoad: requireRole(ROLES.X)`                      |
| Hide a link                          | `roles: [...]` in `navItems`                            |
| Hide a button                        | `session?.user.role === ROLES.X && <Button />`          |
| Call your API as the signed-in user  | `fetch('/api/...')`; the cookie is sent automatically   |
