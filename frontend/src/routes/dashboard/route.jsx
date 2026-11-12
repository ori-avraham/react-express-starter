import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'

// Layout for every page under /dashboard: only signed-in users get in.
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) throw redirect({ to: '/signin' })
    // Whatever is returned here is available to child routes as `context`,
    // e.g. requireRole() in lib/guards.js reads context.session.
    return { session }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut()
    await navigate({ to: '/signin' })
  }

  if (!session) return null

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 72)',
        '--header-height': 'calc(var(--spacing) * 12)',
      }}
    >
      <AppSidebar user={session.user} onSignOut={handleSignOut} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
