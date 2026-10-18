# Frontend program contract

This document describes the imperative system assembled by `src/program.ts` and
the boundary between it, the Web Elements, the existing application shell, and
the persistent API. The code in `program.ts` is the executable source of truth;
this guide documents its contracts and must be updated with any service, route,
event, permission, persistence, or calculation change.

## Ownership and execution

| Module | Owns | Must not own |
| --- | --- | --- |
| `src/models.ts` | Shared TypeScript domain and API data contracts | DOM, service calls, or canonical records |
| `src/components.ts` | Web Elements, DOM rendering, presentation helpers, UI-only atomic state, local generators | Fetching, durable entity storage, or silently fabricating API data |
| `src/program.ts` | Runtime configuration, authenticated API access, domain orchestration, route installation, service-backed catalogs, policy calculations, exports, and startup | View markup or a replacement for backend persistence |
| `src/main.ts` | Create/read the program iterator and start the selected app entry point | Domain or page implementation |
| Existing shell (`components/index.mjs`) | Host navigation, shell composition, route dispatch | Canonical category behavior once a TypeScript route is installed |

`program()` is a composition/lifecycle generator that creates one
application-scoped instance and yields its `SystemAPI`; it is not an application
state iterator. The shell calls route installers once per shell instance; their
listeners are scoped to the supplied host document and route renderers return the
corresponding custom element. The standalone entry point uses `start(root)` for
the history element. Do not construct a second program for the same document:
that would duplicate listeners and application state.

The composition generator currently yields the same frozen API on each `next()`
and remains alive indefinitely; calling `next()` again does not create a second
instance or reset state. `main.ts` consumes the first yield exactly once.
Components own interaction state and advance it only through their
component-local `state.next(...)` iterators;
the program owns service orchestration and the references below. The existing
shell's `appStore` bridge is a legacy navigation adapter, not component state or
a persistence mechanism.

The program owns exactly one state iterator: `routeStateProgram`. Its sole
responsibility is route identity (`view`, stage key/ID, broker ID, sale ID, and lot-profile ID);
it is not a general-purpose application-state store.
All navigation intents pass through `navigateRoute`; `appStore` mirrors that route
for the still-active legacy shell and is not another TypeScript state iterator.
Do not put page data, filters, loading flags, or mutation state in this iterator.
Those transient values belong to their Web Element and advance through the
element's `state.next(...)` interface. Element-local transitions do not create
another program-level state iterator. Program request counters and mounted-element
references are ordinary coordination variables, not additional state iterators.

### Program-instance state inventory

| Binding | Scope and owner | Why it exists / reset condition |
| --- | --- | --- |
| `runtime` | One `program()` instance; read-only view of host globals | Reads API origin and auth bridge for each request. Credentials are fetched per operation and are not retained. |
| `routeState` | The single `routeStateProgram()` iterator in `program()` | Route identity only (`view`, stage key/ID, broker ID, sale ID, lot-profile ID); advanced by `navigateRoute`, synchronized from shell route fields before navigation. Shell-only flags cannot overwrite its yielded route fields. |
| `machine.requestId` | Sales-history read sequence | Monotonic guard so an older sales/repasse response cannot overwrite a newer request. |
| `machine.lastError` | Last sales-history read error | Retained only to pass the current error to the active history element; cleared when a new read starts. |
| `salesHistory` | Current standalone history element, or `null` before mount | Prevents duplicate standalone mount and identifies the only element allowed to receive history responses/events. |
| `repassesElement`, `brokersElement`, `materialsElement`, `agendaElement`, `dashboardElement`, `activitiesElement`, `progressElement`, `cashRecordElement` | One active mounted element per route | Set on a valid `*-connected` event. Replaced when a new instance connects; event handlers and async completions reject stale element identity. |
| `repassesRequestId`, `brokersRequestId`, `materialsRequestId`, `agendaRequestId`, `dashboardRequestId`, `activitiesRequestId`, `progressRequestId` | Per-route read sequence | Incremented on every reload and compared before installing results; prevents stale asynchronous responses from replacing newer UI state. |
| `agendaEvents` | Last canonical agenda snapshot read from `/api/agenda-events` | Merge base for full-snapshot PUT save/delete. Replaced only after a current successful read; never treated as durable storage. |
| `selectedBrokerId` | Local to `installBrokersRoute` | Current broker directory/detail navigation selection, mirrored into URL and host navigation state; not a broker record. |

Route element state is not a second source of truth for entities: after a
successful mutation the program reloads server data. Request counters and
selected navigation are transient coordination state only. A route's connection
event must carry the concrete expected Web Element instance; arbitrary event
payloads cannot install a renderer or become the active mutation target.

`routeStateProgram()` has a deliberately small state machine: its `sync` message
replaces route identity from the current shell route before a navigation, and its
`navigate` message applies only a route patch. `navigateRoute()` then mirrors the
yielded route into legacy shell fields (`view`, stage, broker, and sale selection)
plus separately supplied shell-only flags. The mirror keeps existing navigation
working during migration; the route iterator remains the sole global iterator
and never stores page payloads.

Elements publish bubbling `atlas:*` custom events. `program.ts` validates that
the event originated from the currently mounted element before acting. Reads are
uncached and authenticated. Mutations call the matching API, then reload canonical
state; errors are sent to the element. There is no optimistic success path or
demo-data fallback. Request sequence counters prevent older responses from
overwriting newer user-visible state.

Authentication is supplied by the host bridge:

- `BELAVISTA_ADMIN_AUTH_READY` resolves when the host has restored/validated its session.
- `BELAVISTA_GET_ID_TOKEN()` supplies a short-lived bearer token per request.
- `BELAVISTA_ADMIN_AUTH_INVALIDATE()` is called on HTTP 401.
- `BELAVISTA_API_BASE` or `meta[name="belavista-api-base"]` configures deployed API origin.
- On localhost only, the GitHub-backed admin leads read uses the configured Worker
  origin from `BELAVISTA_API_BASE` or `meta[name="belavista-ai-base"]`; all other
  local operational routes remain same-origin. The request retains the user's
  bearer session and the Worker re-checks its role before returning PII.
- `BELAVISTA_CAPACITOR_NATIVE` selects the native runtime path and requires `BELAVISTA_API_BASE`.
- `localhost` and `127.0.0.1` use same-origin paths; ngrok preview paths preserve the forwarded port prefix.

Credentials are neither persisted nor logged by this module. Missing API
configuration, session, invalid payload shape, authorization, and service errors
remain visible as errors in the owning component.

## Routes, events, and persistence

