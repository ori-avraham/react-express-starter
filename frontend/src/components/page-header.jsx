import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

// The bar at the top of every dashboard page.
//
//   <PageHeader title="Notes">
//     <Button>New note</Button>   <- optional actions on the right
//   </PageHeader>
export function PageHeader({ title, children }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>
    </header>
  )
}

// Wraps the content below the header with consistent spacing.
export function PageBody({ children }) {
  return <div className="flex flex-col gap-6 p-4 lg:p-6">{children}</div>
}
