# Root Cause Analysis: Offline Architecture Failure on Refresh

## The Problem
In the previous ERP/PWA project, the application correctly saved data to IndexedDB when offline. However, if the user refreshed the browser or closed/reopened the application while offline, the application displayed a "No Internet" error (the default browser offline dinosaur) and became unusable. The offline data was intact in IndexedDB, but the UI was inaccessible.

## The Root Cause
This is a classic failure of the **Service Worker (SW) Caching Strategy**, particularly prevalent in Modern App Routers (like Next.js) and SPA frameworks.

The failure occurs because of the following chain of events:

1. **Missing or Misconfigured Service Worker**: The browser relies on a Service Worker to intercept network requests. If there is no SW, or if the SW does not cache the initial HTML document (the "App Shell"), a hard refresh immediately attempts a standard HTTP GET request to the server.
2. **Network Error Blocks Execution**: Because the device is offline, this HTTP GET request fails at the network layer.
3. **No JS Execution**: Since the HTML document fails to load, the browser never downloads or executes the JavaScript bundle.
4. **IndexedDB is Unreachable**: IndexedDB is a client-side database accessed via JavaScript. If the JS environment never spins up (because the HTML page failed to load), the application can never read from IndexedDB to reconstruct the UI.

### Next.js App Router Specifics
In Next.js, traditional client-side routing caches pages temporarily in memory. However, a hard refresh clears this memory. Unless `next-pwa` (or a custom workbox implementation) is aggressively configured to cache the *exact route* (e.g., `/dashboard/expenses`) or fallback to a cached `offline.html` that contains the React application shell, the App Router will attempt to hit the server-side rendering (SSR) endpoint, failing instantly.

## The Solution (Phase 14A Architecture)

To guarantee the FMS Expenses Proof of Concept survives a refresh/restart while offline, we must implement:

1. **Robust IndexedDB Schema (Dexie)**: To persistently store offline expenses and a `sync_queue`.
2. **Network Detection & Sync Processor**: To detect when `navigator.onLine` changes and process the queue.
3. **Offline App Shell Caching (The Missing Link)**: We must ensure that the route is cached. We will configure basic Next.js PWA service worker so that the browser does not display the Dinosaur error on hard refresh.

## Implementation Plan

1. Install `dexie`, `dexie-react-hooks`, and `@ducanh2912/next-pwa` (or similar next-pwa wrapper compatible with app router).
2. Create `src/lib/offline/db.ts` to initialize Dexie with `offline_expenses` and `sync_queue`.
3. Create `src/lib/offline/sync.ts` for the sync processor.
4. Update `src/app/dashboard/expenses/page.tsx` to use the offline DB when `!navigator.onLine`.
5. Add an Offline Status Widget.
