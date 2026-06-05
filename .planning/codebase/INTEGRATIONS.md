# External Integrations

**Analysis Date:** 2026-06-05

## APIs & External Services

**External APIs:**
- GitHub Raw Content - Read-only shared recipe/ingredient sync from checked-in files on the `main` branch.
  - Integration method: Browser `fetch` to `https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/shared-manifest.json` and `https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/shared-data.json` (`src/Hooks/useSharedDataSync.ts`, `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Routing/MasterPage.tsx`).
  - Auth: None for raw reads.
  - Data used: `docs/shared-manifest.json` for version/change detection and `docs/shared-data.json` for ingredient/dish payloads.
  - Behavior: Requests append `?t=${Date.now()}` to bypass browser/cache freshness; sync checks are throttled to once per day with `shared_last_checked` in localStorage (`src/Hooks/useSharedDataSync.ts`).
  - Tests: E2E fixtures stub `https://raw.githubusercontent.com/**` to isolate tests from the live network (`tests/e2e/fixtures/seedApp.ts`).
- GitHub Contents API - Admin-only publishing of shared app data back into this repository.
  - Integration method: Browser `fetch` to `https://api.github.com/repos/quantran-epi/my-recipes/contents/{path}` using `GET` for SHA/content and `PUT` for writes (`src/Hooks/useSharedPublish.ts`).
  - Auth: `Authorization: Bearer ${token}` where token comes from source env key `REACT_APP_GH_TOKEN`, decoded in the client (`src/Hooks/useSharedPublish.ts`).
  - Endpoints used: Repository Contents API for `docs/shared-data.json` and `docs/shared-manifest.json` (`src/Hooks/useSharedPublish.ts`).
  - Data written: Shared ingredients and dishes plus manifest version stamps and item-level change lists.
  - Configuration note: `.env` key listing contains `REACT_APP_GITHUB_TOKEN`, while the source reads `REACT_APP_GH_TOKEN`; values were not read.
- GitHub Gist API - Personal backup and restore for per-device data.
  - Integration method: Browser `fetch` to `https://api.github.com/gists/${gistId}` using `GET` for restore and `PATCH` for backup (`src/Hooks/useGistBackup.ts`).
  - Auth: User-provided GitHub Personal Access Token stored in localStorage key `personal_gist_token`; Gist ID stored in `personal_gist_id` (`src/Hooks/useGistBackup.ts`, `src/Components/GistBackupWidget.tsx`, `HUONG_DAN.md`).
  - Scope: User guide documents required PAT scope `gist` (`HUONG_DAN.md`).
  - File used: `my-recipes-personal.json` inside the configured Gist (`src/Hooks/useGistBackup.ts`).
  - Data backed up: localStorage key `persist:personal` only; shared data is intentionally excluded (`src/Hooks/useGistBackup.ts`).
- Google Fonts - Hosted font stylesheet for Kanit.
  - Integration method: `<link rel="preconnect">` to `fonts.googleapis.com` and `fonts.gstatic.com`, plus stylesheet import from `fonts.googleapis.com` (`public/index.html`).
  - Auth: None.
  - Runtime effect: Font rendering depends on Google Fonts availability unless cached.

**Payment Processing:**
- None detected. No Stripe, payment SDKs, payment endpoints, or webhook handlers were found in `package.json`, `src/`, or repo config files.

**Email/SMS:**
- None detected. No email/SMS provider SDKs, SMTP config, or messaging webhook handlers were found in `package.json`, `src/`, or repo config files.

## Data Storage

**Databases:**
- None detected. The app does not include a server-side database client, ORM, migrations, database URL usage, or backend API layer in the scanned repo files.

**Browser Storage:**
- localStorage via Redux Persist - Primary application persistence.
  - Client: `redux-persist/lib/storage` with persisted root slices `persist:shared` and `persist:personal` (`src/Store/Store.ts`).
  - Shared slice: Ingredients and dishes (`src/Store/Store.ts`).
  - Personal slice: App context, inventory, shopping lists, scheduled meals, and cooking sessions (`src/Store/Store.ts`).
  - User docs: `HUONG_DAN.md` documents `persist:shared`, `persist:personal`, `personal_gist_id`, and `personal_gist_token` localStorage keys.
- localStorage direct keys - Feature-level metadata and credentials.
  - Admin unlock state: `app_admin_unlocked` (`src/Hooks/useAdminMode.ts`).
  - Shared sync metadata: `shared_last_checked`, `shared_synced_versions`, `shared_last_publish_at` (`src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`).
  - Personal Gist metadata: `personal_gist_id`, `personal_gist_token`, `personal_last_backup_at` (`src/Hooks/useGistBackup.ts`).
  - Global search recents: Source uses localStorage in `src/Modules/Home/Screens/GlobalSearch.screen.tsx`.
  - Manual import/export: `persist:personal` is read and overwritten by the data backup UI (`src/Routing/MasterPage.tsx`).
- Cache Storage / Service Worker cache - Workbox precache plus runtime PNG cache.
  - Client: Workbox service worker (`src/service-worker.ts`).
  - Cache behavior: App shell fallback to `index.html`; same-origin `.png` files cached with `StaleWhileRevalidate`, cache name `images`, max 50 entries (`src/service-worker.ts`).
  - Test cleanup: E2E seed clears service worker registrations and caches before tests (`tests/e2e/fixtures/seedApp.ts`).