| Category | Route installation | Element events consumed | Service contract |
| --- | --- | --- | --- |
| Sales history | `installSalesHistoryRoute` → `sales-history` | `atlas:history-connected`, `atlas:history-selection`, `atlas:history-save`, `atlas:history-file`, `atlas:navigate` | `GET /api/commercial-sales`, `GET /api/repasses`, `PUT /api/commercial-sales/:id`; attachment GET under the sale URL |
| Repasse | `installRepassesRoute` → `repasses` | `atlas:repasse-connected`, `atlas:repasse-refresh`, `atlas:repasse-mutation`, `atlas:repasse-export` | `GET /api/repasses`; entry, broker-rule, and payment-plan POST/PUT/DELETE routes under `/api/repasses` |
| Broker directory/detail | `installBrokersRoute` → `brokers`, `brokers-board`, `broker-detail` | `atlas:brokers-connected`, `atlas:brokers-refresh`, `atlas:brokers-export`, `atlas:broker-profile-save`, `atlas:broker-profile-delete`, `atlas:brokers-file`, `atlas:navigate` | `GET /api/repasses`, `GET /api/commercial-sales`, `GET /api/broker-profiles`; profile PUT/DELETE; sale-origin attachment GET |
| Materials | `installMaterialsRoute` → `materials` | `atlas:materials-connected`, `atlas:materials-refresh`, `atlas:material-save`, `atlas:material-delete`, `atlas:material-allocate`, `atlas:material-column-save`, `atlas:material-column-delete`, `atlas:material-transition-open`, `atlas:material-transition-save`, `atlas:material-file` | `GET /api/materials`, `/api/stages-admin`, `/api/materials/schema`, `/api/agenda-events`; material/schema CRUD; `/api/workbench/diary?resource=material-transition` |
| Agenda | `installAgendaRoute` → `agenda` | `atlas:agenda-connected`, `atlas:agenda-refresh`, `atlas:agenda-save`, `atlas:agenda-delete` | `GET /api/agenda-events`, `/api/stages-admin`, `/api/materials`; `PUT /api/agenda-events` snapshot |
| Activities | `installActivitiesRoute` → `activities` | `atlas:activities-connected`, `atlas:activities-refresh`, `atlas:activity-save`, `atlas:activity-delete`, `atlas:activity-record-create` | `GET /api/stages-admin`, `/api/records`, `/api/materials`; activity CRUD under `/api/activities`; `POST /api/records` |
| Progress diary | `installProgressRoute` → `progress` | `atlas:progress-connected`, `atlas:progress-refresh`, `atlas:progress-record-create`, `atlas:navigate` | `GET /api/stages-admin`, `/api/records`, `/api/materials`, `/api/agenda-events`; `POST /api/records` |
| Cash record | `installCashRecordRoute` → `cash-record` | `atlas:cash-record-connected`, `atlas:cash-record-create`, `atlas:cash-record-back` | `GET /api/stages-admin`; owner-only `POST /api/cash-flow`; canonical `GET /api/cash-flow`; optional attachment/fiscal metadata in POST body |
| Settings / Worker comprehension | `installSettingsRoute` → `settings` | `atlas:settings-connected`, `atlas:settings-stage-save`, `atlas:settings-stage-delete`, `atlas:settings-comprehension-save`, `atlas:settings-workbench-save`, `atlas:settings-infer`, `atlas:settings-role-save`, `atlas:settings-role-delete`, `atlas:settings-key-create`, `atlas:settings-key-revoke`, `atlas:settings-contact-save` | Persisted stages and AI config (`/api/stages-admin` and `/:id/ai`), Worker comprehension (`/api/workbench/state`, `/api/workbench/infer`), delegated access roles/keys, repository-backed public lead contact. Roles and keys are owner-only desktop; role/key administration is hidden in native APK. |
| Leads CRM | `installLeadsRoute` → `leads` | `atlas:leads-connected`, `atlas:leads-refresh`, `atlas:leads-open-public`, `atlas:lead-chat`, `atlas:instagram-refresh`, `atlas:instagram-policy-save`, `atlas:instagram-reply`, `atlas:navigate` | Admin-only `GET /api/admin/public-leads` reads sanitized GitHub-backed leads/reservations; authenticated Instagram feed, saved moderation policy GET/PUT and explicitly confirmed reply POST. Lead rows are read-only because the source API provides no lead-status CRUD contract. |
| Loteamento (`lot-development`, `lot-profile`) | `installLotDevelopmentRoute` → `<atlas-lot-development>` | `atlas:lot-development-connected`, `atlas:lot-profile-open`, `atlas:lot-profile-close`, `atlas:lot-profile-save`, `atlas:lot-profile-delete`, `atlas:lot-cash-entry` | Authenticated `GET /api/lot-development/profiles` projects the official price catalog with persisted profile overrides and saved common-area rows; POST/PUT/DELETE persist profiles in SQLite. The companion `GET /api/cash-flow` supplies actual lot-linked receipts; the cash action navigates to Repasses without creating a receipt. The selected profile ID is part of route identity, not page data. |
| Document archive (`documents`) | `installProjectDocumentsRoute` → `<atlas-project-documents>` | `atlas:documents-connected`, `atlas:document-save`, `atlas:document-cell-save`, `atlas:document-open`, `atlas:document-delete`, `atlas:document-column-create`, `atlas:document-column-delete`, `atlas:documents-import` | `GET /api/project-documents` reads SQLite metadata and custom property columns; authenticated POST/PUT/DELETE persist metadata and file bytes; `GET /:id/file` downloads bytes; column POST/DELETE update the persistent schema and stored values. Explicit import reads legacy metadata/IndexedDB blobs or a same-origin built-in asset, preserves IDs and property values, skips existing rows and stops visibly on a missing file. Search, category/file filters, hidden columns, edit selection and keyboard navigation are element-local `state.next(...)` transitions. The legacy archive is not treated as a canonical source by this route. |
| Operational dashboard / Central (`control`) | `installDashboardRoute` → `control` | `atlas:dashboard-connected`, `atlas:dashboard-refresh`, `atlas:dashboard-report`, `atlas:dashboard-record-create`, dashboard-originated `atlas:navigate` | Requires canonical reads from cash flow, stages, diary, notifications, agenda, materials, and repasses; report exports reread records or events; new diary entries POST to `/api/records` then reload the snapshot |

All reads use `readApi`; standard JSON CRUD uses `mutateApi`; replacement/upsert
endpoints use `writeApi`. File download handlers additionally validate a trusted
same-origin API path and attach the current bearer token. File upload is encoded
with `fileDataUrl` to match the existing JSON API contract, including the current
backend size/count restrictions enforced in the component and API.

The one localhost exception is the GitHub-backed Leads directory: `apiUrl()` sends
`GET /api/admin/public-leads` to the configured Worker origin rather than the local
SQLite server, preserving the current bearer token. No other local operational route
is redirected. On 18/10/2026 the deployed Worker endpoint returned 401 with `no-store`
without a session, and the authenticated browser rendered the current persisted
repository projection. This proves the read path only; it does not certify Instagram
credentials, policy writes, public lead registration, or the public Leads page.

