import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  basePath: '/api/auth',
  plugins: [adminClient()],
})

export { apiBaseUrl }
