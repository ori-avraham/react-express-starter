import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { NewNoteDialog } from '@/components/notes/new-note-dialog'
import { NoteCard } from '@/components/notes/note-card'
import { NOTE_STATUS_OPTIONS } from '@/components/notes/note-status-badge'
import { PageBody, PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/page-states'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authClient } from '@/lib/auth-client'
import { ROLES } from '@/lib/roles'

const filterOptions = [
  { value: 'all', label: 'All statuses' },
  ...NOTE_STATUS_OPTIONS,
]

export const Route = createFileRoute('/dashboard/notes/')({
  // The filter lives in the URL (/dashboard/notes?status=open), so it
  // survives a page refresh and can be shared as a link.
  validateSearch: z.object({
    status: z.enum(['open', 'done', 'archived']).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ status: search.status }),
  // The loader fetches the data before the page is shown. While it runs the
  // PagePending component is shown; if it throws, PageError is shown.
  loader: async ({ deps }) => {
    const url = deps.status ? `/api/notes?status=${deps.status}` : '/api/notes'
    const response = await fetch(url)
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: NotesPage,
})

function NotesPage() {
  const notes = Route.useLoaderData()
  const { status } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: session } = authClient.useSession()
  const isManager = session?.user.role === ROLES.MANAGER

  function changeFilter(value) {
    navigate({ search: { status: value === 'all' ? undefined : value } })
  }

  return (
    <>
      <PageHeader title="Notes">
        <NewNoteDialog />
      </PageHeader>
      <PageBody>
        <Select
          items={filterOptions}
          value={status ?? 'all'}
          onValueChange={changeFilter}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {notes.length === 0 ? (
          <EmptyState
            title="No notes found"
            description="Create your first note or change the filter."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} isManager={isManager} />
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