The agenda endpoint accepts a complete event snapshot. Agenda save merges the
submitted event by ID into the last canonical read, then PUTs that full snapshot;
delete excludes only the selected ID. This contract makes reload and audit behavior
important: never PUT a partial list, silently omit unedited events, or treat the
client cache as the durable source. Concurrent server-side writes need API-level
conflict protection before adding multi-editor concurrency guarantees.

The agenda component's weekly timeline and status groups are projections over the
same persisted rows. Its optional calendar canvas previews pointer changes locally,
then emits the complete changed event only on pointer-up; `program.ts` persists it
and reloads the server snapshot. A click without movement opens the editor. Moving
an event snaps time to 30-minute increments; duration and week-span handles are
clamped to valid day/hour bounds. The live service test covers CRUD and rollback,
not browser pointer gestures, server restart during the test, or APK touch behavior;
those checks must remain explicitly open until exercised in those runtimes.

Material-transition creation persists the transition and uploaded documents
before checking planner outcome. `plannerStatus !== "generated"` is reported as
“transition saved, agenda generation pending”; it must not be described as a
successful agenda generation. Transition history and attachments are loaded from
the workbench diary endpoint, not inferred from the in-memory view.

The activities route reads the persisted stage catalog (including its activities),
field diary, and materials together. Create/edit/delete requests use
`/api/activities`; creating a diary item uses `/api/records` with the selected
activity and stage identifiers. Successful writes always trigger a canonical
reload. Actor role affects which controls are presented, but is not a security
boundary: the API must independently authorize every mutation. Activity
selection and back are local `state.next(...)` transitions; at mount only, the
program clears stale legacy activity-detail shell state if present. The live test
verifies authenticated CRUD and cleanup on the configured database; it does not
certify browser restart durability or APK interaction.

The standalone `progress` route is a partial migration of the diary view, not the
complete `stages` category. `AtlasProgress` owns period/stage filters, disclosure,
and form state through its local generator and `state.next(...)`. `program.ts`
loads the actual stages/activities, diary, materials, and agenda collections,
then validates record creation through authenticated `POST /api/records` and a
canonical reread. Stage map overlay follows the stage-name mapping used by the
legacy map component and passes no demo map index. The live test exercises the
form against the configured operational DB, asserts the new row is readable and
rendered in the timeline, checks the mobile component width, and deletes only its
unique QA row in `finally`, asserting preexisting record IDs remain. It does not
cover OCR, stage timeline/CRUD, APK, or server restart; those remain open before
the complete category can be called done.

`cash-record` is rendered only by the TypeScript `AtlasCashRecord` element; the
duplicate legacy `cashRecordPageV1` template has been removed. The route is the
owner-only cash-exit form; it never creates commercial
receipts, which remain on Repasse. `AtlasCashRecord` owns the selected attachment,
validation and saving status locally. It converts BRL to integer cents, accepts
only PDF/JPEG/PNG/WEBP up to the current UI limit, and requires fiscal type,
number, issuer, issue date and an attachment before a row can be marked checked.
`program.ts` independently checks owner role, encodes the optional file into the
existing JSON API contract, POSTs `/api/cash-flow`, then rereads the canonical
ledger. A successful POST followed by a failed reread is reported as saved and
must not be retried; returned summary/operational state is retained while
navigating back. The live browser test verified owner form rendering, field-level
fiscal rejection, restricted-role denial, API rejection of zero cents, and
preservation of the real ledger without writing QA rows. It deliberately did not
create a valid exit: the cash ledger has no delete/rollback endpoint, so a live
successful-write test would leave a permanent financial transaction. Attachment
upload, confirmed write/read, server restart and APK remain unverified.

`lot-development` and `lot-profile` use `AtlasLotDevelopment` for the active
admin shell renderer. Lot area, block, and reference price are projected from
the existing official `REPASSE_PRICE_CATALOG`; contract status is derived from
persisted commercial sales, never from a local UI override. Lot description
overrides and common-area records persist in `lot_development_profiles`; the
table is created without seeding demonstration areas. Owner, admin, and developer
authorization is enforced at the API. The profile list joins the persisted cash
ledger by exact lot label, and its “Registrar entrada” action only navigates to
Repasse. A reversible live SQLite CRUD check verified create/update/read from a
separate Node process/delete while preserving all 298 pre-existing lot profiles.
The browser route, API authorization, chat-driven profile editing, Worker-backed
remote deployment, and APK are not yet certified; the category migration is
therefore still incomplete.

Route navigation to a lot profile passes through `navigateRoute` and stores only
`lotProfileId` alongside the other route identifiers in `routeStateProgram`.
The profile list, cash ledger, search text, filter, editor draft, and saving/error
states stay in the element and advance via its `state.next(...)`. The program
installs the legacy assistant bridge as service-backed callbacks: profile context
comes only from the last API read, while an assistant upsert performs authenticated
POST/PUT and navigates to the persisted profile after success. It no longer treats
`appStore.developmentProfiles` as canonical. The bridge's consumer remains legacy
chat code and must be transposed before the overall frontend migration is complete.

## Repasse report calculation

`calculateRepasseReports` is a deterministic projection over data returned by
`GET /api/repasses`; it does not write ledger records. Amounts are integer cents.
The sale's contract base uses configured plan price, then table price, then
persisted sale value. Existing receipt rows are sorted by policy priority
`signal` → `intermediate` → `monthly`, then date. If an active broker/lot rule and
reason are available, commission is computed from received cents × commission
percent × reason share percent. Commission split is 50/50 for signal and
intermediate, 70/30 for monthly. Absent configuration yields null commission
amounts and an explicit status; it is not coerced to zero commission.

Future projections require an active rule, a persisted plan, and a positive
remaining principal. Plan monthly and semiannual principal shares are distributed
over their configured installment counts. Each due date uses the plan's first due
date; monthly rows advance one calendar month, semiannual rows advance six months,
and end-of-month dates are clamped to the target month's final day. Annual interest
is converted to an effective monthly rate and compounded over elapsed calendar
months on the outstanding balance. Principal is capped at the remaining balance;
the final installment absorbs rounding residue. Incomplete dates, missing rule,
missing plan, and settled contracts remain distinct `forecastStatus` values.

The CSV export uses those same rows and includes explicit status for sales with no
current or future movement. Export messages report that a browser download was
triggered; they do not verify that the user opened or retained the resulting file.

## Adding or changing a category

1. Read the complete source category and its service/persistence dependencies.
2. Declare/adjust contracts in `models.ts` and implement element behavior in
   `components.ts`; generators advance through `state.next(...)` only.
3. Add authenticated orchestration and service calls here; never move service
   access into the element or put durable records in browser storage.
4. Install the route and event listeners in `SystemAPI` and in the shell bridge.
5. Test against the configured operational database. Any write used for validation
   must be uniquely identifiable, authorized, reversible, and cleaned up.
6. Verify persistence after reread/restart where possible, relevant build/tests,
   and browser/device rendering. Document the exact limits of any incomplete check.
