import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const RootLayout = () => (
  <TooltipProvider>
    <Outlet />
    {/* Shows toast.success(...) / toast.error(...) messages. */}
    <Toaster richColors position="top-center" />
  </TooltipProvider>
)

export const Route = createRootRoute({ component: RootLayout })
