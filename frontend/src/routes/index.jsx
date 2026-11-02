import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: Index,
})

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
          Northstar
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
      <section className="mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-28">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Personal momentum, made simple
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.04em] md:text-7xl">
            Make space for your <span className="text-primary">best work.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
            Northstar brings your priorities, focus time, and progress into one
            calm workspace built for forward motion.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link to="/signup" />}
            >
              Start for free <ArrowRight />
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
          <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              Set up in 2 minutes
            </span>
          </div>
        </div>
        <div className="relative rounded-3xl border border-border bg-muted/50 p-4 shadow-2xl shadow-primary/10">
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Overview
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Your week at a glance
                </h2>
              </div>
              <div className="size-2 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ['Focus score', '82'],
                ['Completed', '18'],
                ['Deep work', '12.5h'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/70 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-border p-4">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-medium">Weekly focus</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
              <div className="flex h-28 items-end gap-2">
                {[42, 65, 50, 85, 70, 25, 18].map((height, index) => (
                  <div
                    key={`bar-${height}`}
                    className={`flex-1 rounded-t-md ${index === 3 ? 'bg-primary' : 'bg-primary/15'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
