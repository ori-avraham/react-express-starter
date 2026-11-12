import { redirect } from '@tanstack/react-router'
import { toast } from 'sonner'

// Use in a route's beforeLoad to allow only some roles to open a page.
// The /dashboard layout puts the session in the route context, so this works
// for any page under /dashboard:
//
//   export const Route = createFileRoute('/dashboard/users')({
//     beforeLoad: requireRole(ROLES.MANAGER),
//     component: UsersPage,
//   })
//
// This only hides pages. The real protection is requireRole() on the server.
export function requireRole(...roles) {
  return ({ context }) => {
    if (!roles.includes(context.session.user.role)) {
      toast.error('You do not have permission to open that page.')
      throw redirect({ to: '/dashboard' })
    }
  }
}
