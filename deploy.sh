#!/usr/bin/env bash
# Deploy nealon.tech — build, upload to S3, invalidate CloudFront.
set -euo pipefail
cd "$(dirname "$0")"

PROFILE=personal
BUCKET=nealon-tech-site-389901108572
DISTRIBUTION=E2G1CF1OWQH84U

# Regenerate committed, content-derived assets before building — both are local,
# deterministic (no git churn), and need no AWS/cost, so an article or copy change
# can't ship a stale social card, sitemap, or llms.txt. Deliberately NOT here:
# gen-graph.mjs calls Bedrock ($) and must be run manually — see PROJECT_MEMORY.md.
node scripts/gen-og-images.mjs   # branded OG social cards -> public/og/*.png
node scripts/gen-seo.mjs         # sitemap.xml + llms.txt  -> public/

npm run build

# Guard: prerendered article pages must carry JSON-LD — invalid/missing structured
# data is invisible in a visual QA but breaks rich results, and we ship straight to prod.
missing=$(grep -L 'application/ld+json' dist/writing/*.html || true)
if [ -n "$missing" ]; then
  echo "✗ JSON-LD missing from prerendered pages:" >&2; echo "$missing" >&2; exit 1
fi

# hashed assets: cache forever. html + SEO/crawler files stay fresh.
aws s3 sync dist/ "s3://$BUCKET" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude index.html --exclude robots.txt --exclude sitemap.xml \
  --exclude llms.txt --exclude llms-full.txt --exclude feed.xml \
  --exclude privacy.html --exclude graph.json --exclude 404.html \
  --exclude "writing.html" --exclude "writing/*.html" --exclude "about.html" --exclude "graph.html" \
  --profile "$PROFILE"

put() { aws s3 cp "dist/$1" "s3://$BUCKET/$1" --cache-control "no-cache" --content-type "$2" --profile "$PROFILE"; }
put index.html     text/html
put privacy.html   text/html
put robots.txt     text/plain
put llms.txt       text/plain
put llms-full.txt  text/plain
put sitemap.xml    application/xml
put feed.xml       application/atom+xml
put graph.json     application/json

# prerendered per-route pages (meta + body; kept fresh, not immutable-cached)
put writing.html text/html
put about.html   text/html
put graph.html   text/html
put 404.html     text/html
for f in dist/writing/*.html; do put "writing/$(basename "$f")" text/html; done

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" \
  --paths "/index.html" "/robots.txt" "/sitemap.xml" "/llms.txt" "/llms-full.txt" "/feed.xml" "/privacy.html" \
          "/writing" "/writing.html" "/writing/*" "/graph" "/graph.html" "/graph.json" "/about" "/about.html" "/404.html" "/og/*" \
  --profile "$PROFILE" --output text --query 'Invalidation.Id'

echo "✓ deployed → https://nealon.tech"
