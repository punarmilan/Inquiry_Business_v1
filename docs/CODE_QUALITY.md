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
