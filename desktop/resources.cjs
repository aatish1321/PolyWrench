const { createReadStream } = require('node:fs');
const { stat } = require('node:fs/promises');
const { Readable } = require('node:stream');
const path = require('node:path');

const types = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.wasm': 'application/wasm',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.otf': 'font/otf',
	'.ttf': 'font/ttf',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.pdf': 'application/pdf',
};

async function serveFile(file, request) {
	const info = await stat(file);
	if (!info.isFile()) return new Response('Not found', { status: 404 });
	const headers = new Headers({
		'Content-Type':
			types[path.extname(file)] || 'application/octet-stream',
		'Accept-Ranges': 'bytes',
	});
	let start = 0;
	let end = info.size - 1;
	let status = 200;
	const range = request.headers.get('Range');
	if (range) {
		const match = /^bytes=(\d*)-(\d*)$/.exec(range);
		if (!match || (!match[1] && !match[2]))
			return new Response(null, {
				status: 416,
				headers: {
					'Content-Range': `bytes */${info.size}`,
				},
			});
		if (!match[1])
			start = Math.max(0, info.size - Number(match[2]));
		else {
			start = Number(match[1]);
			if (match[2]) end = Math.min(end, Number(match[2]));
		}
		if (
			!Number.isSafeInteger(start) ||
			!Number.isSafeInteger(end) ||
			start > end ||
			start >= info.size
		)
			return new Response(null, {
				status: 416,
				headers: {
					'Content-Range': `bytes */${info.size}`,
				},
			});
		status = 206;
		headers.set(
			'Content-Range',
			`bytes ${start}-${end}/${info.size}`,
		);
	}
	headers.set('Content-Length', String(Math.max(0, end - start + 1)));
	return new Response(
		request.method === 'HEAD' || !info.size
			? null
			: Readable.toWeb(
					createReadStream(file, { start, end }),
				),
		{ status, headers },
	);
}

module.exports = { serveFile };
