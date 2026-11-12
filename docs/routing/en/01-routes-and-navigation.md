# 1. Routes and navigation

[Next: loading data →](02-loading-data.md) · [עברית](../he/01-routes-and-navigation.md)

The frontend uses **TanStack Router**. Your brief mentions React Router; the
ideas are the same (pages, links, URL parameters), but TanStack Router creates
routes **from files** and can load data before a page appears.

## Files become URLs

Every file in `frontend/src/routes/` is a page. Its path in the folder is its
URL:

```
src/routes/
├── __root.jsx                    (wraps every page)
├── index.jsx                     /
├── signin.jsx                    /signin
├── signup.jsx                    /signup
└── dashboard/
    ├── route.jsx                 (layout for everything under /dashboard)
    ├── index.jsx                 /dashboard
    ├── users.jsx                 /dashboard/users
    └── notes/
        └── index.jsx             /dashboard/notes   (new and edit happen in dialogs)
```

A page for **one item** uses a parameter in the file name. The Notes example
edits in a dialog, so it doesn't need one, but FixTrack's *issue details and
history* page would:

```
src/routes/dashboard/issues/
├── index.jsx                     /dashboard/issues
└── $issueId.jsx                  /dashboard/issues/:issueId   e.g. /dashboard/issues/6aef8e2f...
```

| File name | Meaning |
| --------- | ------- |
| `index.jsx` | The page at the folder's own URL (`dashboard/index.jsx` → `/dashboard`) |
| `something.jsx` | A page at `/.../something` |
| `route.jsx` | A **layout** for the folder: it wraps every page inside it |
| `$name.jsx` | A **parameter**: matches any value, available as `name` |
| `__root.jsx` | The root layout, around every page in the app |
| `-anything` | Files and folders starting with `-` are **ignored**, so you can keep helpers next to pages (`notes/-components/`) |

### `routeTree.gen.ts` is generated

While `npm run dev` runs, the router plugin watches `src/routes/` and rewrites
`src/routeTree.gen.ts`. **Never edit it.** If it looks wrong, restart
`npm run dev`.

### Creating a page

Create an **empty** file, e.g. `src/routes/dashboard/equipment/index.jsx`,
while the dev server runs. The plugin fills it in:

```jsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/equipment/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/equipment/"!</div>
}
```

Every route file exports a `Route`. The string passed to `createFileRoute` is
the route's path and must match the file's location. The plugin keeps it
correct; if you move a file, it updates the string.

## Layouts: `route.jsx` and `<Outlet />`

A layout is shared UI around several pages. `dashboard/route.jsx` draws the
sidebar once, and every page under `/dashboard` appears inside it, in place of
`<Outlet />`:

```jsx
// dashboard/route.jsx (simplified)
function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar ... />
      <SidebarInset>
        <Outlet />          {/* ← dashboard/index.jsx, notes/index.jsx, users.jsx... */}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

Layouts nest. For `/dashboard/notes` the router renders:

```
__root.jsx                   Toaster, tooltips
└── dashboard/route.jsx      sidebar + signed-in check
    └── notes/index.jsx      the notes page
```

So a page only contains **its own** content. The sidebar, the sign-in check and
the toaster come from the layouts above it.

## Linking between pages: `<Link>`

```jsx
import { Link } from '@tanstack/react-router'

<Link to="/dashboard/notes">All notes</Link>
```

Use `<Link>`, not `<a href>`. A `<Link>` changes the page without reloading
the whole app, so it's instant and keeps the state.

`to` must be a route that exists. With a parameter, pass it separately:

```jsx
<Link to="/dashboard/issues/$issueId" params={{ issueId: issue.id }}>
  {issue.title}
</Link>
```

With search parameters (see below):

```jsx
<Link to="/dashboard/notes" search={{ status: 'open' }}>Open notes</Link>
```

### Links that look like buttons

shadcn's `Button` can render as a link with `render`. `nativeButton={false}`
tells it that the element isn't a real `<button>`:

```jsx
<Button nativeButton={false} render={<Link to="/signup" />}>
  Get started
</Button>
```

### Styling the active link

`<Link>` adds `data-status="active"` when its page is open. You can also pass
classes:

```jsx
<Link to="/dashboard/notes" activeProps={{ className: 'font-bold' }}>Notes</Link>
```

The sidebar instead calculates `isActive` from the current path (see
`components/app-sidebar.jsx`).

## Navigating from code: `navigate()`

After an action (saving, deleting, signing in), move to another page from your
code:

```jsx
const navigate = Route.useNavigate()   // or useNavigate() from '@tanstack/react-router'

