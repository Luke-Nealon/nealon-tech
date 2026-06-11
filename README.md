# nealon.tech

Personal site for Luke Nealon. React + Vite, static output, no runtime dependencies
beyond React. All copy lives in `src/content.js`.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
```

## Build

```sh
npm run build      # outputs static site to dist/
npm run preview    # serve the production build locally
```

## Deploy to S3

```sh
# Hashed assets: cache forever
aws s3 sync dist/ s3://YOUR_BUCKET \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude index.html

# index.html: never cache (so deploys go live immediately)
aws s3 cp dist/index.html s3://YOUR_BUCKET/index.html \
  --cache-control "no-cache"
```

If serving through CloudFront, invalidate after deploy:

```sh
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/index.html"
```

Vite is configured with `base: './'` so the build works from the bucket root or any prefix.

## House rules

- No current-employer or client names anywhere on this site.
- Copy edits go in `src/content.js` — components don't contain prose.
