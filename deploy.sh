#!/usr/bin/env bash
# Deploy nealon.tech — build, upload to S3, invalidate CloudFront.
set -euo pipefail
cd "$(dirname "$0")"

PROFILE=personal
BUCKET=nealon-tech-site-389901108572
DISTRIBUTION=E2G1CF1OWQH84U

npm run build

# hashed assets: cache forever. html + SEO/crawler files stay fresh.
aws s3 sync dist/ "s3://$BUCKET" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude index.html --exclude robots.txt --exclude sitemap.xml \
  --exclude llms.txt --exclude privacy.html --exclude graph.json \
  --exclude "writing.html" --exclude "writing/*.html" --profile "$PROFILE"

put() { aws s3 cp "dist/$1" "s3://$BUCKET/$1" --cache-control "no-cache" --content-type "$2" --profile "$PROFILE"; }
put index.html   text/html
put privacy.html text/html
put robots.txt   text/plain
put llms.txt     text/plain
put sitemap.xml  application/xml
put graph.json   application/json

# prerendered per-article OG pages (kept fresh, not immutable-cached)
put writing.html text/html
for f in dist/writing/*.html; do put "writing/$(basename "$f")" text/html; done

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" \
  --paths "/index.html" "/robots.txt" "/sitemap.xml" "/llms.txt" "/privacy.html" \
          "/writing" "/writing.html" "/writing/*" "/graph" "/graph.json" "/about" "/og/*" \
  --profile "$PROFILE" --output text --query 'Invalidation.Id'

echo "✓ deployed → https://nealon.tech"