7. Update the route/event/API table and the category's validation notes here.

The current TypeScript routes are a migration in progress, not proof that the
admin, public, and APK frontends have all been transposed. Route presence or a
successful TypeScript build alone does not certify the category's full CRUD,
visual behavior, or native runtime.

## Complete program reference

This section is the function-level map for the current `src/program.ts`. Keep it
in sync with the implementation whenever a function, event, endpoint, policy,
or side effect changes. Types describe the contract; this document explains
when each operation runs and what it is allowed to change.

### Public system API and lifetime

`program()` is a generator-based composition root. Each call creates a scoped
set of element references, request sequence counters, the agenda's latest
canonical snapshot, runtime adapters, and the closures listed below. It yields
one frozen `SystemAPI` and remains alive after the first `next()` so those
closures continue to own the application. Create it once per frontend document.

| Public method | Purpose and effects |
| --- | --- |
| `routeStateProgram()` / `navigateRoute(appStore, patch, nonRouteState)` | The one application-wide iterator tracks only route identity; syncs from the shell before each navigation and mirrors the resulting route back. Do not create a second global iterator or put component interaction state here. |
| `start(root)` | Standalone entry point for the history element. Rejects a second mount, replaces root children, binds history navigation/save/file events, and loads persisted history. |
| `reloadSalesHistory()` | Concurrently reads sales and repasse metadata; updates only the currently mounted history element if this is still its latest request. |
| `reloadRepasses()` | Reads the persistent repasse ledger, computes current/future reports, and updates only the current element/request. |
| `reloadBrokers()` | Reads financial operations, sales, and professional profiles; joins sale metadata by sale ID; computes reports; updates only the current element/request. |
| `reloadAgenda()` | Reads agenda snapshot, stages, and materials together; retains the canonical event snapshot used by later writes; discards stale reads. |
| `reloadActivities()` | Reads persisted stages/activities, records, and materials; validates all envelopes; delivers only the newest result to the active element with current role/selection context. |
| `reloadDashboard()` | Reads cash flow, stages, records, notifications, and agenda; validates all required response shapes and installs one complete snapshot. |
| `reloadProgress()` | Reads persisted stages, records, materials, and agenda events together; installs the newest complete snapshot only on the active progress element. |
| `reloadProjectDocuments()` | Reads archive metadata and property columns from `/api/project-documents`; an older read cannot replace a newer snapshot or a new element. |
| `projectDocumentDataUrl(file)` / `saveProjectDocumentEvent(event)` | Encodes the selected file for the JSON transport, persists create/update through the authenticated API, then reloads canonical rows. The component retains only the form and selected file until completion. |
| `saveProjectDocumentCell(event)` | Validates an editable base/custom field, preserves all other metadata and properties, persists the whole row, and reloads from SQLite. |
| `openProjectDocument(event)` | Fetches stored bytes with the current bearer token, downloads them under their persisted filename, and revokes the temporary object URL. HTTP 401 invalidates host auth. |
| `readLegacyDocumentBlob(id)` / `importLegacyProjectDocuments(event)` | Only an explicit import reads IndexedDB or a bundled project asset. It maps previous custom property IDs to persistent column IDs, uploads each document to the canonical API, skips rows already present, and retains the old archive if an attachment cannot be read. There is no automatic seed or successful-looking fallback. |
| `reloadLeads()` | Reads the current sanitized lead/reservation projection from the repository-backed Worker endpoint; stale results and responses for disconnected elements are discarded. |
| `readInstagramFeed()` / `reloadInstagram(element)` | Authenticates to the Worker, preserves the explicit unavailable-provider response, and loads only Meta-returned posts/comments; it does not present empty or fabricated content as a successful feed. |
| `reloadInstagramPolicy(element)` / `saveInstagramPolicy(event)` | Reads and saves the Worker-backed moderation policy. Save success requires a persisted Worker response plus a canonical GET read-back matching preset, tone and instructions; local storage is never a fallback. |
| `sendInstagramReply(event)` | Sends a user-approved reply through the Worker/Meta API and reloads the feed; it does not append an optimistic local comment. |
| `openLeadChat(event)` | Opens the mounted operational chat with the selected persisted lead context. If the host chat is absent, the Leads element receives a visible error instead of a false success. |
| `installSalesHistoryRoute(ViewLayer, appStore, host)` | Replaces the shell history renderer and binds its connect, navigate, selection, save, and file events to this program instance. |
| `installRepassesRoute(ViewLayer, host)` | Replaces the repasses renderer and binds connect, refresh, mutation, and export events. |
| `installBrokersRoute(ViewLayer, appStore, host)` | Replaces directory/board/detail renderers; coordinates selected broker across URL and host store; binds refresh, profile CRUD, export, document, and navigation events. |
| `installMaterialsRoute(ViewLayer, host)` | Replaces the materials renderer and binds refresh, material/schema CRUD, allocation, transitions, and attachment events. |
| `installAgendaRoute(ViewLayer, host)` | Replaces the agenda renderer and binds connect, refresh, event save, and event delete. |
| `installActivitiesRoute(ViewLayer, appStore, host)` | Replaces the activity renderer, clears stale legacy activity-detail shell state once when necessary, and binds load, CRUD, and diary creation. Detail selection/back remain local to the element. |
| `installDashboardRoute(ViewLayer, appStore, host)` | Replaces the shell `assistant` renderer and binds dashboard load/refresh/report/navigation events. |
| `installProgressRoute(ViewLayer, appStore, host)` | Replaces the progress renderer, routes navigation through the single route iterator, and binds live reads and authenticated diary creation. |
| `installCashRecordRoute(ViewLayer, appStore, host)` | Replaces `cash-record`, supplies live actor/stage context, and binds owner-only create/back events to the ledger API and route iterator. |
| `installSettingsRoute(ViewLayer, appStore, host)` | Replaces settings with `<atlas-settings>` and binds stage CRUD, AI comprehension, Worker workbench save/inference, owner desktop role/key management, and repository-backed contact settings. All writes are followed by canonical reads where supported. |
| `installProjectDocumentsRoute(ViewLayer, host)` | Replaces the archive route, owns document/column CRUD and file requests, and rejects events from a noncurrent archive element. Its data service lives in `program.ts`; the component only owns transient interaction. |

The host bridge may install different categories on a shared `Document`, but
must call each route installer once. Installers intentionally register listeners
on the supplied host, so mounting multiple independent programs on the same host
would duplicate side effects. A disconnected element is ignored by checking its
identity against the currently mounted element; async reloads also compare the
captured target and request sequence before updating UI.

### Runtime and authenticated transport

`apiBase()` selects the API origin in this order: ngrok forwarded-port path;
explicit Capacitor origin; same-origin local development; deployed origin from
the runtime global or `belavista-api-base` meta tag. Native mode without an API
origin and deployed mode without configuration throw immediately. `apiUrl(path)`
joins that origin and the API path without caching configuration.

