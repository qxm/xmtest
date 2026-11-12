# Transfer

- `schema.ts`: one schema for blur, step navigation, and final-submit validation. Amount stays a string until request serialization. Balance and daily-limit validation use current Query data.
- `TransferDialog.tsx`: native modal dialog, shared React Hook Form state, recipient/amount/review steps, mutation and success state. Saved payees send only `payeeId`; new recipients send only `recipient`.
- `src/api/transfers.ts`: typed POST endpoint.

The mutation never retries automatically. A ref guards concurrent submits while buttons prevent repeated interaction. Sending disables navigation and closing. API field errors return to the matching input when the user goes back; failure stays on review and preserves all form values.

On success, account and customer caches use the authoritative response, then banking queries refresh. A refresh failure is displayed separately from a transfer failure and only retries GET requests.

The dialog uses native modal focus containment, returns focus to the opener, handles Escape, and becomes a full-screen sheet below 1024px. New transfer is fixed at the bottom below 640px.

Tests cover over-balance rejection without POST, duplicate-submit protection, dashboard refresh, new recipients, server validation, failed-send retry, refresh failure after success, amount boundaries, and note limits. jsdom stubs dialog open/close; real-browser smoke checks cover the native modal, success, focus return and Escape.

Manual failure demo: enter `#fail` in Note, proceed to Review and confirm. The mock API returns an error without moving funds. Change the note to retry successfully. Reloading resets the in-memory mock data.

## Draft closing

Closing an unfinished transfer (X, Cancel or Escape) asks `Discard this transfer?`. `Keep editing` is initially focused, preserves form values and returns focus to the triggering control. Escape dismisses the confirmation and keeps editing. `Discard` unmounts the form; reopening starts fresh. A pristine form and a successful transfer close directly; sending still blocks closing. Search text alone is not treated as transfer data.
