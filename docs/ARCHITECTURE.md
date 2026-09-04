# InquiryExperts Architecture

This repository is a small service-oriented monorepo. The product has four deployable frontends/backends:

| Unit | Path | Responsibility | Public host |
| --- | --- | --- | --- |
| Mobile client | `mobile/frontend` | Customer and provider experience | Android/iOS |
| App API | `mobile/backend` | Customer, provider, booking and realtime APIs | `app_api.inquiry.business` |
| Public website | `website/frontend` | Marketing, service discovery and app acquisition | `inquiry.business` |
| Admin console | `website/admin-frontend` | Operations, moderation, finance and configuration | `admin.inquiry.business` |
| Website API | `website/backend` | Admin-authenticated dashboard and operations API | `web_api.inquiry.business` |

## Micro-structure rules

Each deployable unit follows the same direction of dependency:

```text
UI / route
  -> feature hook or controller
    -> API adapter / application service
      -> domain rules
        -> persistence or external provider
```

Rules:

1. Routes only compose middleware and handlers. Business decisions do not belong in route files.
2. Controllers translate HTTP input/output. They should call services and should not contain multi-step business workflows.
3. Services own use-cases and side effects. Models only describe persistence and indexes.
4. Validators are the boundary for untrusted input. Every write endpoint gets a validator.
5. Frontends keep server access in API adapters. Screens/pages compose feature hooks and present state.
6. A feature may import from `core`, `shared` and its own folder, but not another feature's internals.
7. Cross-service sharing happens through versioned API contracts, not direct imports from another deployable unit.

## Target feature layout

New work should use this shape. Existing files can move here feature-by-feature without a risky big-bang rewrite.

```text
mobile/frontend/src/features/<feature>/
  api.ts
  types.ts
  hooks/
  components/
  screens/

mobile/backend/src/modules/<feature>/
  <feature>.routes.js
  <feature>.controller.js
  <feature>.service.js
  <feature>.repository.js       # only when persistence needs isolation
  <feature>.validator.js
  <feature>.model.js

website/admin-frontend/src/features/<feature>/
  api.ts
  hooks/
  components/
  pages/
  types.ts

website/frontend/src/features/<feature>/
  components/
  pages/
  data.ts
  types.ts
```

The current `routes`, `controllers`, `services`, `models`, `screens`, `pages`, `api` and `hooks` folders are compatible with this target. They are kept in place during the transition to avoid breaking imports or deployed endpoints.

## Service boundaries

### App API

- `identity`: auth, profile, account type and KYC
- `marketplace`: offers, businesses, cities and categories
- `jobs`: jobs, applications, live location and chat
- `managed-services`: service providers, bookings, status and ratings
- `commerce`: plans, subscriptions, payments and wallet
- `platform`: settings, notifications, reports and AI assistant

### Website API

- `admin-identity`: admin login, refresh and access control
- `operations`: users, jobs, providers, bookings and moderation
- `catalog`: cities, categories, offers and templates
- `finance`: revenue, payments, payouts, wallet and pricing
- `platform`: reports, settings and dashboard analytics

These are logical modules today and deployable services only when traffic, team ownership or failure isolation justifies the operational cost.

## Performance rules

- Paginate every collection endpoint; do not return unbounded lists.
- Use `.lean()` for read-only Mongoose queries that do not need document methods.
- Select only fields required by the caller and add indexes for frequent filters/sorts.
- Keep query keys stable in React Query and invalidate only the affected feature key.
- Avoid request waterfalls: load independent dashboard cards in parallel.
- Keep image payloads out of JSON where possible; use object storage URLs for production media.
- Use one refresh-token request at a time per client and retry the original request once.
- Keep production secrets in deployment environment variables; never commit `.env` files.

## Safe migration order

1. Add or update the feature contract and validator.
2. Extract the service/use-case without changing the endpoint response.
3. Move the controller and route into the feature module.
4. Move the matching frontend API adapter, hook and UI pieces.
5. Add a focused test and run the repository quality gate.
6. Delete the old compatibility file only after all imports are migrated.
