const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { serveFile } = require('../resources.cjs');

test('packaged resources stream with the correct MIME type and byte ranges', async (t) => {
	const dir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'polywrench-resource-'),
	);
	t.after(() => fs.rm(dir, { recursive: true, force: true }));
	const file = path.join(dir, 'model.wasm');
	await fs.writeFile(file, '0123456789');
	const full = await serveFile(
		file,
		new Request('app://local/model.wasm'),
	);
	assert.equal(full.headers.get('content-type'), 'application/wasm');
	assert.equal(await full.text(), '0123456789');
	const partial = await serveFile(
		file,
		new Request('app://local/model.wasm', {
			headers: { Range: 'bytes=2-4' },
		}),
	);
	assert.equal(partial.status, 206);
	assert.equal(partial.headers.get('content-range'), 'bytes 2-4/10');
	assert.equal(await partial.text(), '234');
	const invalid = await serveFile(
		file,
		new Request('app://local/model.wasm', {
			headers: { Range: 'bytes=20-' },
		}),
	);
	assert.equal(invalid.status, 416);
});
