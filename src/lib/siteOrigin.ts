// The public origin the visitor used (e.g. https://clarivex.app or
// http://localhost:3000). Behind the host's proxy, request.url is the internal
// bind address (http://0.0.0.0:10000), so read the forwarded headers instead.
export function getSiteOrigin(request: Request): string {
  const fallback = new URL(request.url);
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0].trim() ||
    request.headers.get('host') ||
    fallback.host;
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    fallback.protocol.replace(':', '');
  return `${proto}://${host}`;
}

// The origin to put in emailed links. SITE_URL pins it to the real domain so a
// forged Host header can't send a token somewhere else; locally it falls back
// to the request.
export function getPublicSiteUrl(request: Request): string {
  return (process.env.SITE_URL || getSiteOrigin(request)).replace(/\/+$/, '');
}
