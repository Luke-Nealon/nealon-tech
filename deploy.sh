#!/usr/bin/env bash
# Deploy nealon.tech — build, upload to S3, invalidate CloudFront.
set -euo pipefail
cd "$(dirname "$0")"

PROFILE=personal
BUCKET=nealon-tech-site-389901108572
DISTRIBUTION=E2G1CF1OWQH84U

npm run build

# hashed assets: cache forever
aws s3 sync dist/ "s3://$BUCKET" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude index.html --profile "$PROFILE"

# index.html: never cache, so deploys go live immediately
aws s3 cp dist/index.html "s3://$BUCKET/index.html" \
  --cache-control "no-cache" --profile "$PROFILE"

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" \
  --paths "/index.html" --profile "$PROFILE" --output text --query 'Invalidation.Id'

echo "✓ deployed → https://nealon.tech"
