import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';

/** Shared protection for leaving an editor through sidebar, menu or browser Back. */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  useEffect(() => {
    if (!when) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [when]);
  return <ConfirmDialog open={blocker.state === 'blocked'}
    onOpenChange={open => { if (!open && blocker.state === 'blocked') blocker.reset(); }}
    title="Leave without saving?" description="You have unsaved changes. Cancel to keep editing, or leave without saving to discard them."
    confirmLabel="Leave without saving" destructive
    onConfirm={() => { if (blocker.state === 'blocked') blocker.proceed(); }} />;
}
