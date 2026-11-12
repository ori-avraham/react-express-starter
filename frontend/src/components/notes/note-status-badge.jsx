import { Badge } from '@/components/ui/badge'

export const NOTE_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

const variants = {
  open: 'default',
  done: 'secondary',
  archived: 'outline',
}

export function NoteStatusBadge({ status }) {
  const label =
    NOTE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  return <Badge variant={variants[status]}>{label}</Badge>
}
