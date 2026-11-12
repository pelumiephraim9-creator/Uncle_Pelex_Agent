/* PELEX BUSINESS ADD-ON LOADER
   Load the add-on only on the main Pelex application document.
   The add-on itself checks for the Business dashboard before rendering anything.
   Existing HTML, authentication and other application routes are left untouched. */
const ADDON = '/pelex_addons.js';

export async function onRequest(context) {
  // Redirect only the Pages project hostname to the canonical public domain.
  const requestUrl = new URL(context.request.url);
  if (requestUrl.hostname === 'pelex-dev.pages.dev') {
    const destination = new URL(requestUrl.pathname + requestUrl.search, 'https://pelex.tech');
    return Response.redirect(destination.toString(), 301);
  }
  const pathname = new URL(context.request.url).pathname;
  if (pathname !== '/' && pathname !== '/index.html') {
    return context.next();
  }

  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const rewriter = new HTMLRewriter().on('body', {
    element(element) {
      element.append('<script src="' + ADDON + '" defer></script>', { html: true });
    }
  });
  return rewriter.transform(response);
}
