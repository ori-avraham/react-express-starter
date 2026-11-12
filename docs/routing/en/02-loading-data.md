# 2. Loading data

[← Routes and navigation](01-routes-and-navigation.md) · [Back to the index](../README.md) · [עברית](../he/02-loading-data.md)

## The problem loaders solve

The classic way to load data in React is `useEffect` + `useState`:

```jsx
// ❌ Not used in this project
function NotesPage() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/notes')
      .then((r) => r.json())
      .then(setNotes)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return <Error />
  // ...
}
```

Every page repeats the same three states, and the page appears empty first,
then fills in.

With a **loader**, the router fetches the data **before** showing the page, and
handles loading and errors for you:

```jsx
// ✅ This project
export const Route = createFileRoute('/dashboard/notes/')({
  loader: async () => {
    const response = await fetch('/api/notes')
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: NotesPage,
})

function NotesPage() {
  const notes = Route.useLoaderData()   // already loaded, never undefined
  // ...
}
```

## The loader, step by step

```jsx
loader: async () => {
  const response = await fetch('/api/notes')       // 1. call the API
  const data = await response.json()               // 2. read the JSON body
  if (!response.ok) throw new Error(data.message)  // 3. 4xx/5xx → error screen
  return data                                       // 4. becomes useLoaderData()
},
```

1. `fetch('/api/...')` goes through the Vite proxy to the backend. The session
   cookie is sent automatically.
2. Both success and error responses have a JSON body. On error it's
   `{ message, errors? }`.
3. `fetch` does **not** throw on 404 or 500, only when the network fails. You
   must check `response.ok` yourself. Throwing makes the router show the error
   component with `data.message`.
4. Whatever you return is what `Route.useLoaderData()` gives the component.

The loader receives useful values:

```jsx
loader: async ({ params, deps, context }) => { ... }
```

| Value | Contains |
| ----- | -------- |
| `params` | URL parameters (`params.issueId`) |
| `deps` | Values from `loaderDeps`, usually search params (see below) |
| `context` | The route context (`context.session`) |

## Loading and error screens

You don't write them per page. `main.jsx` sets defaults for every route:

```jsx
const router = createRouter({
  routeTree,
  defaultPendingComponent: PagePending,   // while a loader runs
  defaultErrorComponent: PageError,       // when a loader (or beforeLoad) throws
  defaultPendingMs: 200,
})
```

- **`PagePending`** (`components/page-states.jsx`) shows grey skeleton blocks.
- **`PageError`** shows the error message and a *Try again* button that re-runs
  the loader.
- **`defaultPendingMs: 200`**: the loading screen appears only if loading takes
  longer than 200 ms. Fast loads don't flash a skeleton. Once shown, it stays
  at least 500 ms, so it doesn't flicker.

To use a different screen for one page, set it on that route:

```jsx
export const Route = createFileRoute('/dashboard/notes/')({
  loader: ...,
  pendingComponent: NotesSkeleton,
  errorComponent: ({ error }) => <p>Could not load notes: {error.message}</p>,
  component: NotesPage,
})
```

**Empty is not an error.** An empty list is a successful response. Show
`<EmptyState>` in the component:

```jsx
{notes.length === 0 ? <EmptyState title="No notes found" /> : <NotesGrid notes={notes} />}
```

## Loaders that depend on search params: `loaderDeps`

When the notes filter changes (`?status=open` → `?status=done`), the data must
be loaded again. `loaderDeps` tells the router which search values the loader
uses:

```jsx
export const Route = createFileRoute('/dashboard/notes/')({
  validateSearch: z.object({
    status: z.enum(['open', 'done', 'archived']).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: async ({ deps }) => {
    const url = deps.status ? `/api/notes?status=${deps.status}` : '/api/notes'
    const response = await fetch(url)
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: NotesPage,
})
```

Whenever a value in `loaderDeps` changes, the loader runs again. Without
`loaderDeps`, changing the search params does **not** reload the data, because
the router only reloads when something it knows the loader depends on changes.

Only add a parameter to the URL when it has a value, like the `url` above.
`?status=undefined` would match nothing.

## Several requests for one page

A form often needs data from more than one endpoint (the reservation form needs
the equipment list). Run the requests in parallel with `Promise.all` and return
an object:

```jsx
loader: async () => {
  const [equipmentResponse, reservationsResponse] = await Promise.all([
    fetch('/api/equipment'),
    fetch('/api/reservations/mine'),
  ])
  if (!equipmentResponse.ok || !reservationsResponse.ok) {
    throw new Error('Could not load the page data.')
  }
  return {
    equipment: await equipmentResponse.json(),
    reservations: await reservationsResponse.json(),
  }
},

// in the component
const { equipment, reservations } = Route.useLoaderData()
```

## After a change: `router.invalidate()`

Loaders run when you **arrive** at a page. After you create, edit or delete
something, the page still shows the old data until you tell the router to
reload:

```jsx
import { useRouter } from '@tanstack/react-router'

const router = useRouter()

async function saveNote(data) {
  const response = await fetch(`/api/notes/${note.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) return response.json()   // the form shows the error

  toast.success('Note saved')
  await router.invalidate()                  // re-run the loaders → fresh data
}
```

`router.invalidate()` re-runs the loaders of the page that's open now (and its
layouts). The page stays visible while it reloads, then updates.

Choose based on where the user should end up:

| After... | Do |
| -------- | -- |
| Saving on the same page (edit, archive, role change) | `await router.invalidate()` |
| Creating in a dialog on a list page | Close the dialog, then `await router.invalidate()` |
| Deleting the item the page shows | `await navigate({ to: '/list' })` (the list page's loader fetches fresh data) |

## Writing data (POST, PATCH, DELETE)

Loaders are for **reading**. Changes happen in event handlers (a button click,
a form submit):

```jsx
// POST: create
await fetch('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

// PATCH: update
await fetch(`/api/notes/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(changes),
})

// PATCH without a body (an action)
await fetch(`/api/notes/${id}/archive`, { method: 'PATCH' })

// DELETE
await fetch(`/api/notes/${id}`, { method: 'DELETE' })
```

- With a body, always send `'Content-Type': 'application/json'` and
  `JSON.stringify(...)`. Otherwise Express can't read it and `req.body` is empty.
- Always check `response.ok`, then show the result:

```jsx
if (!response.ok) {
  const { message } = await response.json()
  toast.error(message)        // e.g. "Archived notes cannot be edited."
  return
}
toast.success('Note archived')
await router.invalidate()
```

- A `204 No Content` response (after `DELETE`) has **no body**. Don't call
  `response.json()` on success there.

In forms, return the error body instead of showing a toast; the form displays
it (see `components/notes/note-form.jsx`).

## Where should data live?

| Data | Where |
| ---- | ----- |
| Data from the server (notes, users...) | The loader → `Route.useLoaderData()` |
| The signed-in user | `authClient.useSession()` |
| Filters, tabs, search text | Search params (`validateSearch`) |
| UI state (dialog open, input being typed) | `useState` in the component |
| Form values | TanStack Form (`useForm`) |

Avoid copying loader data into `useState`. Then you have two copies, and after
`router.invalidate()` the copy in state is out of date.

## FAQ

### My page shows old data after saving

Call `await router.invalidate()` after a successful change, or navigate to a
page that loads the data again.

### The error screen says "Unexpected token '<'..."

The response wasn't JSON. Usually the URL is wrong (`fetch('/notes')` instead of
`fetch('/api/notes')`), so Vite answered with the HTML page. Check the URL in the
browser's **Network** tab.

### I get 401 from my loader

You're not signed in, or the request didn't go through the proxy. Use relative
URLs (`/api/...`), never `http://localhost:3000/...`. See the
[auth FAQ](../../auth/en/04-recipes-and-faq.md#i-signed-in-but-every-request-returns-401).

### The filter changes the URL but not the list

The loader doesn't know about the search param. Add it to `loaderDeps` and read
it from `deps`.

### `useLoaderData` is `undefined`

The loader didn't `return` anything. Check that the last line is `return data`.

### The loading screen never appears

Loads faster than 200 ms don't show it, by design. To see it while testing,
open the browser's DevTools → Network → set throttling to *Slow 4G*.

### Can I use `useEffect` to fetch?

It works, but then you handle loading, errors and refreshing yourself. Use a
loader for page data. `useEffect` is fine for things that aren't page data.
