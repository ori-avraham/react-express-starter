import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Requests go to /api/auth on the Vite server, which forwards them to the
// backend (see vite.config.js).
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
  plugins: [adminClient()],
})
