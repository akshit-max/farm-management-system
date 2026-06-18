# Development Log

## Phase 1 - Animal Operations
- Implemented AnimalCategory, StageDefinition, Room, AnimalBatch, Mortality, Vaccination.
- Implemented React Hook Form + Zod & TanStack tables for all pages.
- Added strict backend validations for Room Capacity and Allowed Stages.
- Automated batch quantity reduction on Mortality.
- Built full feature-based APIs for all CRUD endpoints.
- Updated Dashboard KPI cards to fetch live data from the database.



## Phase 0: Foundation
- Project initialized.
- Auth.js v5 setup.
- YNEX dashboard layout constructed.
- Next-PWA setup.

## Phase 0: Required Fixes
- Fixed Prisma 7 incompatibility by downgrading to Prisma 6 to strictly support `url = env("DATABASE_URL")` in `schema.prisma`.
- Connected `User` to `Farm` for Multi-Farm architecture via `farm_id`.
- Created `prisma/seed.ts` for dummy data and owner setup.
- Generated precise 192x192 and 512x512 PNG assets in `public/` for accurate PWA installability.
- Added `src/lib/rbac.ts` with Next-Auth session helpers for unified role validation.
- Validated Production Build for Service Worker generation.
