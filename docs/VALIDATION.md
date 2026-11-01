# Interface update — PolyWrench 0.1.1

Verified on Ubuntu x86-64, 2026-11-01:

- Type checking and focused ESLint checks passed. The merged dependency updates (including Vite 8.3.5 and Satori 0.33.5) were installed and the production build, native checks and desktop smoke verification were rerun.
- All 102 desktop routes rendered; all individual tool routes use the new PolyWrench header and shared control styling.
- Dashboard tool counts are checked against the generated inventory; all three quick-pick links are present.
- Light/dark themes and the compact 960px window were checked, including no horizontal document overflow.
- An actual image was loaded and converted through the redesigned Image Converter controls.
- The replacement logo was used in the app, README asset, window icon and freshly built 0.1.1 AppImage/deb packages.
- The original Windows CI startup timeout is not yet explained by its limited log. The harness now attaches listeners before a controlled reload, disables hardware rendering for CI on all platforms, and saves screenshots, HTML and Electron diagnostics on failure. CI uploads these even when smoke checks fail. Windows success must be confirmed by the new workflow run; a longer timeout alone was not treated as a fix.

# Original implementation — PolyWrench 0.1.0

Verified on Ubuntu 26.04 x86-64, 2026-11-01, using Electron 42.11.18. The local development shell used Node 26; CI and the documented development setup use Node 24 LTS.

| Check | Result |
| --- | --- |
| Production Vite/Ember build | Passed |
| Type checking | Passed |
| ESLint for new desktop, setup, converter and smoke-test code | Passed |
| Native regression tests | 10 passed, none skipped in this run |
| Generated registry inventory | 100 entries; component files present |
| Packaged desktop route smoke | 102 routes rendered without uncaught exceptions |
| Renderer network blocking | External fetch rejected |
| IPC trust boundary | Arbitrary unselected filesystem paths rejected |
| Native drag/drop bridge | Real File object resolved and registered successfully |
| Offline restart/process startup | Packaged app used previously downloaded packs from a separate process |
| Actual offline speech inference | Whisper Base CPU inference passed with networking disabled |
| Actual offline document engine | Pandoc WASM converted Markdown to Word with networking disabled |
| Native documents | Managed Pandoc generated DOCX; local LibreOffice exported it to PDF |
| Native images | Managed FFmpeg generated JPG, WebP, AVIF, BMP, TIFF, GIF and ICO |
| Native audio | Real WAV→MP3 conversion, filename collisions and failed-input cleanup passed |
| Linux packaging | AppImage and deb generated successfully |
| Windows/macOS Pandoc archives | Downloaded and inspected executable paths; manifest corrected for both macOS architectures |
| Packaged Node dependency audit | Zero reported vulnerabilities (`npm audit --omit=dev`) |

The final packaged integration run used `scripts/desktop-smoke.mjs` with `ELECTRON_EXECUTABLE` pointing at `release/linux-unpacked/polywrench`. Its optional offline checks use `POLYWRENCH_VERIFY_OFFLINE=1` and a prepared `POLYWRENCH_TEST_DATA` directory. Asset packs were installed by the actual checksum-verifying installer into a temporary directory; weights and binaries are not committed.

## Remaining verification

- Windows x64, macOS Intel and macOS Apple Silicon builds/runtime behavior require their own runners/devices. GitHub Actions is configured for them; local Linux results do not establish cross-platform success.
- Real microphone/camera/screen capture and GPU inference were not exercised. Background-removal inference was not run: the separate restricted model license was not accepted on the user's behalf.
- Tool-route smoke coverage is not exhaustive functional testing of every tool, file format, setting or editor interaction. The full inherited test/verification suite was not run.
- This run did not sign or notarize installers or publish a GitHub release.
- The inherited build/development dependency tree reports 110 npm advisories (4 critical, 20 high, 80 moderate, 6 low). Critical entries are in concurrently, Handlebars, proxy-addr and shell-quote in the development/tooling tree. The renderer is built from dependencies marked as development dependencies for packaging purposes; a clean packaged-Node audit does not establish that bundled renderer code is free of vulnerabilities. A comprehensive dependency/security review remains a release consideration.
