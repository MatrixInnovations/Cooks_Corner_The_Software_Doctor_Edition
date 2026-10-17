export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

export const fail = (status: number, code: string, message: string, details?: string[], headers?: Record<string, string>) =>
  json(status, { error: { code, message, ...(details ? { details } : {}) } }, headers)

/** Reads at most `max` bytes of the body as text; returns null if it is larger. */
export async function readBody(req: Request, max: number): Promise<string | null> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > max) return null
  const text = await req.text()
  return new TextEncoder().encode(text).length > max ? null : text
}

/** Client IP as Netlify reports it (never trusted for anything but rate limiting). */
export const clientIp = (req: Request) =>
  req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
