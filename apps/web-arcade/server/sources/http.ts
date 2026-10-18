export type Fetch = typeof fetch;

/** A third-party API failed or didn't have what we asked for. */
export class UpstreamError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

/** GET a JSON document with a timeout. Throws with the status on non-2xx. */
export async function getJson<T>(url: string, opts: { headers?: Record<string, string>; fetchImpl?: Fetch } = {}): Promise<T> {
  const host = new URL(url).host;
  const res = await (opts.fetchImpl ?? fetch)(url, {
    headers: { accept: "application/json", "user-agent": "gandi-oracle/0.1", ...opts.headers },
    signal: AbortSignal.timeout(15_000),
  }).catch((e: Error) => {
    throw new UpstreamError(`Couldn't reach ${host} (${e.cause instanceof Error ? e.cause.message : e.message})`);
  });
  if (!res.ok) throw new UpstreamError(`${host} responded ${res.status}`, res.status === 404 ? 404 : 502);
  return (await res.json()) as T;
}
