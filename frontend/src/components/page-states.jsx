import { useRouter } from '@tanstack/react-router'
import { CircleAlertIcon, InboxIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// Shown automatically while a route's loader is fetching data
// (set as defaultPendingComponent in main.jsx).
export function PagePending() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

// Shown automatically when a route's loader throws
// (set as defaultErrorComponent in main.jsx).
export function PageError({ error }) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <CircleAlertIcon className="size-10 text-destructive" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error?.message || 'Unknown error'}
      </p>
      <Button variant="outline" onClick={() => router.invalidate()}>
        Try again
      </Button>
    </div>
  )
}

// Use when a list has no items.
//
//   {notes.length === 0 && <EmptyState title="No notes yet" />}
export function EmptyState({ title, description, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
      <InboxIcon className="size-10 text-muted-foreground" />
      <h3 className="font-medium">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  )
}