**File Storage:**
- GitHub repository files - Shared public app data is stored as `docs/shared-data.json` and `docs/shared-manifest.json`, read through raw GitHub and written through the GitHub Contents API (`src/Hooks/useSharedDataSync.ts`, `src/Hooks/useSharedPublish.ts`, `src/Components/AppInitializer/SharedSyncModal.tsx`).
- GitHub Gist file - Personal data backup is stored as `my-recipes-personal.json` in a user-provided Gist (`src/Hooks/useGistBackup.ts`).
- Legacy personal backup file - `docs/data.txt` is fetched as base64-encoded `persist:personal` by the fallback cloud import path (`src/Routing/MasterPage.tsx`).

**Caching:**
- Browser/service worker only; no Redis, Memcached, CDN config, or server-side cache integration was detected.

## Authentication & Identity

**Auth Provider:**
- None detected. There is no external login provider, user account system, OAuth sign-in flow, JWT handling, or server-side session layer in the scanned source.

**Admin Gate:**
- Client-side admin PIN - Enables admin actions in the app UI.
  - Implementation: `useAdminMode` compares user input to a decoded source env value from `REACT_APP_ADMIN_PIN` and persists unlock state in localStorage key `app_admin_unlocked` (`src/Hooks/useAdminMode.ts`, `src/Routing/MasterPage.tsx`).
  - Boundary: This is a client-side feature gate, not a backend authorization mechanism.

**OAuth Integrations:**
- None for app sign-in. GitHub PATs are manually supplied for API access; the app does not implement OAuth redirect flows.

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, Datadog, LogRocket, Rollbar, or similar SDK is declared in `package.json` or imported in `src/`.

**Analytics:**
- No analytics sink is currently wired.
  - `web-vitals` is installed and `reportWebVitals()` is called without a handler, so metrics are not sent anywhere by default (`package.json`, `src/reportWebVitals.ts`, `src/index.tsx`).
  - `workbox-google-analytics` is listed in `package.json`, but no import or runtime registration was detected in `src/service-worker.ts`.

**Logs:**
- Browser console only for service worker registration errors and CRA comments; no centralized log integration was detected (`src/serviceWorkerRegistration.ts`).

## CI/CD & Deployment

**Hosting:**
- Static hosting is inferred from checked-in production assets under `docs/` (`docs/index.html`, `docs/static/`, `docs/service-worker.js`, `docs/asset-manifest.json`).
- No explicit hosting config was detected for Vercel, Netlify, Firebase, Docker, or another deployment provider.
- The app uses `PUBLIC_URL` in CRA shell/service-worker paths (`public/index.html`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`). `.env` key listing includes `PUBLIC_URL`; values were not read.

**CI Pipeline:**
- None detected. No `.github/workflows`, GitLab CI, CircleCI, or other repo-level CI config files were found outside `node_modules`.

## Environment Configuration

**Development:**
- Source-detected env vars: `REACT_APP_GH_TOKEN`, `REACT_APP_ADMIN_PIN`, `PUBLIC_URL`, `NODE_ENV`, `PERF_BASELINE` (`src/Hooks/useSharedPublish.ts`, `src/Hooks/useAdminMode.ts`, `src/serviceWorkerRegistration.ts`, `src/service-worker.ts`, `src/Store/Store.ts`, `tests/e2e/performance-baseline.spec.ts`).
- `.env` key listing detected: `PORT`, `PUBLIC_URL`, `REACT_APP_GITHUB_TOKEN`. Values were not read.
- Secrets location: `.env` exists at repo root, but values were not inspected. User-entered Gist credentials are stored in browser localStorage, not env files (`src/Hooks/useGistBackup.ts`).
- Mock/stub services: E2E tests stub raw GitHub requests and seed localStorage directly (`tests/e2e/fixtures/seedApp.ts`).

**Staging:**
- No staging-specific environment, branch, dataset, or hosting configuration was detected.

**Production:**
- Secrets/config are client-exposed when provided through CRA `REACT_APP_*` variables. The admin publish token is read in browser code as `REACT_APP_GH_TOKEN` (`src/Hooks/useSharedPublish.ts`).
- GitHub shared data paths are hard-coded to repo owner `quantran-epi`, repo `my-recipes`, branch ref `main`, and files in `docs/` (`src/Hooks/useSharedPublish.ts`, `src/Hooks/useSharedDataSync.ts`, `src/Components/AppInitializer/SharedSyncModal.tsx`, `src/Routing/MasterPage.tsx`).
- No failover, redundancy, backend secret manager, or production monitoring integration was detected.

## Webhooks & Callbacks

**Incoming:**
- None detected. The codebase is a static browser app with no server routes or webhook handlers.

**Outgoing:**
- GitHub Contents API writes are outgoing browser requests triggered by admin publish actions (`src/Hooks/useSharedPublish.ts`, `src/Routing/MasterPage.tsx`).
- GitHub Gist `PATCH` writes are outgoing browser requests triggered by personal backup actions (`src/Hooks/useGistBackup.ts`, `src/Components/GistBackupWidget.tsx`).

---

*Integration audit: 2026-06-05*
*Update when adding/removing external services, storage locations, deployment config, or env keys*
