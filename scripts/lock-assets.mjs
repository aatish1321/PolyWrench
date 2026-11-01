// Maintainer command: refresh only after reviewing the pinned upstream licenses.
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

async function json(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${res.status}: ${url}`);
	return res.json();
}
const packs = [];
const platforms = ['linux-x64', 'win32-x64', 'darwin-x64', 'darwin-arm64'];
const ffmpeg = await json(
	'https://api.github.com/repos/eugeneware/ffmpeg-static/releases/tags/b6.1.1',
);
const pandoc = await json(
	'https://api.github.com/repos/jgm/pandoc/releases/tags/3.13',
);
function releaseFile(release, name, destination, extra = {}) {
	const asset = release.assets.find((a) => a.name === name);
	if (!asset?.digest?.startsWith('sha256:'))
		throw new Error(`No SHA256 for ${name}`);
	return {
		url: asset.browser_download_url,
		path: destination,
		sha256: asset.digest.slice(7),
		bytes: asset.size,
		...extra,
	};
}
for (const platform of platforms) {
	const windows = platform.startsWith('win32');
	packs.push({
		id: `ffmpeg-${platform}`,
		title: 'FFmpeg',
		platform,
		engine: 'ffmpeg',
		executable: `ffmpeg${windows ? '.exe' : ''}`,
		description: 'Image, audio and video batch conversion',
		license: 'GPL-3.0-or-later (build-specific terms in downloaded LICENSE)',
		licenseUrl: 'https://github.com/eugeneware/ffmpeg-static',
		files: [
			releaseFile(
				ffmpeg,
				`ffmpeg-${platform}.gz`,
				`ffmpeg${windows ? '.exe' : ''}`,
				{ gzip: true, executable: true },
			),
			releaseFile(ffmpeg, `${platform}.LICENSE`, 'LICENSE'),
			releaseFile(ffmpeg, `${platform}.README`, 'README'),
		],
	});
	const suffix = {
		'linux-x64': 'linux-amd64.tar.gz',
		'win32-x64': 'windows-x86_64.zip',
		'darwin-x64': 'x86_64-macOS.zip',
		'darwin-arm64': 'arm64-macOS.zip',
	}[platform];
	const exe = windows
		? 'pandoc-3.13/pandoc.exe'
		: platform.startsWith('darwin')
			? `pandoc-3.13-${platform.endsWith('arm64') ? 'arm64' : 'x86_64'}/bin/pandoc`
			: 'pandoc-3.13/bin/pandoc';
	packs.push({
		id: `pandoc-${platform}`,
		title: 'Pandoc',
		platform,
		engine: 'pandoc',
		executable: exe,
		description: 'Document, markup and ebook batch conversion',
		license: 'GPL-2.0-or-later',
		licenseUrl: 'https://github.com/jgm/pandoc/blob/3.13/COPYING.md',
		files: [
			releaseFile(
				pandoc,
				`pandoc-3.13-${suffix}`,
				`archive.${windows || platform.startsWith('darwin') ? 'zip' : 'tar.gz'}`,
				{
					archive: suffix.endsWith('.zip')
						? 'zip'
						: 'tar',
				},
			),
		],
	});
}

async function pinFile(url, destination) {
	const head = await fetch(url, { method: 'HEAD', redirect: 'manual' });
	const linked = head.headers.get('x-linked-etag')?.replaceAll('"', '');
	const size = Number(head.headers.get('x-linked-size'));
	if (/^[a-f0-9]{64}$/.test(linked || '') && size > 0)
		return { url, path: destination, sha256: linked, bytes: size };
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${res.status}: ${url}`);
	const bytes = new Uint8Array(await res.arrayBuffer());
	return {
		url,
		path: destination,
		sha256: createHash('sha256').update(bytes).digest('hex'),
		bytes: bytes.length,
	};
}
packs.push({
	id: 'pandoc-wasm',
	title: 'Document Converter engine',
	description: 'Offline engine for the original Document Converter tool',
	license: 'GPL-2.0-or-later',
	licenseUrl: 'https://github.com/tweag/pandoc-wasm',
	files: [
		await pinFile(
			'https://unpkg.com/pandoc-wasm@1.0.1/src/pandoc.wasm',
			'pandoc.wasm',
		),
	],
});

for (const [id, model, title, revision] of [
	[
		'whisper-base',
		'Xenova/whisper-base',
		'Subtitles — Base',
		'64da57285918e20ea79ea5c88eed7197933abaa8',
	],
	[
		'whisper-small',
		'Xenova/whisper-small',
		'Subtitles — Small',
		'2d67713f236afa48a18992566e7647f6ca848e13',
	],
	[
		'whisper-turbo',
		'onnx-community/whisper-large-v3-turbo_timestamped',
		'Subtitles — Large Turbo',
		'b3f77bf9a8c4d5ea3415827033d1ffea7955fd9a',
	],
	[
		'background-removal',
		'briaai/RMBG-1.4',
		'Background removal',
		'2ceba5a5efaec153162aedea169f76caf9b46cf8',
	],
]) {
	const meta = await json(
		`https://huggingface.co/api/models/${model}/revision/${revision}`,
	);
	const background = id === 'background-removal';
	const names = meta.siblings
		.map((f) => f.rfilename)
		.filter(
			(name) =>
				(!name.startsWith('onnx/') &&
					(/\.json$/.test(name) ||
						/^(LICENSE|README)/.test(
							name,
						))) ||
				(background
					? name === 'onnx/model_fp16.onnx'
					: [
							'onnx/encoder_model_q4.onnx',
							'onnx/decoder_model_merged_q4.onnx',
							...(id ===
							'whisper-turbo'
								? []
								: [
										'onnx/encoder_model_quantized.onnx',
										'onnx/decoder_model_merged_quantized.onnx',
									]),
						].includes(name)),
		);
	const files = [];
	for (const name of names)
		files.push(
			await pinFile(
				`https://huggingface.co/${model}/resolve/${revision}/${name}`,
				name,
			),
		);
	packs.push({
		id,
		model,
		revision,
		title,
		description: background
			? 'Local image segmentation; separate model terms apply'
			: 'Local speech recognition; GPU and CPU models (Turbo requires WebGPU)',
		license: background
			? 'BRIA RMBG-1.4 — non-commercial use; commercial license required for commercial use'
			: 'Apache-2.0 / upstream Whisper MIT; see model card',
		restricted: background,
		licenseUrl: `https://huggingface.co/${model}/blob/${revision}/README.md`,
		files,
	});
}
await writeFile(
	new URL('../desktop/assets.lock.json', import.meta.url),
	JSON.stringify({ version: 1, packs }, null, 2) + '\n',
);
console.log(`Locked ${packs.length} asset packs`);