`readApi(path)` performs uncached authenticated GET and parses JSON. `writeApi`
performs authenticated JSON PUT for replacement/upsert-style contracts.
`mutateApi` performs authenticated JSON POST/PUT/DELETE and requires a JSON
response. All three await host auth restoration, request a fresh ID token, call
the host invalidator on HTTP 401, surface backend `error` text when available,
and throw on missing credentials, non-2xx responses, or invalid required JSON.
They do not retry, cache data, or turn failures into empty/successful results.
Several download and repasse mutation handlers make direct `fetch` calls because
they require binary response handling or operation-specific URL construction;
those handlers follow the same fresh-token/401/error rules.

`readApi`, `writeApi`, and `mutateApi` are deliberately distinct contracts:
GET is read-only; PUT in `writeApi` is used for complete replacement/upsert
payloads such as the agenda snapshot and sale; `mutateApi` handles resource CRUD
with POST/PUT/DELETE and sends JSON headers/body only when a body exists. The
repasse-specific dispatcher performs direct requests because its allowed action
names map to multiple resource paths and include bodyless deletes. Download
handlers also fetch directly so they can consume a binary `Blob`, retain the
same-origin/API-path trust check, and create a temporary browser download URL.
These direct requests are not exceptions to authentication or HTTP error
handling.

#### Runtime resolution and request failure behavior

`apiBase()` selects the ngrok forwarded-port prefix first, then the explicitly
configured Capacitor API origin, then same-origin for `localhost` and
`127.0.0.1`, and finally the configured deployed origin from
`BELAVISTA_API_BASE` or the `belavista-api-base` meta tag. A missing native or
deployed origin throws before fetch. `apiUrl()` joins this value with the
endpoint path for each operation; it does not memoize environment configuration.

All JSON transport helpers await `BELAVISTA_ADMIN_AUTH_READY`, obtain a new ID
token through `BELAVISTA_GET_ID_TOKEN`, send it as a bearer token, and invoke
`BELAVISTA_ADMIN_AUTH_INVALIDATE` on HTTP 401. `readApi` returns parsed JSON for
successful GET responses and includes a backend-provided `error` in HTTP
failures when available. `writeApi` is the JSON PUT transport used by
replacement/upsert contracts. `mutateApi` is JSON POST/PUT/DELETE and supports
bodyless DELETE. Both write helpers require a successful parseable JSON response.
No helper retries, caches an entity, or converts a failed response to empty data.
Authentication readiness has no local timeout or retry policy: it is governed
by the host authentication bridge.

The three file-download handlers intentionally use direct fetch instead of
`readApi`, because they must retain a binary `Blob`. Material attachments must
be same-origin. Sale and broker files must be under the configured
`/api/commercial-sales/` endpoint. Each handler checks its owning element is
active before starting, obtains fresh auth, invalidates on 401, sanitizes the
download name, triggers a browser download, and revokes the temporary object URL.
This confirms only that the browser download was initiated, not that the file
was retained by the user.

### Service and event operation catalog

Events are bubbling custom events emitted by the corresponding element. Every
mutating handler first verifies that `detail.element` is the active instance.
Event payloads below describe the TypeScript program's consumed fields; the
element owns validation and transient form state while the program remains the
authority for service calls and persistent state.

| Handler | Event / read | Persistent request and completion behavior |
| --- | --- | --- |
| `reloadMaterials` | `atlas:materials-connected`, `atlas:materials-refresh` | Parallel GET `/api/materials`, `/api/stages-admin`, `/api/materials/schema`, `/api/agenda-events`; installs returned catalogs only if request and element are current. Failure is rendered on the material element. |
| `saveMaterial` | `atlas:material-save` `{id|null,payload}` | POST `/api/materials` for create or PUT `/api/materials/:id` for edit; reloads all material context after success. |
| `deleteMaterial` | `atlas:material-delete` `{id}` | DELETE `/api/materials/:id`; reloads canonical data. |
| `allocateMaterial` | `atlas:material-allocate` `{id,stageId|null}` | Looks up the material from the active element, PUTs its full current object with the changed `stageId`, reloads; missing selected material is an error. |
| `saveMaterialColumn` / `deleteMaterialColumn` | `atlas:material-column-save` `{label}` / `atlas:material-column-delete` `{id}` | POST `/api/materials/schema` or DELETE `/api/materials/schema/:id`; reloads canonical schema and materials. |
| `openMaterialTransition` | `atlas:material-transition-open` `{material}` | For persisted material, GET `/api/workbench/diary?resource=material-transition&materialId=…&stage=…`; reads audit rows and attachments. Draft materials have no persisted history query. |
| `saveMaterialTransition` | `atlas:material-transition-save` with material, stage, before/after values, and files | Converts each file to data URL; POSTs the diary transition including before/after snapshots and documents; reloads materials and closes editor after persistence. Reports `plannerStatus` separately; a saved transition is not proof that agenda generation succeeded. |
| `downloadMaterialAttachment` | `atlas:material-file` `{fileUrl,fileName}` | Allows same-origin URLs only; authenticated binary GET; triggers browser download and revokes its object URL after 60 seconds. |
| `reloadAgenda` | `atlas:agenda-connected`, `atlas:agenda-refresh` | Parallel GET `/api/agenda-events`, `/api/stages-admin`, `/api/materials`; updates active element and canonical `agendaEvents` snapshot together. |
| `saveAgendaEvent` | `atlas:agenda-save` `{payload}` | Merges one event into the last canonical snapshot and PUTs the complete `/api/agenda-events` body `{events}`; reloads after success. |
| `deleteAgendaEvent` | `atlas:agenda-delete` `{id}` | PUTs the complete current snapshot excluding only that ID; reloads after success. |
| `reloadActivities` | `atlas:activities-connected`, `atlas:activities-refresh` | Parallel GET `/api/stages-admin`, `/api/records`, `/api/materials`; validates the three arrays, reads actor role and installs only into the current element/request. Stale selected-activity navigation state is intentionally ignored. |
| `saveActivity` | `atlas:activity-save` `{id|null,payload}` | POST `/api/activities` for a new activity or PUT `/api/activities/:id`; reloads canonical activity context. Backend owns authorization and field validation. |
| `deleteActivity` | `atlas:activity-delete` `{id}` | DELETE `/api/activities/:id`; reloads canonical activity context; service rejection is shown as an error, never hidden. |
| `createActivityRecord` | `atlas:activity-record-create` `{payload}` | POST `/api/records` with linked activity/stage context, then reloads stages, records, materials. |
| `installActivitiesRoute` | Activity `connected`, `refresh`, `save`, `delete`, `record-create` events | Installs `<atlas-activities>`. Detail selection/back are local `state.next(...)` transitions; only route mount clears stale legacy shell state. Persistence is delegated to CRUD handlers. |
| `saveSale` | `atlas:history-save` `{id,status,notes,contract[],client[]}` | Checks status length and attachment count/size limits; data-URL encodes selected files; PUT `/api/commercial-sales/:id`; reloads sales plus repasse metadata. |
| `downloadSaleFile` | `atlas:history-file` `{fileUrl,fileName}` | Requires URL under configured `/api/commercial-sales/`; authenticated binary GET; downloads and clears/sets the document error state. |
| `reloadBrokers` | `atlas:brokers-connected`, `atlas:brokers-refresh` | Parallel reads of repasses, sales, and `/api/broker-profiles`; joins persisted sale details and computes financial reports. |
| `saveBrokerProfile` | `atlas:broker-profile-save` `{name,profile}` | PUT `/api/broker-profiles/:name`; reloads, then confirms persistence in the element. Does not modify linked sales or receipts. |
| `deleteBrokerProfile` | `atlas:broker-profile-delete` `{name}` | Authenticated DELETE `/api/broker-profiles/:name`; reloads; explicitly preserves related financial records. |
| `downloadBrokerFile` | `atlas:brokers-file` `{fileUrl,fileName}` | Same trusted commercial-sales URL validation and authenticated binary download as history attachments. |
| `mutateRepasse` | `atlas:repasse-mutation` `{action,payload}` | Routes create/update/delete-entry, save/delete-rule, and save/delete-plan to the dedicated ledger endpoints; reloads and recalculates reports after successful mutation. Unknown action is rejected visibly. |
| `exportRepasseCsv` | `atlas:repasse-export` | Uses the element's loaded snapshot and the same report calculator; emits branded UTF-8 BOM, semicolon-separated CSV with realized, projected, or explicit no-movement rows; download initiation is not proof of file retention. |
| `exportBrokers` | `atlas:brokers-export` | Uses loaded derived profiles and values; emits branded UTF-8 BOM CSV. It does not write back to the API. |

