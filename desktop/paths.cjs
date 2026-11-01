const path = require('node:path');

function inside(root, requested) {
	const result = path.resolve(root, requested);
	const relative = path.relative(root, result);
	if (
		relative === '..' ||
		relative.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relative)
	)
		throw new Error('Path outside allowed directory');
	return result;
}

function localRequest(url) {
	const parsed = new URL(url);
	if (parsed.protocol !== 'app:' || parsed.host !== 'local')
		throw new Error('Invalid app origin');
	const name = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
	if (
		name.includes('\\') ||
		name.includes('\0') ||
		name.split('/').some((part) => part === '..' || part === '.')
	)
		throw new Error('Invalid resource path');
	return name;
}

module.exports = { inside, localRequest };