async function deleteNote() {
  // ... delete ...
  await navigate({ to: '/dashboard/notes' })
}
```

`navigate()` takes the same options as `<Link>`: `to`, `params`, `search`.

## URL parameters: `$issueId`

A file like `issues/$issueId.jsx` matches `/dashboard/issues/<anything>`. The
value is available in the loader and in the component:

```jsx
export const Route = createFileRoute('/dashboard/issues/$issueId')({
  loader: async ({ params }) => {
    const response = await fetch(`/api/issues/${params.issueId}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: IssuePage,
})

function IssuePage() {
  const issue = Route.useLoaderData()
  const { issueId } = Route.useParams()
  // ...
}
```

Parameters are always **strings**.

**A page or a dialog?** Use a dialog for quick create and edit forms (like
Notes). Use a `$id` page when one item has a lot to show: its details plus a
history, comments or related items, or when people should be able to share a
link to it.

## Search parameters: `?status=open`

Some state belongs in the URL: filters, the current tab, a search term. Then a
refresh keeps it, the back button works, and you can share the link.

`notes/index.jsx` keeps the status filter in `?status=`:

```jsx
export const Route = createFileRoute('/dashboard/notes/')({
  validateSearch: z.object({
    status: z.enum(['open', 'done', 'archived']).optional().catch(undefined),
  }),
  // ...
})

function NotesPage() {
  const { status } = Route.useSearch()      // 'open' | 'done' | 'archived' | undefined
  const navigate = Route.useNavigate()

  function changeFilter(value) {
    navigate({ search: { status: value === 'all' ? undefined : value } })
  }
  // ...
}
```

- `validateSearch` checks the URL with Zod. `.catch(undefined)` means a bad
  value (`?status=banana`) is ignored instead of crashing the page.
- `Route.useSearch()` reads the validated values.
- `navigate({ search: {...} })` changes them. `undefined` removes the parameter
  from the URL.

**When to use search params instead of `useState`:** if reloading the page
should keep the value, put it in the URL. If it's temporary (a dialog is open,
a field is being typed), use `useState`.

## `beforeLoad`: checks before the page

`beforeLoad` runs **before** a route loads. If it throws `redirect(...)`, the
page never shows. This project uses it for access control:

```jsx
// dashboard/route.jsx: only signed-in users
beforeLoad: async () => {
  const { data: session } = await authClient.getSession()
  if (!session) throw redirect({ to: '/signin' })
  return { session }
},
```

```jsx
// dashboard/users.jsx: only managers
beforeLoad: requireRole(ROLES.MANAGER),
```

What `beforeLoad` **returns** is added to the **route context**, which every
child route receives. That's how `requireRole()` reads `context.session`
without fetching the session again. In a component, read it with
`Route.useRouteContext()`.

More in the [auth guide](../../auth/en/03-frontend.md#protecting-pages).

## Order of everything

For `/dashboard/users`:

```
1. __root          beforeLoad
2. dashboard       beforeLoad   → signed in? (else redirect to /signin)
3. users           beforeLoad   → requireRole(MANAGER) (else redirect to /dashboard)
4. all loaders run              → fetch the users       ← next page of this guide
5. components render            → root → dashboard layout → users page
```

Parents always run before children. A redirect at any step stops everything
below it.

## What's on a `Route`

Inside a route file, the `Route` object gives you typed hooks for that route:

| Hook | Returns |
| ---- | ------- |
| `Route.useLoaderData()` | What the loader returned |
| `Route.useParams()` | URL parameters (`{ issueId }`) |
| `Route.useSearch()` | Validated search parameters (`{ status }`) |
| `Route.useNavigate()` | A `navigate` function |
| `Route.useRouteContext()` | The context (e.g. `{ session }`) |

In components **outside** route files, import the general versions from
`@tanstack/react-router`: `useNavigate()`, `useRouter()`, `useParams({ strict: false })`.

## Summary

| You want to... | Do |
| -------------- | -- |
| Add a page | Create a file in `src/routes/` (empty; the plugin fills it) |
| Share UI between pages | `route.jsx` with `<Outlet />` |
| A URL with an id | `$id.jsx`, read with `params.id` / `Route.useParams()` |
| Link to a page | `<Link to="..." params={...} search={...}>` |
| Go to a page from code | `navigate({ to: '...' })` |
| Keep a filter in the URL | `validateSearch` + `Route.useSearch()` + `navigate({ search })` |
| Block a page | `beforeLoad` + `throw redirect(...)` |
