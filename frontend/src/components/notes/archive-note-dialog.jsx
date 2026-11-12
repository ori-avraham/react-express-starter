import { useRouter } from '@tanstack/react-router'
import { ArchiveIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

// The "Archive" button on a note card, with a confirmation dialog.
// Only shown to managers; the server checks the role again.
export function ArchiveNoteDialog({ note }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function archiveNote() {
    setIsPending(true)
    const response = await fetch(`/api/notes/${note.id}/archive`, {
      method: 'PATCH',
    })
    setIsPending(false)

    if (!response.ok) {
      const { message } = await response.json()
      toast.error(message)
      return
    }

    toast.success('Note archived')
    setOpen(false)
    await router.invalidate()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <ArchiveIcon /> Archive
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive "{note.title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Archived notes become read-only. They can still be viewed and
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={archiveNote} disabled={isPending}>
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