`mutateRepasse` accepts only these action-to-request mappings: `create-entry` →
POST `/api/repasses/entries`; `update-entry` → PUT `/api/repasses/entries/:id`;
`delete-entry` → DELETE that entry URL; `save-rule` → PUT
`/api/repasses/broker-rule`; `delete-rule` → DELETE
`/api/repasses/broker-rule?brokerName=…&lotKey=…`; `save-plan` → PUT
`/api/repasses/sales/:saleId/plan`; and `delete-plan` → DELETE that plan URL.
The action name controls the endpoint and method; event payloads cannot provide
arbitrary paths. Every accepted operation awaits host auth, sends a fresh bearer
token, invalidates on 401, rejects non-successful responses, and reloads the
ledger before success feedback. Unknown actions are rejected without a request.

`sales()` validates the `/api/commercial-sales` envelope and resolves attachment
URLs against the current runtime API base. `repasses()` validates the ledger's
required `entries` and `brokerRules` arrays. These are not catalog generators:
they read live persisted service responses. `fileDataUrl(file)` only adapts a
user-selected binary to the existing JSON upload contract; it does not persist
the file by itself.

The local export helpers `forecastLabel`, `cell`, `money`, and `line` are
formatting-only: they format projection status, quote CSV cells, serialize
integer cents in Brazilian decimal notation, and pad report rows to the declared
width. They have no service or persistent side effects. The scoped closures
`persistSelectionInUrl`, `directory`, and `detail` belong to
`installBrokersRoute`: they synchronize selection, produce list/detail markup,
and do not read or write broker records. Inline array, event, and promise
callbacks only transform values, verify element identity, dispatch a named
handler, or release temporary download URLs; they do not define separate domain
operations. Promise rejection handlers only normalize a rejected JSON parse so
the enclosing request can produce its explicit HTTP failure. `program.ts` never
mutates component state through an imperative `update()` method. Component-local
interaction transitions advance through generator-backed `state.next(...)`.
At this migration boundary, the program delivers service results through the
declared state-owning methods `setData`, `setError`, `setMessage`, `setFeedback`,
and `setSavingError`; these methods are component adapters, not persistence
APIs. When transposed, preserve state ownership by advancing the component's
state iterator rather than adding a second setter/update path.

The `reasonPriority` and `reasonSplit` tables are program-instance policy, not
persisted/configurable domain entities: they order Sinal → Intermediária →
Mensal and split commission 50/50 for Sinal/Intermediária and 70/30 for Mensal.
`forecastLabel`, `cell`, `money` and `line` are export-local formatting helpers:
they label projection status, quote and normalize CSV cells, format integer
cents as Brazilian decimal text, and pad report rows to 15 columns. The
dashboard's local CSV cell formatter additionally protects formula-leading
values. None of these helpers makes a service call or writes data.

### Repasse calculation details and limits

`calculateRepasseReports(sales, reasons, today)` is pure: it receives service
records and returns report projections without mutating them or calling a
service. `cents(value)` rounds inputs to integer cents. Receipt order is reason
priority then date. The contract base is selected from plan contract price,
table price, then sale value; received amounts reduce remaining principal but
are clamped at zero. Current commission is calculated only when an active rule
and matching reason exist. Rule percentage and reason share percentage are
applied to receipt amount, then the primary/partner split policy is applied.

For projection, missing active rule, missing plan, or settled balance short
circuit with explicit statuses. A plan that declares installments but lacks a
corresponding first due date is incomplete. Monthly principal is the configured
non-semiannual share divided over monthly installments; semiannual principal is
the configured share divided over semiannual installments. Installments are
sorted by date, with reason priority breaking same-date ties. Annual interest is
converted to an effective monthly rate and compounded over whole elapsed
calendar months against the declining balance. Principal allocations are capped
at the remaining principal and the final row absorbs cent-rounding residue.
This is a projection policy, not a substitute for backend validation or a
contractual/legal accounting statement; any backend policy change must be
reflected here and covered by calculation tests before changing the CSV.

`exportRepasseCsv` reports one row per realized receipt and forecast installment;
when neither exists, it emits one `Sem movimento` row containing the report's
explicit forecast status. Money is formatted from cents in Brazilian decimal
notation and all fields are quoted with quote escaping. The export is built
from the currently loaded data, so refresh before export if the user needs a
newer server snapshot.

### Failure, concurrency, and side-effect boundaries

- Service errors are converted to component-visible errors/messages; no empty
  array is substituted for a failed read and no mutation reports success before
  the server accepts it.
- Reads for materials, agenda, repasses, brokers, and sales history use per-view
  monotonically increasing request IDs. A slow earlier response cannot replace
  a newer read or update an element that is no longer active.
- Agenda writes use a whole-snapshot endpoint. Client-side merging preserves
  unedited rows in its last read, but does not solve simultaneous writes from
  another client; backend versioning/conditional writes are required for that.
- Material allocation writes the current material object with one changed
  association. If the API becomes PATCH-based, update this contract rather than
  dropping fields from this replacement request.
