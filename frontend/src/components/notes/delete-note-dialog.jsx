import { useRouter } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
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

// The "Delete" button on a note card, with a confirmation dialog.
export function DeleteNoteDialog({ note, className }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function deleteNote() {
    setIsPending(true)
    const response = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
    setIsPending(false)

    if (!response.ok) {
      const { message } = await response.json()
      toast.error(message)
      return
    }

    toast.success('Note deleted')
    setOpen(false)
    await router.invalidate()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" className={className} />
        }
      >
        <Trash2Icon /> Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{note.title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={deleteNote}
            disabled={isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
