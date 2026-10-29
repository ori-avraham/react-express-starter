import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '@/components/signup-form'

export const Route = createFileRoute('/signup')({
  component: () => <main className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6 md:p-10"><div className="w-full max-w-sm"><SignupForm /></div></main>,
})
