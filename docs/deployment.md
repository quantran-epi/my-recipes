# Deployment

When the user asks to deploy this app, use these steps.

1. Build the app:

```bash
yarn build
```

2. Copy every file from `build/` into `docs/`, except `build/manifest.json`.

- Keep the existing `docs/manifest.json`.
- Copy generated files such as `build/index.html`, `build/asset-manifest.json`, `build/service-worker.js`, and `build/static/` into `docs/`.

3. Stage source changes:

```bash
git add ./src/*
```

4. Stage deployed docs output:

```bash
git add ./docs/*
```

5. Push to remote:

```bash
git push
```

Notes:

- Do not delete the whole `docs/` folder during deploy because it also contains deployment data and documentation.
- Do not overwrite `docs/manifest.json` with `build/manifest.json`.
