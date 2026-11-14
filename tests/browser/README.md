# Worker lifetime regression

Run `npm run dev`, then open `/tests/browser/worker-lifetime.html` locally. This harness is not an entry in the production build.

1. Initial protected read shows checking balance 4280.55.
2. Transfer 50 shows the real mock POST response with balance 4230.55.
3. Simulate inactive client sends MSW's CLIENT_CLOSED message without reloading the page or clearing page-owned handlers.
4. Raw API read bypasses the inactive mock and returns the static host's HTML/404 instead of account JSON. This reproduces the old retry path.
5. Protected API read reactivates the client and returns account JSON with balance still 4230.55. The transfer is not replayed and the mock data is not reset.

This is a deterministic simulation of lost worker-side client activation, not a claim that an overnight browser suspension has been reproduced. The adapter uses the message protocol in the locked MSW 2.x worker; revisit it when upgrading MSW. Do not edit the generated worker itself.
