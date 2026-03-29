# LMS Backend (AAFT Assignment)

Backend API for an enterprise-style LMS. Handles users, courses, enrollments, quizzes, grades, certificates, and some admin reporting. **No frontend here** — it's API only. Roles are **Admin**, **Instructor**, and **Student** (JWT + guards, nothing fancy).

## Tech stack

- Node.js (see `engines` in package.json — use a recent LTS)
- NestJS
- PostgreSQL
- Prisma
- JWT auth (short-lived access token + refresh token stored in DB)

## Features (high level)

- Auth: login/register, JWT access token, refresh + logout
- RBAC: Admin / Instructor / Student on routes
- Courses: hierarchy (sections → subsections → units), publish flow
- Course runs: scheduling-ish metadata, cloning
- Enrollments: self-enroll, bulk, soft unenroll
- Quizzes + attempts, grading config, weighted scores
- Certificates when a student passes (verification by code)
- Admin reports (progress, completions, time spent — paginated, pretty basic)

## Project structure

Most stuff lives under `src/modules/`. Each domain is usually:

- `*.controller.ts` — HTTP routes
- `*.service.ts` — business logic
- `*.repository.ts` — Prisma calls (where we bothered to split it out)

There's also `src/modules/auth` for JWT guards, `prisma/` for schema + migrations. Kept it simple for now — not every module is perfectly symmetrical.

## Setup

1. Clone the repo (or copy the `backend` folder however you got it).
2. `cd backend && npm install`
3. Copy `.env.example` to `.env` and fill in values (see below).
4. Apply DB schema:  
   `npx prisma migrate deploy`  
   (or `npx prisma migrate dev` when you're iterating locally)
5. Run the server:  
   `npm run start:dev`  
   Default port is **3000** unless you set `PORT`.

If `migrate` complains, check Postgres is running and `DATABASE_URL` is correct.

## Environment variables

Rough list — not every line is deeply documented, adjust as needed:

```
DATABASE_URL=          # postgres connection string
JWT_SECRET=            # signing access tokens
REFRESH_TOKEN_SECRET=  # optional / reserved — refresh tokens are hashed in DB right now, not JWT-signed; you can ignore or use later
JWT_ACCESS_EXPIRES=    # e.g. 15m (optional, has a default in code)
PORT=                  # optional, defaults 3000
```

## API docs

Swagger is wired up. When the app is running, open:

**`/api/docs`**

Use **Authorize** with a Bearer token from `POST /auth/login` (access token, not refresh). Some routes are public (auth, certificate verify) — the rest expect JWT.

## Notes / assumptions (read this)

- **Payments**: "paid" enrollment is mostly a flag / label — no real payment gateway.
- **Validation**: class-validator + a global pipe; can be strict on unknown fields — if something 400s, check body/query shape.
- **Performance**: fine for demo/small load; some list endpoints and grade recalcs could be optimized later.
- **Certificates**: created synchronously in the request path — no queue, no PDF pipeline yet.
- **Refresh tokens**: stored hashed in Postgres — Redis or rotation would be a next step if this ever went serious.

## Future improvements (wishlist)

- Redis for sessions / rate limits / caching (throttler is basic today)
- Background jobs for certificates + heavy reports
- Better errors (consistent codes, less generic messages)
- Query tuning + indexes where we actually measure pain
- Real payment integration if "paid" ever means money

---

This README will drift from the code a bit over time — that's normal. PRs welcome if you fix something and want to update a line or two.
