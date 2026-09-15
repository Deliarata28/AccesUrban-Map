# AccesUrban Map — frontend

## Run

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. Sign in at `/conectare`:

- Name: **AccesUrban Map**
- Email: **accesurbanmap@gmail.com**
- Password: **accesurbanmap123**

Administrator sign-in opens `/admin`. Standard accounts are created at `/inregistrare` and cannot open administration.

## Implemented flows

- shadcn/ui (Radix) buttons, dialogs, cards, inputs, labels, textarea and badges; Tailwind v4 with the site's cream/blue palette. Existing pages keep their own CSS. No global Tailwind preflight is applied.
- TanStack Query provides catalog, reports and user queries, mutations and cache invalidation after local changes or changes in another tab.
- Admin overview: live totals, accessibility distribution, pending reports, recent changes and community accounts. No invented percentage growth metrics.
- Places: search, category/status filters, sorting, pagination, create/edit/delete, coordinates, source, verification, all seven tri-state facilities and automatic 0–100 scoring.
- Reports: type/search/status filters, uploaded photo review, approval, rejection reason and a permanent review timestamp. A decision cannot silently overwrite an already reviewed report.
- MapLibre GL JS: OSM street tiles, satellite tiles, colored markers, search, category/status/facility/minimum-score filters, place details, source/verification metadata and approved problems.
- Route planning: select endpoints from the catalog or click on the map; invert endpoints; keep the route panel open; close clears endpoints, route and main search. The browser location is never requested.
- Report submission with image validation/preview/removal, login requirement and `/rapoartele-mele` for the author's reports and moderator response.

## Mock data and production boundary

This is a **frontend demonstration**, not production authentication or verified navigation. All accounts, places, reports and photographs live in this browser's localStorage. There is no Gmail integration, real email delivery, .NET connection or shared database. Mock passwords exist in browser storage; use test credentials only. Client-side role checks support the demo and are not a security boundary.

Existing browser users/reports are preserved. The default catalog contains 19 named locations in Chișinău, with coordinates and addresses. Accessibility details remain marked as unconfirmed until they are checked in the field. A fresh browser/profile starts a separate dataset.

Location scores give points only to YES values, following the PDR weights. Unknown values remain visible as unknown; a location with no known facilities has unknown status, not confirmed reduced accessibility. The known-facility count is displayed with the score. Mock locations cannot be marked as field-verified.

Routes use the pedestrian OpenStreetMap routing service and draw the returned street geometry. Accessibility details are kept separate from the route geometry and remain unknown when the routing service does not provide field data. WHEELCHAIR excludes explicitly blocked segments when such data exists; WALKING_AID treats stairs as a penalty; VISUAL_IMPAIRMENT states when tactile/audio routing data is unavailable.

Approving a report makes the problem type visible on the place; it does not change its facilities automatically. The administrator edits confirmed accessibility data separately. Removing a place preserves its reports for audit/history.

## Backend integration still required

Replace the mock functions in `stores`/`hooks/useAppData.ts` with REST API calls. Enforce authentication and administrator authorization on the .NET server; use real user sessions and server password hashing. Replace browser photo data URLs with an upload API/storage service. Adapt the DTOs between frontend camelCase/Romanian feature keys and API fields as needed.

For production, replace the public routing request with `POST /api/v1/routes`. The server should call OSRM/Valhalla, validate segment data and return evaluated alternatives with real geometries. Frontend score calculations can remain previews in the admin form; the server must be authoritative. Import and verify real OSM/public/field-survey records before presenting accessibility as factual.

The backend, PostgreSQL/PostGIS, real data import, real routing and email-based password reset are outside this frontend. The privacy-policy page remains deferred as previously requested.

## Verification

```sh
npm test
npm run test:e2e
npm run build
```

Vitest covers score boundaries, unknown values, combined filters, mock permissions, place persistence, photos, moderation and routing constraints. Playwright exercises actual forms, admin CRUD, report/photo delivery and response, map search/filter/route clearing and mobile layout. Browser tests use isolated contexts and do not touch the user's normal browser data.

The Playwright configuration uses installed Chrome on Windows by default. Set `PLAYWRIGHT_CHROME_PATH` to the browser executable on other systems. Screenshots and traces are written to ignored `frontend/.artifacts`.

External map tiles still require an internet connection.
