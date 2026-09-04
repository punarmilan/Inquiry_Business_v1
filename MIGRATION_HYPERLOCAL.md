# Hyperlocal migration and rollout

This release retires the public job marketplace and introduces nearby business offers plus company-managed local services. It intentionally keeps the legacy `jobs`, job chat, ratings, and transaction collections intact for historical records; the consumer `/jobs` API now responds with `410 LEGACY_JOB_MARKETPLACE_RETIRED`.

## Deploy safely

1. Take a MongoDB backup before deploying.
2. Deploy `mobile/backend` and `website/backend` together. Both services use the same MongoDB database and the new collections: `cities`, `businesses`, `offers`, `plans`, `subscriptions`, `payments`, `servicecategories`, `workers`, and `servicebookings`.
3. Run `npm run migrate:hyperlocal-indexes` in `mobile/backend` once. It only replaces the old global chat uniqueness index with partial job/booking indexes; it does not delete chats or jobs.
4. Start the admin backend and admin UI. Create at least one active city, enable Offers and/or Services deliberately, then configure service categories and subscription plans.
5. Create workers only from Admin → Workers. This creates an internal `worker` user account; public registration cannot create one.
6. Verify business payments only from Admin → Payments. Mobile creates a `pending_verification` order, but cannot mark a payment successful or activate a subscription.
7. Start the mobile backend and app. For a USB Android device, run `npm run start` in `mobile/frontend`; the start script enables ADB reverse for Metro `8081` and API `5000` when a device is connected.

## Required environment settings

- `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `OTP_PEPPER` must be production secrets.
- Set `CORS_ORIGIN` to the permitted mobile/admin origins.
- Configure `GOOGLE_MAPS_SERVER_API_KEY` only when using the Places server integration.
- Configure real payment-provider credentials/webhooks before replacing the current secure manual-verification workflow. Do not expose provider secrets in the mobile app.
- For Android maps, set `GOOGLE_MAPS_API_KEY_ANDROID` in `mobile/frontend/.env` before native build.

## Operational rules

- Public offer discovery uses MongoDB `$geoNear` with a maximum distance of 10,000 metres. Featured ranking happens only after the radius and city gates.
- City flags are independent: an active city may have Offers enabled, Services enabled, both, or neither.
- Offer status remains `pending_review` until staff approves it.
- Payment status is server/admin verified; client confirmation is blocked.
- Service assignment requires a verified, active, available worker in the same city and category.
