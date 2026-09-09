# InquiryExperts Backend

Node.js + Express + MongoDB API for the InquiryExperts mobile app and future admin panel.

## Setup

```powershell
cd mobile/backend
copy .env.example .env
npm install
npm run dev
```

MongoDB must be running and `MONGO_URI` must point to your database.

## Important Security Notes

- `POST /auth/send-otp` returns the OTP in the response only for dev mode.
- The TODO in `src/controllers/authController.js` marks where MSG91/Twilio should be plugged in later.
- Full Aadhaar numbers are not stored in the schema and are rejected by profile validation.
- Admin routes require a user document with `role: "admin"`.

## Main Routes

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /users/profile`
- `POST /users/profile`
- `PUT /users/profile`
- `POST /jobs`
- `GET /jobs`
- `GET /jobs/:id`
- `PUT /jobs/:id`
- `DELETE /jobs/:id`
- `POST /jobs/:id/apply`
- `POST /jobs/:id/applicants/:userId/accept`
- `POST /jobs/:id/applicants/:userId/reject`
- `POST /jobs/:id/complete`
- `GET /users/:id/rating`
- `POST /jobs/:id/rate`
- `GET /admin/users`
- `PUT /admin/users/:id/block`
- `PUT /admin/users/:id/unblock`
- `GET /admin/jobs`
- `DELETE /admin/jobs/:id`
- `GET /admin/stats`
