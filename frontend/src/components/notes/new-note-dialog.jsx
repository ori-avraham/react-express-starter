import { useRouter } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { NoteForm } from '@/components/notes/note-form'
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

export function NewNoteDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function createNote(data) {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    // The form shows the server's { message, errors } body.
    if (!response.ok) return response.json()

    toast.success('Note created')
    setOpen(false)
    // Re-runs the page loader so the new note appears in the list.
    await router.invalidate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> New note
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
          <DialogDescription>New notes always start as open.</DialogDescription>
        </DialogHeader>
        <NoteForm onSubmit={createNote} submitLabel="Create note">
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
        </NoteForm>
      </DialogContent>
    </Dialog>
  )
}
