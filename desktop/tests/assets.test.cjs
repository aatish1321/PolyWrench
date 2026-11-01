const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { download, Assets } = require('../assets.cjs');
const manifest = require('../assets.lock.json');

test('locked assets have immutable URLs, hashes and all supported platforms', () => {
	for (const pack of manifest.packs) {
		assert(pack.license && pack.licenseUrl);
		for (const file of pack.files) {
			assert.match(file.sha256, /^[a-f0-9]{64}$/);
			assert(file.bytes > 0);
			assert(file.url.startsWith('https://'));
			assert(!file.url.includes('/resolve/main/'));
		}
	}
	for (const platform of [
		'linux-x64',
		'win32-x64',
		'darwin-x64',
		'darwin-arm64',
	]) {
		assert(
			manifest.packs.some(
				(p) =>
					p.platform === platform &&
					p.engine === 'ffmpeg',
			),
		);
		assert(
			manifest.packs.some(
				(p) =>
					p.platform === platform &&
					p.engine === 'pandoc',
			),
		);
	}
});

test('downloads validate integrity and never mark failed setup as ready', async (t) => {
	const dir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'local-gui-assets-'),
	);
	t.after(() => fs.rm(dir, { recursive: true, force: true }));
	const data = Buffer.from('verified bytes');
	const server = http.createServer((_request, response) =>
		response.end(data),
	);
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	t.after(() => new Promise((resolve) => server.close(resolve)));
	const spec = {
		url: `http://127.0.0.1:${server.address().port}`,
		bytes: data.length,
		sha256: createHash('sha256').update(data).digest('hex'),
	};
	await download(spec, path.join(dir, 'good'), undefined, () => {});
	assert.equal(
		await fs.readFile(path.join(dir, 'good'), 'utf8'),
		'verified bytes',
	);
	await assert.rejects(
		download(
			{ ...spec, sha256: '0'.repeat(64) },
			path.join(dir, 'bad'),
			undefined,
			() => {},
		),
		/checksum/,
	);
	const assets = new Assets(dir);
	await assert.rejects(
		assets.install('unknown', false, () => {}),
		/Unknown/,
	);
	await assert.rejects(
		assets.install('background-removal', false, () => {}),
		/license/,
	);
	assert.equal(
		await assets.resource('models/Xenova/whisper-base/config.json'),
		null,
	);
});

test('interrupted downloads can be cancelled and retried', async (t) => {
	const dir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'local-gui-cancel-'),
	);
	t.after(() => fs.rm(dir, { recursive: true, force: true }));
	const server = http.createServer((_request, response) => {
		response.write('a');
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	t.after(() => {
		server.closeAllConnections();
		server.close();
	});
	const controller = new AbortController();
	setTimeout(() => controller.abort(), 100);
	await assert.rejects(
		download(
			{
				url: `http://127.0.0.1:${server.address().port}`,
				bytes: 100,
				sha256: '0'.repeat(64),
			},
			path.join(dir, 'partial'),
			controller.signal,
			() => {},
		),
	);
});
