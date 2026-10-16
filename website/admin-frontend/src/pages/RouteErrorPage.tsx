import { ArrowClockwise, House } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export const RouteErrorPage = () => (
  <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
    <section className="w-full max-w-md space-y-4" role="alert" aria-labelledby="route-error-title">
      <h1 id="route-error-title" className="text-2xl font-semibold">This page couldn't be loaded</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">Reload this page to try again, or return to the dashboard.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" className="min-h-11" onClick={() => window.location.reload()}>
          <ArrowClockwise aria-hidden="true" /> Reload page
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <a href="/"><House aria-hidden="true" /> Back to dashboard</a>
        </Button>
      </div>
    </section>
  </main>
);
