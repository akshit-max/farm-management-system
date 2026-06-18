# Database Design

## Database Strategy
- PostgreSQL (via Neon)
- ORM: Prisma
- IDs: UUID strings for all primary keys
- Naming convention: `snake_case` table names and fields
- Deletions: Soft delete ONLY (`deleted_at` field)

## Standard Fields
All business tables contain:
- `id` (UUID)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `deleted_at` (DateTime?)
- `last_modified` (DateTime)
- `sync_status` (String: PENDING/SYNCED)

## Phase 0 Models
- **Role**: `Owner`, `Manager`, `Accountant`, `Worker`
- **Permission**: Granular access rights
- **User**: Name, Email, Password Hash, Role, Active Status
- **Farm**: Name, Description, Location, Active Status
- **Settings**: Theme, Currency, Date Format (linked to Farm)
- **AuditLog**: User, Action, Entity, Entity ID, Timestamp
