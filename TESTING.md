# Testing Strategy

## Purpose

This document defines how we test `studio`.

The first goal is simple: automate confidence checks for the browser UI so we
can catch broken navigation, dead buttons, missing screens, and obvious
interaction regressions before we worry about desktop-specific behavior.

## Current Focus

We are focusing on the browser-rendered application only.

That means:

- We will run the frontend in a normal browser during tests.
- We will verify user-visible behavior from the rendered UI.
- We will defer Tauri desktop-shell automation until browser coverage is in a
  good place.

## Why Browser First

Browser automation is the best first step for this codebase because it is:

- faster to run
- easier to debug locally
- easier to run in CI
- enough to validate most UI behavior
- lower maintenance than desktop end-to-end automation

Most of the behavior we care about first is already visible in the frontend:

- route loading
- shell rendering
- navigation links
- sidebar interactions
- topbar actions
- page-level smoke checks

## Scope

The initial browser testing scope covers:

### 1. App Shell

- the app renders without crashing
- the shared shell loads
- the topbar is visible
- the sidebar is visible

### 2. Navigation

- `/` loads the default flows screen
- `/flows` loads
- `/pages` loads
- `/blocks` loads
- `/settings` loads
- sidebar links navigate to the expected route

### 3. Basic Interactive Controls

- the theme toggle can be clicked
- the sign-in button is visible when unauthenticated
- buttons and links that should be actionable are enabled and clickable

### 4. Route Stability

- direct navigation to known routes does not crash
- browser back/forward keeps the UI consistent
- invalid or partial deep links fail in a controlled way if supported

### 5. Smoke Coverage for Key Screens

Each major screen should have at least one smoke test that answers:

- did the page load?
- did the main heading or identifying content appear?
- are the primary controls present?
- did the page avoid console errors during load?

## Out of Scope For Now

The following are intentionally deferred:

- Tauri desktop-window automation
- filesystem/native OS integration testing
- tray/menu/window behavior
- visual regression snapshots at scale
- exhaustive cross-browser support matrices
- auth-provider end-to-end login flows
- flaky deep data setup for every flow/page state

We can add these later, but they are not required to get immediate value from
automation.

## Recommended Tooling

For browser UI automation, use:

- `Playwright` for end-to-end and smoke tests

Why `Playwright`:

- strong TypeScript support
- very good locator model
- reliable waiting behavior
- great debugging tools
- easy CI integration

## Setup

Install Playwright and the Chromium browser once:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Add a `test` script to `package.json`:

```json
"test": "playwright test"
```

Run tests:

```bash
pnpm test                  # run all tests
pnpm test --headed         # run with visible browser
pnpm test e2e/navigation   # run a specific file
```

## Test File Location

All browser tests live in `e2e/` at the root of the `studio` package:

```
studio/
  e2e/
    app-shell.spec.ts
    navigation.spec.ts
    topbar.spec.ts
    routes.spec.ts
  playwright.config.ts
```

The central configuration is `playwright.config.ts`. It sets the base URL,
the `webServer` block that starts the dev server automatically before tests
run, and any global timeouts or reporter settings.

The full dev stack is managed via `mani` (see the [workspace README](../README.md)):

```bash
mani run dev-edge        # start agent (port 8082) + studio (port 3010)
mani run kill-dev        # stop all dev processes
```

Example `webServer` block so Playwright starts the studio frontend itself:

```ts
webServer: {
  command: 'pnpm run dev',
  url: 'http://localhost:3010',
  reuseExistingServer: !process.env.CI,
},
```

For tests that only need the frontend, `pnpm run dev` in `studio/` is enough.
For tests that exercise backend-connected routes, start the full stack first
with `mani run dev-edge` and set `reuseExistingServer: true`.

## CI

Tests run automatically on every pull request and on push to `main`.

The CI step:

1. installs dependencies
2. runs `pnpm test` in `studio/`
3. uploads the Playwright HTML report as a build artifact on failure

Tests must pass before a PR can merge. If a test is flaky in CI but passes
locally, fix the flake before merging — do not skip or retry-suppress it.

