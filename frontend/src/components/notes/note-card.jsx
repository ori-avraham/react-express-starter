import { CalendarIcon, UserIcon } from 'lucide-react'
import { ArchiveNoteDialog } from '@/components/notes/archive-note-dialog'
import { DeleteNoteDialog } from '@/components/notes/delete-note-dialog'
import { EditNoteDialog } from '@/components/notes/edit-note-dialog'
import { NoteStatusBadge } from '@/components/notes/note-status-badge'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDate } from '@/lib/format'

// One note in the grid, with its actions in the footer.
// Buttons are only hidden for convenience; the server checks every action.
export function NoteCard({ note, isManager = false }) {
  const isArchived = note.status === 'archived'

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{note.title}</CardTitle>
        <CardAction>
          <NoteStatusBadge status={note.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
          {note.content || 'No content'}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarIcon className="size-3.5" />
            Due {formatDate(note.dueDate)}
          </span>
          {isManager && (
            <span className="flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {note.owner?.name}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <EditNoteDialog note={note} />
        {isManager && !isArchived && <ArchiveNoteDialog note={note} />}
        <DeleteNoteDialog note={note} className="ml-auto" />
      </CardFooter>
    </Card>
  )
}
