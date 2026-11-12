import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboardIcon,
  NotebookPenIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { APP_NAME } from '@/lib/config'
import { ROLES } from '@/lib/roles'

// The sidebar links. Add one entry per page.
// `roles` is optional: when set, only users with one of those roles see it.
const navItems = [
  { title: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Notes', to: '/dashboard/notes', icon: NotebookPenIcon },
  {
    title: 'Users',
    to: '/dashboard/users',
    icon: UsersIcon,
    roles: [ROLES.MANAGER],
  },
]

export function AppSidebar({ user, onSignOut, ...props }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  )

  function isActive(to) {
    if (to === '/dashboard') return pathname === '/dashboard'
    return pathname === to || pathname.startsWith(`${to}/`)
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link to="/dashboard" />}
            >
              <SparklesIcon className="size-5!" />
              <span className="text-base font-semibold">{APP_NAME}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive(item.to)}
                    render={<Link to={item.to} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
}
