type PrepareApi = () => Promise<void>
let prepareApi: PrepareApi = async () => {}

// Browser bootstrap installs the mock transport gate. Node tests use MSW's server.
export function configureApiReadiness(prepare: PrepareApi): void {
  prepareApi = prepare
}

export async function waitForApi(signal?: AbortSignal | null): Promise<void> {
  signal?.throwIfAborted()
  await prepareApi()
  signal?.throwIfAborted()
}
