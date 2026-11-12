import { createFileRoute, Link } from '@tanstack/react-router'
import { PageBody, PageHeader } from '@/components/page-header'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { ROLE_LABELS, ROLES } from '@/lib/roles'

export const Route = createFileRoute('/dashboard/')({
  loader: async () => {
    const response = await fetch('/api/notes/stats')
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: Dashboard,
})

function Dashboard() {
  const stats = Route.useLoaderData()
  const { data: session } = authClient.useSession()
  const user = session?.user
  const isManager = user?.role === ROLES.MANAGER

  const cards = [
    { label: 'Open', value: stats.open, status: 'open' },
    { label: 'Done', value: stats.done, status: 'done' },
    { label: 'Archived', value: stats.archived, status: 'archived' },
    { label: 'Total', value: stats.total },
  ]

  return (
    <>
      <PageHeader title="Dashboard" />
      <PageBody>
        <div>
          <h2 className="text-2xl font-semibold">Hello, {user?.name}</h2>
          <p className="text-muted-foreground">
            You are signed in as a {ROLE_LABELS[user?.role] ?? user?.role}.{' '}
            {isManager
              ? 'You can see every note and manage users.'
              : 'You can see and manage your own notes.'}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              to="/dashboard/notes"
              search={{ status: card.status }}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardDescription>{card.label} notes</CardDescription>
                  <CardTitle className="text-3xl tabular-nums">
                    {card.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </PageBody>
    </>
  )
}