- Browser exports and downloads create object URLs and revoke them after
  triggering a download. The program can confirm download initiation, not that
  the browser saved or the user opened the file.
- Listener registration has no current teardown API. If the shell supports
  remounting a route on the same document without reload, add explicit
  `AbortController`/dispose ownership before enabling repeated installation.
- The agenda test currently exercises live authenticated CRUD and rollback;
  it does not establish cross-client conflict safety, server restart durability
  for that run, pointer gestures, or APK behavior. Preserve these as open
  validation items until directly tested.

### Documentation completeness gate

Before considering the program documented for a release, check each executable
function in `program.ts` against the operation catalog above; update this file
when its endpoints, payloads, authentication, validation, ordering, side effects,
or error behavior change. Keep component markup/state/event contracts in the
component reference, domain shapes in `models.ts`, and startup/entry selection
in the frontend README. The code remains authoritative if documentation and
implementation disagree; resolve the mismatch before release, and do not call a
category complete while its implementation or validation is still open.

## Exhaustive `program.ts` function reference

This inventory covers every named function currently declared in
`src/program.ts`. Keep it synchronized with the implementation. The service
catalog above remains authoritative for event payloads and endpoint sequencing;
this table makes function-level responsibility and side-effect boundaries
explicit.

| Function | Responsibility and effects |
| --- | --- |
| `program()` | Creates one isolated program instance, yields its frozen `SystemAPI` indefinitely, and owns private element refs, request counters, and agenda snapshot. Consume its first `next()` once per document; no disposal contract exists. |
| `apiBase()` | Resolves ngrok forwarded-port, required native Capacitor origin, local same-origin, or configured deployed origin; throws if native/deployed configuration is absent. |
| `apiUrl(path)` | Joins resolved origin and service path; does not cache configuration. |
| `readApi<T>(path)` | Waits for host auth, requests fresh token, performs uncached bearer GET, invalidates auth on 401, propagates backend errors, returns JSON. Endpoint-envelope validation remains with callers. |
| `writeApi<T>(path,payload)` | Authenticated JSON PUT for snapshot/upsert APIs; invalidates on 401 and requires successful JSON response. |
| `mutateApi<T>(path,method,payload?)` | Authenticated JSON POST/PUT/DELETE; supports no-body delete, invalidates on 401, requires parseable successful JSON. |
| `reloadSalesHistory()` | Increments `machine.requestId`, clears `machine.lastError`, concurrently calls `sales()` and `repasses()`, joins repasse metadata to the sales view, and sends data/error only to the still-mounted history element if this request remains newest. |
| `sales()` | GETs `/api/commercial-sales`, requires a `sales` array, and resolves stored file paths against the current runtime API base. It does not mutate or persist sales. |
| `repasses()` | GETs `/api/repasses` and requires `entries` and `brokerRules` arrays before returning the full ledger envelope. |
| `reloadMaterials()` | Reads materials, stages, schema columns, and agenda references concurrently; installs only for the active element and latest request. |
| `reloadAgenda()` | Reads events, stages, and materials; stores canonical events as merge base and rejects stale responses. |
| `saveAgendaEvent(event)` / `deleteAgendaEvent(event)` | Verify active element, merge/remove in the canonical agenda snapshot, PUT the complete collection, then reload. |
| `saveMaterial(event)` / `deleteMaterial(event)` / `allocateMaterial(event)` | Verify event origin; create/update/delete materials or replace the selected material with its stage association changed; reload canonical material, stage, schema, and agenda context. |
| `saveMaterialColumn(event)` / `deleteMaterialColumn(event)` | POST or DELETE a persisted material-schema column, then reload canonical material context. |
| `openMaterialTransition(event)` | For persisted materials only, reads transition audit rows and attachments from the workbench diary; draft materials have no server history. |
| `saveMaterialTransition(event)` | Converts selected files to data URLs; POSTs before/after snapshots and documents to the material-transition diary endpoint; reloads materials and closes the editor after persistence. Agenda planner failure is reported separately and does not undo or misrepresent the saved transition. |
| `downloadMaterialAttachment(event)` / `downloadSaleFile(event)` / `downloadBrokerFile(event)` | Verify active element and trusted URL scope, obtain a fresh bearer token, fetch binary content, invalidate auth on 401, create a temporary download URL and revoke it; failures are surfaced in the owning element. |
| `fileDataUrl(file)` | Reads one user-selected file through `FileReader`; rejects read or result-type errors. Encoding only adapts the API payload; the caller performs persistence. |
| `saveSale(event)` | Validates status and aggregate attachment count/size limits, encodes contract/client files, PUTs the selected persisted sale, then reloads sales and repasse metadata. |
| `reloadBrokers()` | Reads repasse operations, sales and persisted broker profiles concurrently; joins sale details by sale ID, derives repasse reports, and sets data only when target and request remain current. |
| `saveBrokerProfile(event)` / `deleteBrokerProfile(event)` | Upsert or delete only the professional profile; reload derived broker data and preserve sale/ledger records. The delete uses an authenticated bodyless DELETE. |
| `exportBrokers(event)` | Exports the active element's loaded derived broker profiles and financial totals to a branded UTF-8 BOM CSV; no API write. |
| `cents(value)` / `asDate(value)` / `isoDate(date)` / `addMonths(value,months)` / `monthsBetween(from,to)` | Pure repasse-calculation helpers: integer-cent rounding; `YYYY-MM-DD` shape parsing at UTC noon (not full calendar-date validation); UTC ISO serialization; month arithmetic with end-of-month clamping; non-negative whole-month difference. |
| `calculateRepasseReports(sales,reasons,today)` | Purely derives realized receipt commission and future installment projections using the policies below; returns explicit missing-rule/plan/date/settled statuses rather than inventing amounts. |
| `reloadRepasses()` | Reads the persisted ledger, calculates reports, and delivers only the latest request to the currently mounted repasse element. |
| `mutateRepasse(event)` | Validates active element and allowlisted action; routes entry, broker/lot rule, or payment-plan create/update/delete to the corresponding ledger endpoint; reloads/recalculates after success. Unknown action or API/auth failure is visible. |
| `exportRepasseCsv(event)` | Uses the active element's loaded ledger, recalculates current and forecast rows, writes a branded semicolon CSV with realized/projected/no-movement status, and triggers download. It does not write to the ledger or certify that the browser retained the file. |
| `reloadActivities(appStore)` | Reads persisted stages/activities, diary records, and materials; validates all envelopes and updates only the current/latest element. |
| `saveActivity(event,appStore)` | Verifies event origin; POSTs or PUTs an activity, then reloads canonical context. Errors are forwarded through the component state gateway. |
| `deleteActivity(event,appStore)` | Verifies event origin; DELETEs one activity, then reloads; API authorization and linked-data constraints remain authoritative. |
| `createActivityRecord(event,appStore)` | Verifies event origin; POSTs a linked diary record, then reloads so it is read back from persistence. |
| `reloadSettings()` | Reads the persisted stage list, each stage AI configuration, and each keyed Worker workbench state. For empty workbench states, presents the original 8-stage/45-activity comprehension catalog embedded in this program as read-only defaults; no production records are seeded by loading the page. Reads role/key administration only for the desktop owner, and contact for owner/admin/developer. Stale request or disconnected-element responses are discarded. |
| `saveSettingsStage(event,appStore)` / `deleteSettingsStage(event)` | POST/PUT/DELETE persisted stage records, enforce owner/admin on create/edit, defer relationship validation to the API, then reload the stage/settings snapshot. |
| `saveStageComprehension(event)` | PUTs `/api/stages-admin/:id/ai` and reloads the persisted comprehension. |
| `saveSettingsWorkbench(event)` | Serializes writes per stage, merges the submitted sessions into the current persisted state, PUTs `/api/workbench/state`, rereads it, and requires exact session confirmation. |
| `inferSettingsSession(event)` | POSTs the selected session and current workbench context to `/api/workbench/infer`, serializes the result behind any pending edits, merges it into the latest persisted state, and requires a read-back confirmation. For an unmodified original-catalog session, the explicit Infer action persists that stage's complete current session set together with the result; simply viewing defaults never writes them. |
| `saveAccessRole(event)` / `deleteAccessRole(event)` / `createAccessKey(event)` / `revokeAccessKey(event)` | Persist dynamic role/key changes through `/api/access-roles` and `/api/access-keys`, reload lists after each operation, and expose a newly issued secret only once. Server authorization remains authoritative. |
| `savePublicLeadContact(event)` | PUTs the contact number to the repository-backed Worker setting and rereads it before reporting success. |
| `reloadDashboard()` | Requires valid envelopes from cash flow, stages, records, notifications, agenda, materials, and repasses in one parallel read; composes no partial snapshot and displays failure instead of placeholder data. |
| `exportDashboardReport(event)` | Supports records and agenda only; re-reads the chosen API collection, validates its envelope, orders agenda rows by status/date, escapes CSV/formula-leading cells, and triggers a download. Empty or failed sources produce explicit feedback. |
| `createDashboardRecord(event)` | Accepts a create intent only from the mounted dashboard element, POSTs its stage/activity/date/time/details and optional image/PDF data URL to `/api/records`, then reloads all five canonical dashboard sources. A successful POST is reported as saved even if that later refresh fails; failures never display success. |
| `installSalesHistoryRoute(ViewLayer,appStore,host)` | Installs history renderer and binds connected, selection, navigation, save, and file events to shell state and services. |
| `installRepassesRoute(ViewLayer,host)` | Installs repasses renderer and binds connection, refresh, mutations, and export. |
| `installBrokersRoute(ViewLayer,appStore,host)` | Installs directory/board/detail renderers; synchronizes broker selection with URL/store and binds profile, file, export, and navigation events. |
| `installMaterialsRoute(ViewLayer,host)` | Installs materials renderer and binds CRUD, schema, allocation, transition, and file events. |
| `installAgendaRoute(ViewLayer,host)` | Installs agenda renderer and binds load, refresh, save, and delete events. |
| `installActivitiesRoute(ViewLayer,appStore,host)` | Installs `<atlas-activities>`, accepts only its concrete connected instance, clears stale legacy detail state at mount, and binds refresh, activity CRUD, and diary-record creation. Local detail selection/back do not mutate shell navigation. |
| `installDashboardRoute(ViewLayer,appStore,host)` | Assigns `<atlas-dashboard>` to the canonical `control` renderer; binds connected/refresh/report/record-create and allowlisted navigation intents. New-record capture is owned by the element and persists through `createDashboardRecord`. |
| `reloadProgress()` | Reads the four canonical operational collections in parallel, checks response envelopes and request/element identity, and calls `setData`; read failures remain visible. |
| `createProgressRecord(event)` | Accepts only the active `<atlas-progress>` element, POSTs its validated form data to `/api/records`, reloads the canonical collections, and reports service outcome without synthetic success. |
| `installProgressRoute(ViewLayer,appStore,host)` | Installs `<atlas-progress>` at `progress`; binds connect/refresh/create/navigation events and uses `navigateRoute` for route changes. The component owns diary filters and form state through its own `state.next(...)` iterator. |
| `createCashRecord(event,appStore)` | Accepts only the mounted form, enforces owner role, encodes an optional attachment, POSTs the immutable exit, reloads cash flow and mirrors summary/operational results; on reread failure it preserves the POST result and navigates without inviting duplicate submission. |
| `installCashRecordRoute(ViewLayer,appStore,host)` | Installs `<atlas-cash-record>`, fetches actual stages for its selector, supplies the authenticated actor context and binds submit/back. Route changes use the single route-only iterator. |
| `installSettingsRoute(ViewLayer,appStore,host)` | Installs `<atlas-settings>` as the active shell renderer and binds persisted stage/AI/workbench operations, real Worker inference, delegated roles/keys, and repository-backed lead contact. |
| `installLeadsRoute(ViewLayer,appStore,host)` | Installs `<atlas-leads>`, binds repository-backed lead reads, Meta feed/policy/reply operations, lead-chat context and route navigation. |
| `start(root)` | Standalone history entry point: rejects second mount, mounts element, binds URL navigation/save/file, loads persisted history. |

