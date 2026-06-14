// CloudFront Function (viewer-request) — serve prerendered per-article OG HTML.
// /writing            -> /writing.html
// /writing/<slug>     -> /writing/<slug>.html   (so crawlers get article-specific meta)
// everything else passes through unchanged; if a .html is missing, the distribution's
// 404 -> /index.html fallback still renders the SPA.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Files with an extension (assets, *.html, *.png, etc.) pass through.
  if (uri.indexOf('.') !== -1) return request;

  // Section index.
  if (uri === '/writing' || uri === '/writing/') {
    request.uri = '/writing.html';
    return request;
  }

  // Article deep links.
  if (uri.indexOf('/writing/') === 0) {
    var u = uri.charAt(uri.length - 1) === '/' ? uri.slice(0, -1) : uri;
    request.uri = u + '.html';
    return request;
  }

  return request;
}
