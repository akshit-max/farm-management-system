# Database Design

## Database Strategy
- PostgreSQL (via Neon)
- ORM: Prisma v6.0.0
- IDs: UUID strings for all primary keys
- Naming convention: `snake_case` table names
- Soft delete: Supported via `deleted_at`

## Phase 0 Models
- **Role**: `Owner`, `Manager`, `Accountant`, `Worker`
- **User**: Connects strictly to a single `Farm` via `farm_id` representing ownership/operation link.
- **Farm**: Has Many `Users`. Includes physical farm entities.
- **Settings**: Linked 1-to-1 with `Farm`.
- **AuditLog**: Activity tracking.

## Seeding Strategy
- Located in `prisma/seed.ts`.
- Automatically generates Base Roles.
- Automatically generates "Main Farm" and its Default Settings.
- Generates "admin@farmerp.com" Owner account associated with Main Farm.
- Passwords hashed via `bcryptjs`.
