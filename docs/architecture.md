# Architecture

## Overview
Farm Management System Phase 0 - Foundation.
Built with Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui.
Backend relies on Next.js Route Handlers.
Database: PostgreSQL (Neon) accessed via Prisma ORM.

## Authentication
Auth.js v5 using Credentials Provider with JWT Session Strategy.
RBAC logic is implemented in middleware to protect `/dashboard` and `/settings` routes based on user role.

## Directory Structure
- `src/app`: Next.js App Router (pages, layouts, API routes)
- `src/components`: UI components (shadcn/ui, layout components)
- `src/features`: Domain specific modules (auth, dashboard, settings, farms, shared)
- `src/hooks`: Custom React hooks
- `src/lib`: Utility functions, Prisma client, Auth configuration
- `src/services`: External integrations and complex business logic
- `src/store`: State management
- `src/types`: TypeScript definitions

## PWA
Utilizes `next-pwa` for installability. Offline synchronization engine is deferred to a future phase.
