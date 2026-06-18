# Architecture

## Overview
Farm Management System Phase 0 - Foundation.
Built with Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui styles.
Backend relies on Next.js Route Handlers and Prisma ORM.
Database: PostgreSQL (Neon).

## Authentication & RBAC
- Auth.js v5 using Credentials Provider.
- Role-Based Access Control (RBAC) relies on `src/lib/rbac.ts` utilities (`hasRole`, `isOwner`, `isManager`, `isAccountant`, `isWorker`).
- Session strategy is JWT, storing `role` and `id`.
- Middleware protects `/dashboard` and `/settings`.

## Directory Structure
- `src/app`: App router logic.
- `src/features`: Domain specific modules (auth, dashboard, shared).
- `src/lib`: Utilities (`db.ts`, `rbac.ts`).

## PWA
Utilizes `next-pwa`. Manifest and icons generated in `public/`. Application generates service workers and is completely installable as verified by Next.js builds.
