# Offline background removal and file types — PolyWrench 0.1.6

- Fixed BRIA RMBG-1.4 loading by constructing its custom ONNX model and segmentation pipeline directly, avoiding the unsupported auto-model dispatch. Both Background Remover and Image Studio use the same loader, installed fp16 model, local-only configuration and GPU/CPU fallback. Existing model files do not need to be re-downloaded.
- Updated processing descriptions, progress messages, onboarding and storage labels to describe local device processing and optional installation through Offline Setup. Removed stale browser/CDN and automatic first-use download claims.
- Added shared MIME detection for known extensions when OS metadata is blank or generic, plus MIME aliases. Applied it to workflow/paste/drop matching, image/media tools, Image Studio, image-to-PDF and PDF image/signature placement. SVG imports reuse the shared image decoder. A blank-MIME image dropped into an open PDF is placed without replacing the document.
- Native conversion recognizes `.tif`, `.jpe`, `.aif`, `.wave` and `.htm`. Fixed HTML input incorrectly using Pandoc’s `html5` writer name; real managed-engine HTM-to-DOCX and TIF-to-PNG conversions passed.
- Type checks, production build and all 17 desktop regression tests passed. Clean-profile and real-installed-model Electron runs passed all 104 routes. Real CPU inference produced transparent background and retained foreground pixels, and Image Studio’s background-removal effect completed using the same local model. Tests also cover missing-model setup guidance, blank-MIME PNG/SVG imports and preservation of an open PDF’s existing signatures after dropping an image.
- The packaged Ubuntu application also passed all 104 routes with real offline inference in both Background Remover and Image Studio. Its package metadata identifies version 0.1.6, amd64.
- The [tagged release workflow](https://github.com/aatish1321/PolyWrench/actions/runs/41514133471) passed on Ubuntu, Windows, Intel macOS and Apple Silicon macOS and published [v0.1.6](https://github.com/aatish1321/PolyWrench/releases/tag/v0.1.6). All five installers and the checksum file returned HTTP 200 without authentication; installer digests matched `SHA256SUMS.txt`, and the latest-release link resolved to 0.1.6.
- The separate [main-branch workflow](https://github.com/aatish1321/PolyWrench/actions/runs/41514132415) initially failed only while ejecting a temporary Intel Mac DMG (`hdiutil: Resource busy`). A targeted rerun on a clean runner passed, including DMG creation. The successful release workflow and its installers were unaffected; no application change was needed for the runner failure.
- Focused ESLint checks found one pre-existing empty catch in FabricCanvas’s development export probe; no application behavior was changed for that diagnostic. The complete legacy lint and browser unit suites are not claimed as clean. File recognition still requires a compatible decoder and valid contents; every possible format/codec combination was not tested.

# PDF signatures and Carbon Ice — PolyWrench 0.1.5

- Reused the integrated PDF editor for content editing, annotations, page operations, forms and redaction; added a direct sidebar entry and usage guidance.
- Added typed visual signatures alongside drawing and uploads. JPEG uploads are decoded and normalized to PNG before PDF embedding. Upload errors are shown in the panel, and placed images fit the page.
- Applied Carbon Ice with matching light/dark palettes, Google Sans, glass surfaces and raised icon tiles. Fixed legacy editor tokens overriding dark colors and replaced the repeating editor backdrop with a quiet dot grid. Reduced-motion and reduced-transparency preferences remain supported.
- Production build, type checking, focused ESLint and all 14 desktop regression tests passed locally. The real Electron smoke test exercises all 104 routes, typed/drawn/JPEG signatures, invalid upload rejection, undo/redo, actual exported PDF image resources, saved-signature persistence after reload and removal.
- The locally packaged Ubuntu application also passed the complete 104-route Electron smoke test, including the signature workflow. Package metadata and bundled Google Sans were verified.
- The [tagged 0.1.5 workflow](https://github.com/aatish1321/PolyWrench/actions/runs/41473984628) passed on Ubuntu, Windows, Intel macOS and Apple Silicon macOS and published [release 0.1.5](https://github.com/aatish1321/PolyWrench/releases/tag/v0.1.5). All five installers and the checksum file returned HTTP 200 anonymously, all installer digests matched `SHA256SUMS.txt`, and the latest-release link resolved to 0.1.5.
- Signatures are visual marks, not certificate-backed signatures. Existing text editing depends on the source PDF’s fonts and encoding; scanned pages are not automatically OCRed. The desktop smoke checks do not constitute a comprehensive review of all PDF editing features.

# Dependency patches and Paper & Vermilion — PolyWrench 0.1.4

- Integrated the PDF.js update PR and retained the earlier loading-task/viewport compatibility fixes. PDF.js 6.2.108 addresses [GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j).
- All minimatch implementations resolve to 11.0.4, addressing [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Older callable imports use a one-line first-party adapter rather than modifying installed dependency files.
- Applied compatible audit updates, glob 14.0.2 for affected modern callers, and fflate 0.7.5 for the legacy font helper. The complete npm audit reported zero known vulnerabilities, including development dependencies, on 2026-11-02.
- Type checking, focused lint and all 14 native/build-dependency regression tests passed. New checks cover old/new minimatch APIs, ordinary glob matching, pre-aborted walks and font ZIP round trips.
- Production build and the 104-route Electron smoke passed on Ubuntu, including actual PDF rendering/cleanup/reopen and image conversion. The selected Paper & Vermilion palette was inspected in light, dark and compact layouts; text/background token contrast checks passed.
- Ubuntu AppImage/deb installers were rebuilt as 0.1.4. Package inspection confirmed the version, selected palette, Google Sans bytes and refreshed dependency notices.
- The [tagged 0.1.4 workflow](https://github.com/aatish1321/PolyWrench/actions/runs/41442209059) completed successfully on Ubuntu, Windows, Intel macOS and Apple Silicon macOS, including the corrected publication job. All five installer links were verified accessible anonymously, and their published asset digests matched `SHA256SUMS.txt`.
- [Release 0.1.4](https://github.com/aatish1321/PolyWrench/releases/tag/v0.1.4) is public and marked latest. PR #19 is merged. GitHub's dependency graph reports the patched PDF.js/minimatch versions, while alert records #5/#76 were still open at this check; they were not manually dismissed to hide their status.

This is a focused dependency patch, not a comprehensive source-code security audit. A clean package advisory check does not establish that all application code is free of vulnerabilities.

# Peach & Teal — PolyWrench 0.1.3

- Applied the selected palette to the dashboard, sidebar, converter artwork, tool controls and editor chrome. Dark mode uses matching teal, peach and gold surfaces.
- Text/background token checks passed the 4.5:1 contrast threshold in both themes. Secondary text was slightly darkened from the preview for readability.
- Production build, focused lint and the 104-route Electron smoke passed on Ubuntu. Light, dark and compact screenshots were inspected; the harness now waits for the selected navigation background to finish changing before theme screenshots.
- Ubuntu AppImage/deb packages were rebuilt as 0.1.3. Package inspection confirmed the version, selected light/dark colors and bundled Google Sans font bytes.

# Google Sans update — PolyWrench 0.1.2

- Google Sans upright and italic variable fonts are bundled locally with their full OFL notice. Replaced interface font assets were removed.
- The production build, focused lint and 104-route Electron smoke passed on Ubuntu. The smoke verifies that headings and controls use the loaded Google Sans family, alongside both transparency preferences and reduced motion.
- Ubuntu AppImage/deb packages were rebuilt; both packaged font files match their source bytes and include the license.
- Peach & Teal, Sky & Butter, and Berry & Pistachio dashboard previews were rendered for selection. The application's current palette remains unchanged pending the user's choice.
- The preceding CI-fix run completed successfully on Ubuntu, Windows, Intel macOS and Apple Silicon macOS: https://github.com/aatish1321/PolyWrench/actions/runs/41348157436 . This result predates the Google Sans change.

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
