// Static single-page app (DECISIONS D-13): pages render only in the browser, where the
// local repository and the calculation worker live. Prerender the shell so the
// static host serves real index.html at / (D-41: Cloudflare Pages returned 404
// on the fallback-only build, which emits 200.html without index.html).
export const ssr = false;
export const prerender = true;
