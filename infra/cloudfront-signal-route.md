# CloudFront: `/signal/*` → Signal Lambda (manual)

The nealon.tech CloudFront distribution (`E2G1CF1OWQH84U`) is **hand-managed** (not in IaC). On
2026-07-03 an origin + behavior were added by hand so the Signal newsletter's subscribe/confirm/
unsubscribe endpoints live on the apex domain (branded links, no CORS). deploy.sh does **not** manage
the distribution — it only invalidates. If the distribution is ever recreated, re-add this.

**What was added (additive — default behavior + S3 origin untouched):**

- **Origin** `signal-fn` → the nealon-signal Function URL
  (`xanlq6junsnrxyvjoopwylyjiy0rhhei.lambda-url.ap-southeast-2.on.aws`), custom origin, https-only,
  TLSv1.2.
- **Cache behavior** `PathPattern: /signal/*` → `signal-fn`:
  - AllowedMethods: GET,HEAD,POST,PUT,PATCH,OPTIONS,DELETE (POST needed for /subscribe)
  - CachePolicyId `4135ea2d-6df8-44a3-9df3-4b5a84be39ad` (Managed-CachingDisabled)
  - OriginRequestPolicyId `b689b0a8-53d0-40ab-baf2-68738e2966ac` (Managed-AllViewerExceptHostHeader)
  - **No** viewer-request function (the crawler/rewrite fn must NOT run on the API paths).

`/signal` (exact) stays on the default behavior → the `cf-writing-rewrite` function rewrites it to
`/signal.html` (prerendered). `/signal/*` (subpaths) hit the new behavior → Lambda. No conflict.

**To reproduce:** `aws cloudfront get-distribution-config --id E2G1CF1OWQH84U`, append the origin to
`Origins.Items` (+Quantity) and the behavior to `CacheBehaviors.Items` (+Quantity) — copy the default
behavior's shape then override path/target/methods/policies and drop FunctionAssociations —
`update-distribution --if-match <ETag>`. The Signal Lambda builds its links from `LINK_BASE=
https://nealon.tech/signal` (set on the nealon-signal stack), so this routing is what makes those
links resolve.
