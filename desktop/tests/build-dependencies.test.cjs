const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const {
	readFileSync,
	existsSync,
	mkdtempSync,
	writeFileSync,
	rmSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const fromEmber = createRequire(require.resolve('ember-cli/package.json'));

test('legacy Ember helpers work with the patched tmp override', () => {
	for (const name of [
		'can-symlink',
		'external-editor',
		'watch-detector',
	]) {
		const fromHelper = createRequire(fromEmber.resolve(name));
		assert.equal(fromHelper('tmp/package.json').version, '0.2.7');
	}
	assert.equal(typeof fromEmber('can-symlink')(), 'boolean');
	const WatchDetector = fromEmber('watch-detector');
	assert.equal(
		new WatchDetector({
			root: process.cwd(),
		}).testIfNodeWatcherAppearsToWork(),
		true,
	);
	const { ExternalEditor } = fromEmber('external-editor');
	const editor = new ExternalEditor('PolyWrench dependency check');
	try {
		assert.equal(
			readFileSync(editor.tempFile, 'utf8'),
			'PolyWrench dependency check',
		);
	} finally {
		editor.cleanup();
	}
	assert.equal(existsSync(editor.tempFile), false);
});

test('patched minimatch preserves legacy and modern build APIs', () => {
	const fromFunnel = createRequire(fromEmber.resolve('broccoli-funnel'));
	const legacy = fromFunnel('minimatch');
	const modern = fromEmber('minimatch');
	const fromAdapter = createRequire(fromFunnel.resolve('minimatch'));
	assert.equal(
		fromAdapter('minimatch-core/package.json').version,
		'11.0.4',
	);
	assert.equal(fromEmber('minimatch/package.json').version, '11.0.4');
	assert.equal(typeof legacy, 'function');
	for (const match of [legacy, modern.minimatch]) {
		assert.equal(match('app/file.ts', '**/*.{js,ts}'), true);
		assert.equal(match('app/file.css', '**/*.{js,ts}'), false);
		assert.equal(match('.hidden/file.ts', '**/*.ts'), false);
		assert.equal(
			match('.hidden/file.ts', '**/*.ts', { dot: true }),
			true,
		);
	}
	assert.deepEqual(legacy.match(['a.ts', 'b.css'], '*.ts'), ['a.ts']);
	assert.equal(
		new legacy.Minimatch('**/*.ts').match('app/file.ts'),
		true,
	);
});

test('patched glob keeps file matching and abort behavior', async (t) => {
	const fixture = mkdtempSync(join(tmpdir(), 'polywrench-glob-'));
	t.after(() => rmSync(fixture, { recursive: true, force: true }));
	writeFileSync(join(fixture, 'example.txt'), 'fixture');
	writeFileSync(join(fixture, 'example.css'), 'fixture');
	const { glob, globSync } = fromEmber('glob');
	assert.deepEqual(globSync('*.txt', { cwd: fixture }), ['example.txt']);
	assert.deepEqual(await glob('*.txt', { cwd: fixture }), [
		'example.txt',
	]);
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(
		glob('**/*', { cwd: fixture, signal: controller.signal }),
		{ name: 'AbortError' },
	);
});

test('patched font ZIP helper preserves archive round trips', () => {
	const fromSatori = createRequire(require.resolve('satori'));
	const { zipSync, unzipSync } = fromSatori('fflate');
	const bytes = Uint8Array.from([80, 111, 108, 121]);
	assert.deepEqual(
		unzipSync(zipSync({ 'sample.txt': bytes }))['sample.txt'],
		bytes,
	);
});
