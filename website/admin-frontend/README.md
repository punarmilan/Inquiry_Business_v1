# React + TypeScript + Vite

## Docker build

Run from the repository root:

```sh
docker build -f website/admin-frontend/Dockerfile -t inquiryexperts-admin-frontend .
```

The admin editor imports shared mobile types, utilities, and artwork. Its Dockerfile uses the repository root context and a dedicated `Dockerfile.dockerignore` to include those dependencies while excluding local environment files and installed packages.

## Provider Excel import

On `/workers`, use **Upload Excel** to import an `.xlsx` file, or **Download template** for a blank workbook with these columns:

`Provider Name | Phone | WhatsApp | City / Location | Service Categories | Service Areas`

Provider Name, Phone, City / Location, and Service Categories are required. WhatsApp and Service Areas may be blank. The importer uses the **Import Providers** worksheet when present, otherwise the first worksheet. Multiple categories/areas may be separated with commas, semicolons, or line breaks.

Missing cities are created automatically with verified coordinates and state from the existing Google Places integration. Set `GOOGLE_MAPS_SERVER_API_KEY` on the website backend (Compose uses the same deployment key as the mobile API). New cities have services enabled, a 10 km service radius, and offers disabled. An existing disabled city is kept disabled; enable it in Cities before importing. Unknown/ambiguous locations produce row errors rather than guessed coordinates; use `City, State` to disambiguate.

Service Areas from valid new-provider rows are added to the city's area list, without duplicate case variants or replacing existing areas/images. Each city supports up to 500 areas. Categories must already be active and available in the chosen city; category slugs are also accepted. Phone numbers are normalized, with `+91` assumed for 10-digit numbers. Existing phone numbers are skipped before any location creation, without changing provider records. Valid rows are added even when other rows have errors; results include the original Excel row numbers and counts of created cities/areas. Re-uploading a corrected file skips providers already added.

Limits: one `.xlsx` file, 25 MB, 10,000 nonblank provider rows. Older `.xls` workbooks must be saved as `.xlsx` first. Both upload and template download require an authenticated admin session.

## Local route checks

With the admin dev server running, use `npm run check:routes` to verify every lazy page and its dependency imports over HTTP. Set `ADMIN_DEV_URL` if the server uses a different URL.

Vite middleware-mode component/SSR checks use a separate cache under `node_modules/.vite-checks/<process-id>`. Keep those checks in middleware mode so they cannot overwrite the live server's optimized dependencies.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
