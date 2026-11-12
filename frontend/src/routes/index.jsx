import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/config'

export const Route = createFileRoute('/')({
  component: Index,
})

// The public landing page. Replace the texts with your project's story.
function Index() {
  return (
    <main className="min-h-svh bg-background">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link to="/signin" />}
          >
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link to="/signup" />}>
            Get started <ArrowRight />
          </Button>
        </div>
      </nav>
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-24 text-center">
        <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
          One sentence about the problem you solve.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Who uses {APP_NAME}, what they can do with it, and why it is better
          than what they do today.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link to="/signup" />}>
            Create an account <ArrowRight />
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link to="/signin" />}
          >
            I already have an account
          </Button>
        </div>
      </section>
    </main>
  )
}
