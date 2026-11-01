# Sources, licenses and redistribution

PolyWrench is an independent derivative of Delphi Tools, pinned by `UPSTREAM.json`. Original Delphi code remains under the original 0-BSD notice in `UPSTREAM-LICENSE`. New PolyWrench code is AGPL-3.0-or-later. The repository includes the full AGPL text as `LICENSE`.

## Included runtime works

- **MuPDF 1.28:** AGPL-3.0-or-later. The packaged runtime is in `public/mupdf/`, with its license. Upstream source: https://mupdf.com/releases/ . Use the matching version when providing corresponding source.
- **MediaInfo:** BSD-2-Clause. License in `public/mediainfo/`.
- **jSquash codecs:** MozJPEG, libwebp, OxiPNG, libavif/aom and libjxl. Notices are included in `public/compress/` and `public/jxl/`.
- **Pandoc WASM JavaScript wrapper:** MIT. Its source header and upstream attribution remain in `app/lib/pandoc/pandoc-core.js`. The separately downloaded Pandoc WASM engine is GPL-2.0-or-later.
- **Font files:** Bricolage Grotesque, IBM Plex Sans, Open Sans, iA Writer Quattro, Iosevka and Noto Sans Shavian, SIL Open Font License 1.1. Embedded font notices are recorded in `FONT-NOTICES.txt`. Upstream licenses: https://github.com/googlefonts/opensans/blob/main/OFL.txt , https://github.com/iaolo/iA-Fonts/tree/master/iA%20Writer%20Quattro , https://github.com/be5invis/Iosevka/blob/main/LICENSE.md , https://github.com/notofonts/shavian/blob/main/OFL.txt .
- **Phosphor shapes:** MIT, original notices retained in `app/lib/substrata/preset-shapes.ts`.
- **CMU-derived Shavian dictionaries:** BSD-2-Clause. https://github.com/cmusphinx/cmudict .
- **EFF word list:** CC BY 3.0, Electronic Frontier Foundation. https://www.eff.org/dice .
- **RawTherapee-derived LUTs:** CC BY-SA 4.0; retain this license for derived LUT files. The upstream provenance is recorded in `UPSTREAM-LICENSE`.
- **Electron:** MIT, with Chromium/third-party notices shipped by Electron's packager.
- **Other JavaScript packages:** see `ACKNOWLEDGEMENTS.md`, `package-lock.json` and `NPM-LICENSES.txt`. Build-only designation in npm does not remove license obligations for code incorporated into the renderer bundle.

The source repository, npm lockfile and upstream source links identify the matching sources. When redistributing binaries, retain their notices and provide corresponding source as required by their licenses. Do not describe the complete bundle as exclusively 0-BSD.

## Explicit downloads

`desktop/assets.lock.json` records exact URLs, model revisions, file sizes and SHA-256 digests. Downloading is user-initiated; these engines/models are not vendored into the repository or installers.

- FFmpeg builds are provided by `eugeneware/ffmpeg-static`, release `b6.1.1`; downloaded LICENSE/README files remain beside the binary. Build-specific license and corresponding-source details are in that README.
- Native Pandoc 3.13 comes from `jgm/pandoc` official GitHub releases. GPL-2.0-or-later. Archive notices are retained.
- Whisper Base/Small ONNX exports come from pinned `Xenova` model repositories; model cards and JSON metadata are downloaded alongside the weights. Whisper Turbo uses the pinned `onnx-community` timestamped export. Read the model cards for upstream/export terms.
- **BRIA RMBG-1.4 is not a permissive open-source model.** It has separate non-commercial terms and requires a commercial license for commercial use. The app requires explicit acceptance before fetching it directly from the pinned upstream revision. It is never bundled or relicensed as AGPL.
- LibreOffice is installed separately by the user; PolyWrench invokes its executable and does not redistribute it.

## Excluded upstream artwork

The original hero artwork, illustrations, stickers, promotional character/magazine art and branded backdrops are omitted. FluoWrite was also omitted because its notice does not permit font redistribution. Plain interface placeholders and open-font fallbacks replace those references in active screens. The PolyWrench logo was provided by the project owner.

## PolyWrench interface fonts

- Bricolage Grotesque: converted without changing glyphs to WOFF2 from Google Fonts revision `6ce172f74aa355ea43eb964fa4a91570a4d3064d`, `ofl/bricolagegrotesque/BricolageGrotesque[opsz,wdth,wght].ttf`. The full license is bundled as `public/fonts/BricolageGrotesque-OFL.txt`.
- IBM Plex Sans: converted without changing glyphs to WOFF2 from Google Fonts revision `0b58fb370093f9a9f4ff785d94405710b79de67c`, `ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf`. The full license is bundled as `public/fonts/IBMPlexSans-OFL.txt`.

Both font families load from packaged local files; no runtime font service is used.
