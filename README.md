# Caller Intelligence Platform

A privacy-first caller intelligence, spam reputation, reverse lookup, and verified business identity platform.

## Architecture
- `apps/web` — public web app
- `apps/admin` — moderation/admin console
- `apps/api` — API service
- `apps/android` — Android caller-ID client placeholder
- `apps/ios` — iOS caller-ID client placeholder
- `packages/database` — Prisma schema/client
- `packages/phone` — E.164 normalization/validation
- `packages/reputation` — deterministic reputation engine
- `packages/shared` — shared types/config
- `services/reputation-worker` — async reputation processing placeholder
- `docs` — architecture, API, security, roadmap

## Quick start
1. `cp .env.example .env`
2. `pnpm install`
3. `pnpm db:generate`
4. `pnpm db:migrate`
5. `pnpm dev`

See `docs/PROJECT-TODO.md` for the implementation backlog.