### Dashboard route and source caveat

The `control` route now mounts the TypeScript Central and requires all seven
live service envelopes; there is no demo or partial fallback. Its tables are
read-only views of persisted cash entries, stage progress, materials, sales,
commission rules, and notifications. Editable records remain on their owning
routes (`materials`, `settings`, and `repasses`) rather than in a second
component-local shadow store. CSV exports cover persisted records and agenda,
and reread their source before generating files. The quick record form uses
only persisted stages/activities and accepts an optional image/PDF up to 6 MB
using the existing `evidenceUri` contract; the backend remains responsible for
authorization and validation. An authenticated live test created a uniquely
labelled diary record through the form, confirmed it through the API, and
deleted it in cleanup while asserting every pre-existing record ID survived.
The same record was also read through an independently started server process
connected to the same configured operational database, and every pre-existing
record ID remained present. Browser downloads for both reports were captured:
the files had the expected branded UTF-8 BOM/header, the diary CSV contained the
new persisted record, and the agenda CSV contained every pre-test persisted
event. At 390 px, the component had no horizontal overflow; the browser reported
no page errors. Desktop and mobile viewport captures were visually inspected
and are available when `ATLAS_CONTROL_CAPTURE_DIR` is set. New-record creation
and both report downloads were exercised with actual mouse clicks in the
browser. The source
control-center's former transient local material overrides and comprehension
editing were not copied: material CRUD and Worker comprehension are now owned
by their persisted Materials and Settings routes, as required by the newer
application behavior.