## Test Levels

We should think about browser testing in layers.

### Layer 1: Smoke Tests

Small, fast checks that tell us whether the app is basically usable.

Examples:

- app loads
- core routes open
- primary nav works
- main controls are present

### Layer 2: Interaction Tests

Focused checks for important user actions.

Examples:

- toggle theme
- switch routes from the sidebar
- open and close a dialog
- expand or collapse navigation sections

### Layer 3: Workflow Tests

Longer tests for higher-value user tasks once the basics are stable.

Examples:

- open a flow and move through the expected builder UI
- navigate from a list page into an editor page
- verify a scoped route loads the same shell structure

We should not start with Layer 3. We earn the right to write longer workflows
after smoke tests are stable.

## First Milestone

The first automated browser milestone should cover:

1. The app starts and renders the shell.
2. The default route loads successfully.
3. Sidebar navigation reaches `Flows`, `Pages`, `Blocks`, and `Settings`.
4. The topbar theme toggle is clickable.
5. No unexpected console errors appear during those smoke flows.

"Unexpected" means any `console.error` that originates from application code.
Known third-party warnings and React development-mode notices are acceptable
and should be suppressed in the Playwright config so they do not cause false
failures.

If we have only a few tests at first, this is enough.

## Selector Strategy

Tests should prefer stable selectors in this order:

1. accessible roles and names
2. visible text when the text is stable
3. `data-testid` only when the UI has no reliable accessible locator

Guidelines:

- prefer `getByRole()` for buttons, links, dialogs, headings, and inputs
- avoid brittle CSS selectors tied to layout or icon structure
- add `data-testid` intentionally, not everywhere

`data-testid` naming convention: use lowercase kebab-case, scoped from the
component outward. Examples: `data-testid="topbar-theme-toggle"`,
`data-testid="sidebar-nav-flows"`, `data-testid="page-blocks-heading"`.
Avoid generic names like `data-testid="button"` or PascalCase.

## What Makes A Good Browser Test

A good test:

- checks a real user-facing behavior
- uses stable selectors
- keeps setup small
- avoids arbitrary sleeps
- fails with a clear reason

A bad test:

- depends on fragile markup details
- clicks through unrelated screens just to reach the target
- relies on timing hacks
- tries to validate too many things at once

## Test Data and Environment

To keep browser tests maintainable, we should prefer:

- deterministic local dev data when possible
- test cases that do not require external auth to pass
- predictable routes and shell-level assertions first

If a screen depends on backend data, the first smoke assertion should still aim
to verify that the page renders a valid loading, empty, or ready state instead
of assuming a fully populated dataset.

## Proposed Initial Test Cases

These are the first browser tests worth implementing:

### `app-shell.spec.ts`

- renders the app shell
- shows the `Studio` brand
- shows topbar and sidebar containers

### `navigation.spec.ts`

- loads `/`
- navigates to `Pages`
- navigates to `Blocks`
- navigates to `Settings`
- returns to `Flows`

### `topbar.spec.ts`

- shows the theme toggle
- allows clicking the theme toggle
- shows `Sign in` when the user is not authenticated

### `routes.spec.ts`

- direct-loads `/flows`
- direct-loads `/pages`
- direct-loads `/blocks`
- direct-loads `/settings`

## Definition of Done For Browser Test Additions

A new browser test addition is considered complete when:

- the scenario is described clearly
- the test runs locally
- the assertions focus on user-visible behavior
- selectors are stable
- the test does not introduce avoidable flakiness

## Next Implementation Steps

1. add `@playwright/test` and install Chromium (see Setup above)
2. create `playwright.config.ts` with the `webServer` block
3. add the first smoke specs from the proposed test cases above
4. run them locally and tighten selectors where needed
5. add the CI step so tests run on every PR

## Later Expansion

Once browser smoke coverage is healthy, we can add:

- deeper workflow coverage
- controlled authenticated scenarios
- visual regression snapshots for a few critical pages
- Tauri desktop smoke tests for native concerns only

That later phase should build on this browser-first baseline, not replace it.
