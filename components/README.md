# Component application

`components/index.mjs` is the application composition root. Feature components
and their behavior live in the category modules under this directory (`chat/`,
`commercial/`, `finance/`, `lots/`, `map/`, `planning/`, `records/`, and
`shared/`). The root `components.js` remains only as a compatibility entry for
older routes and consumers.

## Composition configuration

`COMPONENT_APPLICATION_CONFIGURATION_V1` in
`application-program-v1.mjs` documents the install groups and their order:

1. shared elements and navigation;
2. planning and stages;
3. finance and repasses;
4. commercial and brokers;
5. records and activities;
6. operational AI chat.

The individual composition modules in `index.mjs` remain the source of each
group's dependency injection. When adding a component, put its implementation
in the matching category module, connect its dependencies in the composition
root, and keep the exported surface limited to elements consumed by the
application. Do not duplicate component behavior in the compatibility entry.

## Boot program

`ComponentApplicationProgramV1.program()` sequences runtime resolution,
configuration validation, composition, and publication. The driver in
`application-program-v1.mjs` executes each yielded effect and fails explicitly
when an effect has no handler. `index.mjs` runs this program once during module
initialization, then exports the composed elements (`AppSidebar`, `AppTopbar`,
`ViewLayer`, map elements, and AI chat) for existing application consumers.
