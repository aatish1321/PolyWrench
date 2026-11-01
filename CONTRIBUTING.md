# Contributing to PolyWrench

Use Node.js 24 LTS. Run `npm ci`, `npx install-electron --no` and `npm run dev:desktop`.

Keep changes focused. Reuse existing tools and patterns instead of rebuilding their logic. New native conversion or setup behavior needs a small meaningful test. Run `npm run check`, `npm run build` and the relevant GUI smoke checks before submitting a change.

Include your OS, engine version and non-sensitive reproduction steps in bug reports. Do not commit personal files, credentials, downloaded models/engines or build outputs. Preserve attribution and license notices for reused code. Keep private `.agents`, `.codex` and `.aws` directories out of commits.

Changing downloadable assets requires review of the pinned source, file digests and license terms, followed by installation and offline tests. Re-run the tool inventory when tool coverage changes. Do not call route-rendering checks full functional coverage.
