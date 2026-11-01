const fs = require('node:fs/promises');
const { createReadStream, createWriteStream } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createGunzip } = require('node:zlib');
const { inside } = require('./paths.cjs');
const manifest = require('./assets.lock.json');

async function download(file, output, signal, onProgress) {
	const response = await fetch(file.url, { signal });
	if (!response.ok || !response.body)
		throw new Error(`Download failed: HTTP ${response.status}`);
	const hash = createHash('sha256');
	let received = 0;
	const meter = new Transform({
		transform(chunk, encoding, callback) {
			received += chunk.length;
			if (received > file.bytes)
				return callback(
					new Error(
						'Download exceeds locked size',
					),
				);
			hash.update(chunk);
			onProgress(received);
			callback(null, chunk);
		},
	});
	await pipeline(
		Readable.fromWeb(response.body),
		meter,
		createWriteStream(output, { flags: 'wx' }),
		{ signal },
	);
	if (received !== file.bytes || hash.digest('hex') !== file.sha256)
		throw new Error('Download checksum or size mismatch');
}

class Assets {
	constructor(root) {
		this.root = root;
		this.active = null;
	}
	get packs() {
		return manifest.packs.filter(
			(p) =>
				!p.platform ||
				p.platform ===
					`${process.platform}-${process.arch}`,
		);
	}
	directory(id) {
		return inside(this.root, id);
	}
	async ready(pack) {
		try {
			return (
				(await fs.readFile(
					path.join(
						this.directory(pack.id),
						'.ready',
					),
					'utf8',
				)) === JSON.stringify(pack)
			);
		} catch {
			return false;
		}
	}
	async list() {
		return Promise.all(
			this.packs.map(async (pack) => ({
				id: pack.id,
				title: pack.title,
				description: pack.description,
				engine: pack.engine,
				license: pack.license,
				licenseUrl: pack.licenseUrl,
				restricted: !!pack.restricted,
				bytes: pack.files.reduce(
					(n, f) => n + f.bytes,
					0,
				),
				ready: await this.ready(pack),
			})),
		);
	}
	cancel() {
		this.active?.abort();
	}
	async install(id, accepted, report) {
		if (this.active)
			throw new Error('Another download is already running');
		const pack = this.packs.find((p) => p.id === id);
		if (!pack) throw new Error('Unknown asset pack');
		if (pack.restricted && accepted !== true)
			throw new Error(
				'Accept the separate model license before downloading',
			);
		if (await this.ready(pack)) return;
		this.active = new AbortController();
		const signal = this.active.signal;
		let staging;
		let completed = 0;
		const total = pack.files.reduce((n, f) => n + f.bytes, 0);
		try {
			await fs.mkdir(this.root, { recursive: true });
			staging = await fs.mkdtemp(
				path.join(this.root, '.install-'),
			);
			for (const file of pack.files) {
				const output = inside(staging, file.path);
				await fs.mkdir(path.dirname(output), {
					recursive: true,
				});
				const raw = file.gzip ? `${output}.gz` : output;
				await download(file, raw, signal, (received) =>
					report({
						id,
						received: completed + received,
						total,
					}),
				);
				if (file.gzip) {
					await pipeline(
						createReadStream(raw),
						createGunzip(),
						createWriteStream(output),
						{ signal },
					);
					await fs.unlink(raw);
				}
				if (file.executable)
					await fs.chmod(output, 0o755);
				if (file.archive === 'zip') {
					// shortcut: pinned engine ZIPs are extracted in memory; stream if their size grows substantially.
					const entries =
						require('fflate').unzipSync(
							await fs.readFile(
								output,
							),
						);
					for (const [
						name,
						bytes,
					] of Object.entries(entries)) {
						const target = inside(
							staging,
							name,
						);
						if (name.endsWith('/'))
							await fs.mkdir(target, {
								recursive: true,
							});
						else {
							await fs.mkdir(
								path.dirname(
									target,
								),
								{
									recursive: true,
								},
							);
							await fs.writeFile(
								target,
								bytes,
								{ flag: 'wx' },
							);
						}
					}
					await fs.unlink(output);
				}
				if (file.archive === 'tar') {
					await require('tar').x({
						file: output,
						cwd: staging,
						strict: true,
						filter: (name, entry) => {
							inside(staging, name);
							// Pandoc includes a convenience symlink; only extract ordinary files/directories.
							return [
								'File',
								'Directory',
							].includes(entry.type);
						},
					});
					await fs.unlink(output);
				}
				completed += file.bytes;
			}
			if (pack.executable) {
				const exe = inside(staging, pack.executable);
				await fs.access(exe);
				await fs.chmod(exe, 0o755);
			}
			signal.throwIfAborted();
			await fs.writeFile(
				path.join(staging, '.ready'),
				JSON.stringify(pack),
			);
			await fs.rm(this.directory(id), {
				recursive: true,
				force: true,
			});
			await fs.rename(staging, this.directory(id));
		} finally {
			this.active = null;
			if (staging)
				await fs.rm(staging, {
					recursive: true,
					force: true,
				});
		}
	}
	async resource(name) {
		if (name === 'offline/pandoc.wasm') {
			const pack = this.packs.find(
				(p) => p.id === 'pandoc-wasm',
			);
			return (await this.ready(pack))
				? path.join(
						this.directory(pack.id),
						'pandoc.wasm',
					)
				: null;
		}
		const pack = this.packs.find(
			(p) => p.model && name.startsWith(`models/${p.model}/`),
		);
		if (!pack || !(await this.ready(pack))) return null;
		return inside(
			this.directory(pack.id),
			name.slice(`models/${pack.model}/`.length),
		);
	}
	async engine(name) {
		const pack = this.packs.find((p) => p.engine === name);
		return pack && (await this.ready(pack))
			? inside(this.directory(pack.id), pack.executable)
			: null;
	}
}

module.exports = { Assets, download };
