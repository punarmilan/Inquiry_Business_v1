import { ArrowClockwise, CloudArrowUp, FloppyDisk, GitFork, Plus, ShieldCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UIWorkspace } from '@/hooks/useUIWorkspace';
import { cn } from '@/lib/utils';
import { UnsavedChangesGuard } from '@/components/shared/UnsavedChangesGuard';

export function UIReleaseControls({ workspace: w, publicationDisabled = false, compact = false }: { workspace: UIWorkspace; publicationDisabled?: boolean; compact?: boolean }) {
  const isDirty = w.dirty;
  const draftLabel = w.draft ? `Draft version ${w.draft.draftVersion}` : 'New draft';
  const saveStatus = !w.ready ? 'Loading saved content' : isDirty ? 'Unsaved changes' : 'Draft saved';
  const publishedLabel = w.head ? `Live version ${w.head.generation}` : 'No published version';

  if (compact) return <div className="space-y-2">
    <UnsavedChangesGuard when={Boolean(w.hasUnsavedChanges)} />
    <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
      <span role="status" className="col-span-2 text-xs text-muted-foreground sm:mr-auto">{!w.ready ? 'Loading...' : w.busy ? 'Saving...' : w.hasUnsavedChanges ? 'Unsaved changes' : w.draft ? 'Draft saved' : 'Ready to edit'}{w.head && <span className="ml-2">{publishedLabel}</span>}</span>
      <Button type="button" variant="outline" disabled={w.busy || !w.ready || publicationDisabled} onClick={() => void w.save()}>Save draft</Button>
      <Button type="button" className="min-w-0 sm:min-w-36" disabled={w.busy || !w.ready || publicationDisabled} onClick={() => void w.publish('Update home cards and banners')}>{w.busy ? 'Please wait...' : 'Publish to app'}</Button>
    </div>
    {w.error && <p role="alert" className="max-w-2xl text-sm text-destructive">{w.error}</p>}
  </div>;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-5">
      <UnsavedChangesGuard when={Boolean(w.hasUnsavedChanges)} />
      {/* Draft Management & Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <details className="group">
          <summary className="cursor-pointer rounded-md py-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Draft options</summary>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            disabled={w.busy || !w.ready}
            onClick={w.newDraft}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-dashed"
          >
            {Plus && <Plus className="h-4 w-4" />}
            New draft from published
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Working draft</span>
            <select
              aria-label="Working draft"
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={w.busy || !w.ready}
              value={w.draft?._id || ''}
              onChange={(e) => void w.selectDraft(e.target.value)}
            >
              <option value="" disabled>Unsaved draft</option>
              {w.drafts.map((draft) => (
                <option key={draft._id} value={draft._id}>
                  {draft._id.slice(-8)} · v{draft.draftVersion}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            disabled={w.busy}
            onClick={() => void w.reload()}
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
          >
            {ArrowClockwise && <ArrowClockwise className={cn('h-4 w-4', w.busy && 'animate-spin')} />}
            Reload saved data
          </Button>
        </div>
          <p className="mt-2 max-w-lg text-xs text-muted-foreground">Starting a new draft, switching drafts or reloading replaces unsaved edits. Save your draft first to keep them.</p>
        </details>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold',
              isDirty
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', isDirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500')} />
            {saveStatus}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-1 font-medium text-muted-foreground">
            {GitFork && <GitFork className="h-3 w-3" />}
            {draftLabel}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
            {CloudArrowUp && <CloudArrowUp className="h-3 w-3" />}
            {publishedLabel}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Save draft keeps changes private. Publish to app makes them visible to customers. Draft options let you start a new draft or reload saved changes.
      </p>
      {w.config.kind === 'page' && w.config.key === 'offersHome' && <p className="text-xs text-muted-foreground">Publication includes the full home-screen draft: saved cards, banners and extra Dynamic UI sections. Both editors preserve each other’s content.</p>}

      {/* Error alert */}
      {w.error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <span className="font-bold">Error:</span>
          <span className="flex-1">{w.error}</span>
        </div>
      )}

      {/* Primary Release Action Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <Button
          type="button"
          disabled={w.busy || !w.ready || publicationDisabled}
          onClick={() => void w.save()}
          variant="outline"
          className="h-10 gap-2 rounded-xl font-medium"
        >
          {FloppyDisk && <FloppyDisk className="h-4 w-4" />}
          Save draft
        </Button>

        <Button
          type="button"
          disabled={w.busy || !w.ready || publicationDisabled}
          variant="outline"
          onClick={() => void w.validate()}
          className="h-10 gap-2 rounded-xl font-medium"
        >
          {ShieldCheck && <ShieldCheck className="h-4 w-4 text-primary" />}
          Validate
        </Button>

        <div className="flex-1 min-w-[260px]">
          <Input
            className="h-10 rounded-xl"
            aria-label="Publication or rollback reason"
            placeholder="Describe your changes (at least 3 characters)"
            value={w.reason}
            onChange={(e) => w.setReason(e.target.value)}
            disabled={w.busy}
            maxLength={500}
          />
        </div>

        <Button
          type="button"
          disabled={w.busy || !w.ready || publicationDisabled || w.reason.trim().length < 3}
          onClick={() => void w.publish()}
          className="h-10 gap-2 rounded-xl font-semibold"
        >
          {CloudArrowUp && <CloudArrowUp className="h-4 w-4" />}
          Publish to app
        </Button>
      </div>

      {/* Collapsible Release History & Rollback */}
      <details className="group border-t border-border/60 pt-4">
        <summary className="flex items-center justify-between cursor-pointer font-semibold text-sm text-foreground hover:text-primary transition-colors select-none py-1">
          <div className="flex items-center gap-2">
            {GitFork && <GitFork className="h-4 w-4 text-primary" />}
            <span>Release history and rollback</span>
          </div>
          <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
        </summary>

        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Rollback restores the entire selected release, including its page layouts and theme.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3 font-semibold">Generation</th>
                  <th className="p-3 font-semibold">Published</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold text-right">Restore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {w.releases.map((release) => {
                  const isCurrent = release._id === w.head?._id;

                  return (
                    <tr key={release._id} className={cn('hover:bg-muted/30 transition-colors', isCurrent && 'bg-primary/5')}>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-bold text-foreground">
                          Gen {release.generation}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(release.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="p-3 font-medium max-w-xs truncate">{release.reason}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={w.busy || isCurrent || w.reason.trim().length < 3}
                          onClick={() => void w.rollback(release._id)}
                          className="h-8 rounded-lg text-xs"
                        >
                          Restore generation {release.generation}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!w.releases.length && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nothing has been published.
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Page {w.historyPage} of {Math.max(1, w.historyPages)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={w.busy || w.historyPage <= 1}
                onClick={() => void w.history(w.historyPage - 1)}
                className="h-8 rounded-lg text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={w.busy || w.historyPage >= w.historyPages}
                onClick={() => void w.history(w.historyPage + 1)}
                className="h-8 rounded-lg text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
