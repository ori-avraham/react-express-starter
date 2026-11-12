import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { PageBody, PageHeader } from '@/components/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { authClient } from '@/lib/auth-client'
import { formatDate } from '@/lib/format'
import { requireRole } from '@/lib/guards'
import { ROLE_LABELS, ROLES } from '@/lib/roles'

const roleOptions = Object.values(ROLES).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}))

// User management uses Better Auth's admin plugin, so there is no Express
// route to write: the server only allows managers to call these endpoints.
export const Route = createFileRoute('/dashboard/users')({
  beforeLoad: requireRole(ROLES.MANAGER),
  loader: async () => {
    const { data, error } = await authClient.admin.listUsers({
      query: { limit: 100, sortBy: 'name' },
    })
    if (error) throw new Error(error.message)
    return data.users
  },
  component: UsersPage,
})

function UsersPage() {
  const users = Route.useLoaderData()
  const router = useRouter()
  const { data: session } = authClient.useSession()

  async function changeRole(userId, role) {
    const { error } = await authClient.admin.setRole({ userId, role })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Role updated')
    await router.invalidate()
  }

  return (
    <>
      <PageHeader title="Users" />
      <PageBody>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Select
                      items={roleOptions}
                      value={user.role}
                      onValueChange={(role) => changeRole(user.id, role)}
                      // Managers cannot demote themselves and lock themselves out.
                      disabled={user.id === session?.user.id}
                    >
                      <SelectTrigger className="w-32" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageBody>
    </>
  )
}
