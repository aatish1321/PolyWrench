const test = require('node:test');
const assert = require('node:assert/strict');
const { fileType } = require('../../app/lib/file-types.ts');

test('desktop files with missing or generic MIME types use known extensions', () => {
	for (const [name, expected] of Object.entries({
		'photo.PNG': 'image/png',
		'photo.JPEG': 'image/jpeg',
		'art.SVG': 'image/svg+xml',
		'scan.TIF': 'image/tiff',
		'document.PDF': 'application/pdf',
		'clip.MP4': 'video/mp4',
		'sound.WAV': 'audio/wav',
		'song.FLAC': 'audio/flac',
	})) {
		for (const type of ['', 'application/octet-stream'])
			assert.equal(fileType({ name, type }), expected);
	}
	assert.equal(fileType({ name: 'png', type: '' }), '');
	assert.equal(fileType({ name: 'unknown.xyz', type: '' }), '');
});

test('MIME aliases are normalized without overriding a conflicting declared type', () => {
	assert.equal(fileType({ name: 'a', type: 'image/jpg' }), 'image/jpeg');
	assert.equal(fileType({ name: 'a', type: 'audio/x-wav' }), 'audio/wav');
	assert.equal(
		fileType({ name: 'a', type: 'IMAGE/PNG; charset=binary' }),
		'image/png',
	);
	assert.equal(
		fileType({ name: 'fake.png', type: 'application/pdf' }),
		'application/pdf',
	);
});
