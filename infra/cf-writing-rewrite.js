// CloudFront Function (viewer-request) — two jobs:
//  1) Block declared AI *training* crawlers (belt-and-suspenders over robots.txt; also
//     catches honest-UA scrapers that ignore robots.txt). Spoofed browser-UA crawlers
//     (Bytespider/Grok stealth, etc.) can't be caught here — that's the accepted limit
//     of the no-WAF approach. Keep this list in sync with the Disallow block in
//     public/robots.txt. Control-only tokens (Applebot-Extended, Google-Extended) are
//     NOT here — they never send requests, they only mean anything in robots.txt.
//  2) Serve prerendered per-article OG HTML:
//     /writing -> /writing.html ; /writing/<slug> -> /writing/<slug>.html
//     everything else passes through; missing .html -> distribution 404 -> /index.html SPA.
var BLOCKED_AI_TRAINING = [
  'gptbot', 'claudebot', 'ccbot', 'bytespider', 'amazonbot',
  'meta-externalagent', 'cohere-training', 'ai2bot', 'omgili',
  'webzio', 'pangubot', 'grokbot'
];

function handler(event) {
  var request = event.request;

  // ---- 1) Block AI training crawlers by User-Agent ----
  var uaHeader = request.headers['user-agent'];
  if (uaHeader && uaHeader.value) {
    var ua = uaHeader.value.toLowerCase();
    for (var i = 0; i < BLOCKED_AI_TRAINING.length; i++) {
      if (ua.indexOf(BLOCKED_AI_TRAINING[i]) !== -1) {
        return {
          statusCode: 403,
          statusDescription: 'Forbidden',
          headers: { 'content-type': { value: 'text/plain' } },
          body: 'Forbidden: AI training crawler. See https://nealon.tech/robots.txt'
        };
      }
    }
  }

  // ---- 2) Prerendered OG rewrites ----
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
