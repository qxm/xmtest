# Meridian Banking

A single-page banking demo built with React 19, TypeScript, Vite, TanStack Query, React Hook Form and Zod. MSW supplies the same mock API in the browser and tests; no backend or login is required.

- Repository: [qxm/xmtest](https://github.com/qxm/xmtest)
- Public deployment: [xmtest-kappa.vercel.app](https://xmtest-kappa.vercel.app/). Browser smoke check confirmed customer, accounts, recent transactions and daily-limit usage load successfully. The project owner also verified a successful hosted transfer, failure with `#fail` followed by an edited-note retry, and reload with banking data reset.
- Runtime: **Node 22**, specified in [.nvmrc](.nvmrc).
- Latest local verification, 12 November 2026: **52 tests across 8 files**, lint, typecheck and production build passed. The project owner confirmed that the latest GitHub Actions run passed.

## Run locally

```sh
git clone https://github.com/qxm/xmtest.git
cd xmtest
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. If that port is occupied, use the actual address printed in the terminal.

In Windows PowerShell, use `npm.cmd` in place of `npm` if PowerShell selects a blocked or broken `npm.ps1`. Install dependencies separately for Windows and WSL; do not share `node_modules` between them.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run check` | ESLint, strict TypeScript checking and all tests |
| `npm test` | Run tests once |
| `npm run test:watch` | Watch tests during development |
| `npm run build` | Typecheck and build into `dist/` |
| `npm run preview` | Serve the production build locally, normally on port 4173 |

Vite and Vitest scripts select `--configLoader runner` directly. This avoids configuration bundling through esbuild, which encountered parent-directory permissions in the Windows development environment. No extra CLI flag is needed.

MSW starts before React renders and remains enabled in production. Serve the app on localhost or HTTPS so the service worker can register. Mock balances, transfers and transactions live in memory: **reloading the page resets banking data**. Theme and brand choices persist in localStorage when available.

## Features and scope

- Parallel customer, account and latest-eight-transaction queries; deposit-only total, three account cards and daily transfer limit with usage progress.
- Case-insensitive transaction search by description or category, result count, clear action, empty states and dashboard retry.
- Recipient selection/search or a new recipient; amount, source account, shortcuts and note; review; explicit confirmation; success with an API reference.
- Shared validation, field-level API errors, retry after failure and dashboard refresh after success.
- Light/dark and Retail/Premium combinations, responsive layout, keyboard support and unfinished-transfer discard confirmation.

The app has no routes. Cards, Payments and Insights are disabled navigation items. Account management, persistent payee creation, other currencies and a real banking backend are outside this demo's scope. A new recipient is used for that transfer; it is not added to the saved-payee list.

### Deliberate changes from the original brief

At the project owner's request, the greeting uses Singapore time: morning before 12:00, afternoon from 12:00 to 17:59, and evening from 18:00. It updates every 30 seconds and when the page becomes visible or focused. The name and avatar come from the customer response.

The mock customer's first name was changed from Ava to **Jason** for manual verification. The original assignment's fixed `Good evening, Ava` / `AC` is therefore not reproduced literally. Mock handlers were not changed to bypass validation or make tests pass.

## Project structure

```text
src/
  app/query-client.ts        QueryClient defaults
  api/                       API types, HTTP errors, queries and transfer POST
  components/                App header and shared skeleton text
  features/
    dashboard/               Queries, derived totals, cards, search, loading layout
    preferences/             Theme and customer-brand overrides
    transfer/                Shared form, schema, dialog, submission and result
  lib/                       SGD/date formatting and time-based greeting
  mocks/                     Browser MSW setup and shared handler exports
  test/setup.ts              MSW server, data reset and DOM cleanup
public/preferences.js         Preference bootstrap before the first paint
brief/                       Original requirements, API contract and design tokens
mock-api/                    Shared mock handlers and seed data
.github/workflows/ci.yml      Automated check and build
```

The original [brief](brief/candidate-brief.md), [API contract](brief/api-contract.md) and [wireframe](wireframes/wireframe.md) remain available for comparison. Transfer-specific details are in [the transfer notes](src/features/transfer/README.md).

## Decisions and trade-offs

**Server state and UI state.** TanStack Query owns customer, accounts, transactions and payees. Components do not copy API responses into local state. Deposit totals, remaining limit and usage are calculated from query data. Local state holds UI choices such as search text, the current step and whether a dialog is open. Queries are fresh for 30 seconds and may retry once; transfer mutations never retry automatically.

**Search.** The dashboard filters only the eight loaded recent transactions in the browser. This keeps typing immediate and avoids extra requests. It is not a search across the customer's entire transaction history.

**Forms.** One React Hook Form instance spans all steps, with `shouldUnregister: false` to retain values when stepping back. A Zod schema is used for blur validation, Continue and final submission. It reads current balances, remaining limit and valid payee IDs. Amount stays a string until serialization, allowing validation of decimal places before conversion. Account numbers remain strings to preserve leading zeroes. API field errors are mapped back to the matching form fields.

**Sending and refreshing.** Only Confirm sends the POST. A synchronous submission guard and disabled controls prevent duplicate interaction; closing is blocked while sending. After a successful response, the account and customer caches use the returned authoritative values, then banking queries refresh. A refresh error is kept separate from a sending error and offers GET refresh rather than resending money. Background transaction refresh can finish shortly after returning to the dashboard.

**Themes.** A blocking head script sets root attributes before React starts. Stored theme wins over the system's initial preference. For brand, an explicit saved or current-session choice wins over `customer.segment`; Retail is a temporary fallback before the customer arrives. Server defaults are not saved as user overrides. Components consume the supplied CSS tokens. If storage is unavailable, controls still work for the session.

**Loading and layout.** Skeletons reuse the real balance, account, transaction and limit components, preserving their typographic slots. For the default three accounts and eight transactions, the measured region positions/heights matched before and after loading at 360, 390 and 1280px. This is not a zero-CLS guarantee for arbitrary content or empty/error transitions.

**Accessibility.** The transfer uses native `dialog.showModal()` with explicit Tab/Shift+Tab boundary handling, initial/step focus, first-invalid-field focus and focus restoration. Saved payees use native radios. Labels and error descriptions are linked; send errors use alerts and success uses a live region. Discard confirmation initially focuses Keep editing, and Escape returns to editing. Mobile uses a full-screen transfer sheet below 1024px and a fixed dashboard CTA below 640px.

## Loading, empty and error states

| State | How to reproduce |
| --- | --- |
| Initial loading | Reload. The mock API delays responses by about 500ms, during which the shared skeleton is shown. |
| Search empty | Search for an unmatched description/category; use Clear search to restore the list. |
| Field validation | Choose a recipient, then enter `4500` from the seed checking account, or enter a new recipient account number with fewer than eight digits. Continue focuses the first invalid field. |
| Transfer failure | Enter `#fail` in Note and confirm. The mock API rejects the transfer without moving funds. Edit the note and retry. |
| Discard draft | Select a recipient or enter transfer details, then close with X, Cancel on the first step, or Escape. Keep editing retains the draft; Discard clears it. |
| Dashboard request failure | Reproduced by an MSW override in `src/App.test.tsx`; the optional browser recipe below works on a local or deployed build. |
| Empty accounts, transactions or payees | Covered by MSW overrides; the browser recipe below can also return an empty list. |
| Success, then refresh failure | Covered by a transfer integration test: the POST succeeds, transaction refresh fails, and the success screen offers a dashboard refresh without another POST. |

### Optional browser recipe for dashboard error / empty data

There is no debug menu in the main UI. To inspect these states without editing the mock handlers, open browser DevTools on the running app and paste this temporary GET-response override. Choose `error` or `empty`, and the desired list. It also works on a future deployed build because it runs in that page's browser context.

```javascript
(() => {
  window.restoreMeridianDemo?.()
  const scenario = 'empty' // 'error' or 'empty'
  const target = 'transactions' // 'accounts', 'transactions', or 'payees'
  const originalFetch = window.fetch.bind(window)
  const empty = {
    accounts: { accounts: [] },
    transactions: { transactions: [], total: 0 },
    payees: { payees: [] },
  }
  window.restoreMeridianDemo = () => {
    window.fetch = originalFetch
    delete window.restoreMeridianDemo
  }
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href)
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    if (method.toUpperCase() === 'GET' && url.pathname.endsWith(`/api/${target}`)) {
      const body = scenario === 'error'
        ? { error: { code: 'INTERNAL_ERROR', message: 'Demo request failure.' } }
        : empty[target]
      return new Response(JSON.stringify(body), {
        status: scenario === 'error' ? 500 : 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return originalFetch(input, init)
  }
})()
```

After installing it, allow 31 seconds for cached queries to become stale, switch to another browser tab and back, and the active dashboard queries refetch. For payees, open the transfer dialog after the cache is stale. For a dashboard error, target `accounts` or `transactions`.

To recover, run `window.restoreMeridianDemo()` and click Retry, or reload the page. Reload removes the temporary override and resets mock banking data. Do not append `?scenario=empty` to the app URL: API hooks apply to requests, not to the page URL.

## Tests and verification

Vitest, Testing Library and MSW test user-visible behavior rather than component internals. Each test resets mock banking data and response overrides. jsdom stubs native dialog open/close; real-browser checks complement those tests.

Coverage includes:

- Parallel loading, deposit totals excluding credit, eight recent transactions, search, empty data and request failure followed by Retry.
- Dynamic identity, Singapore greeting boundaries and greeting changes while the page remains open.
- Amount/limit boundaries, invalid formats, leading account zeroes, note length and deposit-only source accounts.
- Over-balance input sends no POST; success updates the dashboard; repeated clicks produce only one POST.
- New-recipient serialization, failure/edit/retry, server field errors and refresh failure after a successful transfer.
- Modal focus boundaries, draft retention/discard, Escape, focus restoration and empty payee selection.
- Four theme combinations, persistence, storage failure and customer defaults that do not overwrite a user's choice.
- Daily limit progress at empty, partial, full and zero limits.

Latest local result: **52 tests in 8 files passed**, along with `npm run check`, `npm run build` and `git diff --check`.

Manual browser checks covered 360, 390, 640, 768, 1024 and 1280px widths, no page-level horizontal overflow, the mobile CTA, all four theme/brand combinations, keyboard selection/focus, complete mock transfers and discard confirmation. Major text/button/status color pairs were checked at more than 4.5:1 contrast; this is not a full accessibility certification.

## CI and deployment

The [CI workflow](.github/workflows/ci.yml) runs on push, pull request and manual dispatch using Ubuntu / Node 22. It installs locked dependencies, runs check/build and verifies the two required browser scripts are present in `dist/`. It requires no custom secrets. See [CI notes](docs/ci.md). The project owner confirmed that the latest GitHub-hosted CI run passed; see the [Actions history](https://github.com/qxm/xmtest/actions) for run details.

For static hosting, use Node 22, build command `npm run build`, and output directory `dist`. MSW runs in the browser in the built app, so the optional Node mock server is unnecessary. See [DEPLOYMENT.md](DEPLOYMENT.md) for service-worker and hosting details.

Hosted transfer success, failure/retry, reload and the latest GitHub CI run have been confirmed by the project owner. Before submission, confirm these browser checks used a normal browser and push any final documentation changes.


## Not done / known issues

- Hosted dashboard loading was checked in the in-app browser. The project owner confirmed transfer success, `#fail` failure with retained inputs, successful retry after editing, and page reload with seed balances restored. The browser used for those checks was not recorded. The project owner also confirmed that the latest GitHub Actions run passed.
- Entity data resets on reload; transfers have no real backend, authentication or cross-session persistence. UI duplicate-submit prevention is not server-side idempotency.
- No automated browser end-to-end suite. Native dialog behavior is checked manually; jsdom does not reproduce it fully.
- Physical iOS/Android keyboards, device safe areas and screen-reader behavior have not been verified on actual devices. Responsive browser emulation is not a substitute for those checks.
- No in-app demo/debug menu; use the documented browser override or automated tests for injected failures and empty lists.
- No balance hiding, third segment or transfer deep link. These were optional and left out to keep the core flow focused.
- Vite's production build reports third-party Zod comment-annotation notices; the build succeeds.
- `TransferDialog.tsx` currently contains the step presentation and orchestration together. A larger scope would justify extracting step components and the modal lifecycle into separate modules.
