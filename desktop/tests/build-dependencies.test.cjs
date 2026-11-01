const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { readFileSync, existsSync } = require('node:fs');

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
