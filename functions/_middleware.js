/* PELEX ADD-ONS: adds the Pelex add-on script to every HTML page at the edge.
   Install once. New features go into pelex_addons.js (or extra files listed here); index.html never needs editing again. */
const ADDONS = ['/pelex_addons.js'];

export async function onRequest(context) {
  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let rewriter = new HTMLRewriter();
  rewriter = rewriter.on('body', {
    element(el) {
      for (const src of ADDONS) el.append(`<script src="${src}" defer></script>`, { html: true });
    }
  });
  return rewriter.transform(response);
}
