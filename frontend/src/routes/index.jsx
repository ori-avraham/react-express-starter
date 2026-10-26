import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiBaseUrl } from '@/lib/auth-client'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadHomeMessage = async () => {
      try {
        const response = await fetch(apiBaseUrl)

        if (!response.ok) {
          throw new Error(
            `Backend request failed with status ${response.status}`,
          )
        }

        const data = await response.json()
        setMessage(data.message)
      } catch (requestError) {
        setError(requestError.message)
      }
    }

    loadHomeMessage()
  }, [])

  return (
    <div className="p-2">
      <h3>
        {message || (error ? 'Unable to load backend message' : 'Loading...')}
      </h3>
      {error && <p>{error}</p>}
    </div>
  )
}
