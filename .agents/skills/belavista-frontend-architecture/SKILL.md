---
name: belavista-frontend-architecture
description: Apply the Belavista frontend boundary between TypeScript Web Elements in components.ts and services, domain contracts, routes, and lifecycle in program.ts. Use when adding or migrating Belavista frontend views, interactions, persistence, or API integrations.
---

# Belavista Frontend Architecture

Use this skill for frontend work in the Belavista repository. Read the repository `AGENTS.md`, `frontend/README.md`, and the relevant sections of `frontend/PROGRAM.md` first. Inspect the live route, current adapters, and `git status` before changing files. Preserve unrelated user changes and compatibility paths until the real route is verified.

## Ownership

- `frontend/src/components.ts` owns Web Elements, DOM/rendering, presentation contracts, and transient view state. Advance that state with the local `state.next(...)` setter. Components emit typed `atlas:*` `CustomEvent`s and do not call services or own persistence.
- `frontend/src/program.ts` owns contracts that cross service boundaries, domain projections and policy, authenticated API clients, route installation, event listeners, concurrency control, persistence orchestration, and startup lifecycle through `function* program()`.
- Keep the single global `routeStateProgram` limited to route identity. Do not put page, entity, chat, or session state in a global iterator or route store.
- `frontend/src/main.ts` only obtains and starts the program. Keep domain rules, service calls, and route composition out of it.
- Keep display-only catalogs in `frontend/src/data/*.json`; model and consume them in TypeScript. Do not put render logic or operational records in JSON catalogs.

## Component and program flow

1. Define a narrow, discriminated event contract at the component/program boundary. Include the originating mounted element in event detail for actions that mutate data.
2. Let the Web Element own the draft, validation feedback, focus, confirmation view, and transient loading state. Render from its current snapshot; avoid a second DOM state source.
3. Let `program.ts` verify the event source is the currently mounted element, validate the payload again, obtain the current host credential for each request, call the configured authenticated API, and surface failures to that element.
4. After a successful mutation, reload canonical service data and confirm the expected record or transition. Do not treat a click, HTTP 2xx alone, a build, or a test fixture as proof that the user flow completed.
5. Use monotonically increasing request IDs or serialized queues where overlapping reads/writes could return stale state or overwrite a complete snapshot. Handle conflicts visibly; never retry a non-idempotent action blindly.
6. Keep authoritative records in the configured operational service. Never substitute demo data, local state, or an optimistic success path when authentication, configuration, or persistence fails.

## Migration and documentation

- Move a route end to end: presentation, transient state, typed events, program orchestration, authenticated service contract, route registration, and navigation. Keep legacy adapters only as documented fallbacks until the real route has been exercised.
- Update `frontend/PROGRAM.md` with externally visible event, endpoint, authorization, state, concurrency, failure, and verification behavior. Update `frontend/README.md` with the route's migration status and remaining gaps.
- Preserve project conventions for event names, API helpers, route registration, type checking, build outputs, and cache/versioned imports.
- Verify the actual browser or native user flow that changed, including authorization, persisted result, reload, and failure behavior when relevant. Report exactly which surfaces and backend paths were exercised. Builds and focused tests are supporting evidence, not substitutes for that flow.

## AI-assisted command surfaces

- Keep chat generation, command interpretation, application execution, and durable state as separate boundaries. The model proposes a typed command; the program validates it against a closed allowlist and current application records.
- Treat Metis output as untrusted input. Validate every field, require explicit confirmation for mutations, and show the exact target and effect before execution.
- Send the validated proposal and current authorization context to the configured System One/OpenJEV decision API using its published typed `state` and `questions` contract. Only an exact allowlisted decision may advance to human confirmation; malformed, missing, or uncertain answers hold the command.
- Execute only through named application handlers. Never evaluate model text as code, call arbitrary URLs or methods, or let model output rewrite authoritative facts.
- Keep the API origin local/configured and make transport errors visible. Record command ID, proposal, decision, user confirmation, and the execution result when the product has an audit store.
- Document the model endpoints, payload schema, allowlist, approval step, state ownership, failure behavior, and verification gap with the feature.
