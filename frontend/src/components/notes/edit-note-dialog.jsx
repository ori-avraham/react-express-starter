import { useRouter } from '@tanstack/react-router'
import { EyeIcon, PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { NoteForm } from '@/components/notes/note-form'
import { NoteStatusBadge } from '@/components/notes/note-status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatDate, toDateInputValue } from '@/lib/format'

// The "Edit" button on a note card, and the dialog it opens.
// Archived notes open read-only, so the button says "View".
export function EditNoteDialog({ note }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isArchived = note.status === 'archived'

  async function saveNote(data) {
    const response = await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    // The form shows the server's { message, errors } body.
    if (!response.ok) return response.json()

    toast.success('Note saved')
    setOpen(false)
    await router.invalidate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {isArchived ? <EyeIcon /> : <PencilIcon />}
        {isArchived ? 'View' : 'Edit'}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isArchived ? 'View note' : 'Edit note'}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <NoteStatusBadge status={note.status} />
            <span>By {note.owner?.name}</span>
            <span>· Created {formatDate(note.createdAt)}</span>
          </DialogDescription>
        </DialogHeader>
        {isArchived && (
          <p className="text-sm text-muted-foreground">
            Archived notes are read-only.
          </p>
        )}
        <NoteForm
          defaultValues={{
            title: note.title,
            content: note.content,
            dueDate: toDateInputValue(note.dueDate),
            status: isArchived ? 'open' : note.status,
          }}
          onSubmit={saveNote}
          submitLabel="Save changes"
          showStatus
          disabled={isArchived}
        >
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
        </NoteForm>
      </DialogContent>
    </Dialog>
  )
}
