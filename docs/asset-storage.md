# Independent game assets

The Site uses its existing `BUCKET` R2 binding. Original URLs under `/assets/` are preserved. Selected game files live inside immutable SHA-256 addressed packs in R2; the Worker reads only the requested byte range. The immutable JSON index is pinned in `lib/asset-storage-config.json` for each deployment, so old versions retain their matching assets.

Original assets remain tracked in `public/assets`. Normal builds retain the existing dragon frame selection, validate files against `lib/asset-storage-release.json`, and exclude those files from deployment output. The build fails if an externalized file changes without a matching storage release. New, unmigrated files remain in the deployment until the next migration.

## Updating stored assets

1. Build with `ASSET_STORAGE_PREPARE=1 node scripts/build-dragons.mjs`, then run `node scripts/prepare-asset-storage.mjs` in the same shell operation. This keeps built assets for migration and writes reproducible packs to ignored `.asset-storage/`.
2. Confirm the Site remains owner-private. The upload endpoint relies on the Sites owner-only access boundary. Add explicit server-side upload authorization before any change to a shared/public audience.
3. Obtain the selected Site's service token through Sites. Run `python scripts/upload-asset-storage.py`, supplying a JSON object with `origin` and `token` through stdin only. Never put credentials in arguments, files, source or logs. It verifies all packs locally and server-side, uploads the index last, and writes a non-secret receipt.
4. Run `node scripts/activate-asset-storage.mjs`. It requires the matching successful upload receipt and pins the release.
5. Build/package with the normal Sites workflow. Keep final trimming and packaging in the same preparation operation. Check the archive's expanded size, not only its compressed size.
6. Publish and verify representative images, animation frames, JSON data, audio, range requests, HEAD and ETags. Responses from R2 include `X-Asset-Storage: r2`.

`node scripts/test-asset-storage.mjs` covers exact pack offsets, range handling, cache validation, fallback, and upload checksums without accessing production data. Runtime asset updates use the upload endpoint `/api/internal/asset-storage/<sha256>`, limited to 10 MiB per object and immutable keys. No database migration is needed. Never delete old R2 packs during release publication; earlier deployments may still reference them.
