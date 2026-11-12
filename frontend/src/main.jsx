import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { PageError, PagePending } from '@/components/page-states'
import { APP_NAME } from '@/lib/config'
import { routeTree } from './routeTree.gen'

document.title = APP_NAME

const router = createRouter({
  routeTree,
  // Shown for any route whose loader is still running or has failed.
  defaultPendingComponent: PagePending,
  defaultErrorComponent: PageError,
  defaultPendingMs: 200,
})

const rootElement = document.getElementById('root')
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}
