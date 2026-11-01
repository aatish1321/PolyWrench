# CI compatibility fixes — PolyWrench 0.1.2

- macOS smoke failures came from asserting blur while the runner requested reduced transparency. The test now explicitly checks both transparency preferences, preserving the application's accessibility behavior.
- The PDF.js 6 update PR removed document `destroy()` and viewport rectangle conversion methods. All affected tools, PDF Studio and unit fixtures now use loading-task cleanup and viewport point conversion, supported by PDF.js 5 and 6. Type checking and the 104-route Electron smoke passed against PDF.js 6.2.108; smoke now renders, clears and reopens an actual PDF.
- Legacy Ember build helpers pinned vulnerable `tmp` versions that Dependabot could not upgrade. A targeted override resolves all copies to 0.2.7. A regression test exercises symlink detection, file watching and external-editor temporary-file creation/cleanup through the actual helpers.
- Workflow concurrency cancels superseded runs for the same branch or PR. Dependency update checks remain enabled.

# Branding, type and motion — PolyWrench 0.1.2

Verified on Ubuntu x86-64, 2026-11-01:

- Production build, type checking, focused ESLint and 10 native regression tests passed.
- Desktop smoke passed on 104 routes, including direct workflow links and the privacy page.
- Application-owned visible text, titles, accessibility labels and links are checked for old branding on every tested screen; the Image Studio About dialog and settings menu are checked explicitly.
- Bricolage Grotesque and IBM Plex Sans were confirmed loaded from bundled font files. Frosted panel styles were checked, and reduced-motion emulation disabled entrance animations.
- Light, dark and compact layouts were captured after entrance motion settled. Actual image conversion still passed through the new interface.
- Paste-image filename branding was checked against the actual download-name function. Palette and transliteration exports now use the application's name.
- The 0.1.2 AppImage and deb were built. Packaged font bytes match their source assets, and the old website CLI installer is absent from the package.
- Existing note storage keys and document-format identifiers were preserved; application branding changes do not rewrite user content.
- After the merged Transformers 4.3.2 dependency update, the production build, type/native checks and 104-route smoke passed again. Actual Whisper Base CPU inference and Pandoc WASM Markdown-to-Word conversion both passed with networking disabled. Dependency license notices were refreshed from the installed lockfile.

The original processing code's license notices remain packaged. Credits are not displayed in the application; project attribution remains in the README and required license/provenance files.

# Interface update — PolyWrench 0.1.1

Verified on Ubuntu x86-64, 2026-11-01:

- Type checking and focused ESLint checks passed. The merged dependency updates (including Vite 8.3.5 and Satori 0.33.5) were installed and the production build, native checks and desktop smoke verification were rerun.
- All 102 desktop routes rendered; all individual tool routes use the new PolyWrench header and shared control styling.
- Dashboard tool counts are checked against the generated inventory; all three quick-pick links are present.
- Light/dark themes and the compact 960px window were checked, including no horizontal document overflow.
- An actual image was loaded and converted through the redesigned Image Converter controls.
- The replacement logo was used in the app, README asset, window icon and freshly built 0.1.1 AppImage/deb packages.
- The original Windows CI startup timeout was addressed in the test harness. The harness now attaches listeners before a controlled reload, disables hardware rendering for CI on all platforms, and saves screenshots, HTML and Electron diagnostics on failure. CI uploads these even when smoke checks fail. The new workflow run confirmed that the Windows smoke step passed and advanced to installer packaging. Ubuntu CI completed successfully. A longer timeout alone was not treated as a fix. The previous limited log does not establish whether rendering or startup timing caused that earlier failure; real Windows hardware was not tested.

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
