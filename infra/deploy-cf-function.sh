#!/usr/bin/env bash
# Deploy the nealon-writing-rewrite CloudFront Function (AI-training-crawler block +
# /writing OG-HTML rewrites). CloudFront Functions are global — no --region.
# Flow: update the DEVELOPMENT stage, then publish DEVELOPMENT -> LIVE. The distribution's
# viewer-request association points at the LIVE stage, so publishing propagates it (no
# update-distribution needed). Re-run this whenever infra/cf-writing-rewrite.js changes.
set -euo pipefail
cd "$(dirname "$0")"

PROFILE=personal
NAME=nealon-writing-rewrite

node --check cf-writing-rewrite.js

ETAG=$(aws cloudfront describe-function --name "$NAME" --profile "$PROFILE" \
  --query 'ETag' --output text)

NEW_ETAG=$(aws cloudfront update-function --name "$NAME" \
  --function-code fileb://cf-writing-rewrite.js \
  --function-config Comment="Block AI training crawlers + route /writing OG html",Runtime=cloudfront-js-2.0 \
  --if-match "$ETAG" --profile "$PROFILE" --query 'ETag' --output text)

aws cloudfront publish-function --name "$NAME" --if-match "$NEW_ETAG" \
  --profile "$PROFILE" --query 'FunctionSummary.Status' --output text

echo "✓ published $NAME to LIVE"
