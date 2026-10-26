import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Button } from '@/components/ui/button'

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-2">
      <Button variant="link" nativeButton={false} render={<Link to="/" />}>
        Home
      </Button>
      <Button variant="link" nativeButton={false} render={<Link to="/about" />}>
        About
      </Button>
    </div>
    <hr />
    <Outlet />
    <TanStackRouterDevtools />
  </>
)

export const Route = createRootRoute({ component: RootLayout })
