import { module, test } from 'qunit';
import { matchesAccept } from 'delphitools-v2/modifiers/file-paste';

function file(name: string, type: string) {
	return new File([''], name, { type });
}

module('Unit | Modifier | file-paste | matchesAccept', function () {
	test('matches a wildcard against the type prefix', function (assert) {
		assert.true(
			matchesAccept(file('a.png', 'image/png'), 'image/*'),
		);
		assert.false(
			matchesAccept(
				file('a.pdf', 'application/pdf'),
				'image/*',
			),
		);
	});

	test('matches an extension against the name, case-insensitively', function (assert) {
		assert.true(
			matchesAccept(file('a.SVG', 'image/svg+xml'), '.svg'),
		);
		assert.false(matchesAccept(file('a.png', 'image/png'), '.svg'));
	});

	test('matches a bare mime type exactly', function (assert) {
		assert.true(
			matchesAccept(file('a.png', 'image/png'), 'image/png'),
		);
		assert.false(
			matchesAccept(file('a.jpg', 'image/jpeg'), 'image/png'),
		);
	});

	test('accepts a comma-separated list if any pattern matches', function (assert) {
		assert.true(
			matchesAccept(
				file('a.svg', 'image/svg+xml'),
				'image/png, .svg',
			),
		);
		assert.false(
			matchesAccept(
				file('a.gif', 'image/gif'),
				'image/png, .svg',
			),
		);
	});

	// dropped files can have empty type
	test('uses known extensions when the OS omits a MIME type', function (assert) {
		assert.true(matchesAccept(file('a.PNG', ''), 'image/*'));
		assert.true(
			matchesAccept(
				file('a.pdf', 'application/octet-stream'),
				'application/pdf',
			),
		);
		assert.false(matchesAccept(file('unknown.xyz', ''), 'image/*'));
		assert.false(
			matchesAccept(
				file('fake.png', 'application/pdf'),
				'image/*',
			),
		);
	});
});
