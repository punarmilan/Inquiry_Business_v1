# Code Quality Guide

Run the full local gate from the repository root:

```powershell
npm run quality
```

The gate checks:

- tracked secret-like files are not present;
- every backend JavaScript file parses;
- mobile backend tests pass;
- mobile TypeScript type-checks;
- public website and admin console build successfully;
- admin lint rules pass.

## Release flow

Pushing to `main` or `master` runs the quality gate first and then pauses at the `production` environment approval. It does not publish images or restart the VPS until that approval is granted.

To release a tested commit:

1. Push the tested commit to `main` or `master`.
2. Open **Actions → CI/CD Pipeline - KaamSaathi**.
3. Wait for `Quality Gate` to pass.
4. Approve the `production` environment review when GitHub pauses the workflow.

An alternative is **Run workflow** with the `Confirm: build images and deploy to production VPS` checkbox enabled.

Configure at least one required reviewer under **Settings → Environments → production**. Without a required reviewer, the manual checkbox is still required but GitHub will not pause for a second approval.

## Review checklist

- Is the change inside one feature boundary?
- Is input validated at the HTTP boundary?
- Is the response shape backward compatible or versioned?
- Are loading, empty, error and retry states handled in the UI?
- Is the query paginated and limited?
- Are repeated network calls deduplicated?
- Are secrets, tokens and personal data excluded from logs?
- Is there a focused test for the changed business rule?

## Naming and ownership

- `api`: HTTP adapters only
- `hooks`: server-state orchestration only
- `components`: reusable presentation
- `screens`/`pages`: composition and navigation only
- `controllers`: HTTP translation only
- `services`: business use-cases and side effects
- `models`: persistence schema and indexes
- `utils`: pure, dependency-light helpers

Avoid adding a generic `helpers`, `misc`, or `common` folder for feature logic. Put code in the smallest meaningful feature boundary.
