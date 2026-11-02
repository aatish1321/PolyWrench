const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');

const audio = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus', 'aiff'];
const video = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v'];
const images = [
	'png',
	'jpg',
	'jpeg',
	'webp',
	'avif',
	'bmp',
	'tiff',
	'gif',
	'ico',
];
const markup = [
	'md',
	'markdown',
	'html',
	'tex',
	'epub',
	'docx',
	'odt',
	'rtf',
	'txt',
];
const pandocInputs = markup.filter((ext) => ext !== 'rtf');
const office = [
	'doc',
	'docx',
	'odt',
	'rtf',
	'txt',
	'ppt',
	'pptx',
	'odp',
	'xls',
	'xlsx',
	'ods',
	'csv',
];
const pandocNames = {
	md: 'markdown',
	markdown: 'markdown',
	tex: 'latex',
	txt: 'plain',
	html: 'html5',
};

function canonicalExtension(extension) {
	const ext = extension.toLowerCase().replace(/^\./, '');
	return (
		{
			tif: 'tiff',
			jpe: 'jpeg',
			aif: 'aiff',
			wave: 'wav',
			htm: 'html',
		}[ext] || ext
	);
}

function targets(extension, engines) {
	const ext = canonicalExtension(extension);
	const result = new Set();
	if (engines.ffmpeg) {
		if (audio.includes(ext)) audio.forEach((v) => result.add(v));
		if (video.includes(ext))
			[
				...video.filter(
					(v) => v !== 'avi' && v !== 'm4v',
				),
				...audio,
				'gif',
			].forEach((v) => result.add(v));
		if (images.includes(ext))
			images.filter((v) => v !== 'jpeg').forEach((v) =>
				result.add(v),
			);
	}
	if (engines.pandoc && pandocInputs.includes(ext))
		markup.filter((v) => v !== 'markdown').forEach((v) =>
			result.add(v),
		);
	if (engines.libreoffice && office.includes(ext)) {
		const formats = ['ppt', 'pptx', 'odp'].includes(ext)
			? ['pptx', 'odp', 'pdf']
			: ['xls', 'xlsx', 'ods', 'csv'].includes(ext)
				? ['xlsx', 'ods', 'csv', 'pdf']
				: ['docx', 'odt', 'rtf', 'txt', 'pdf'];
		formats.forEach((v) => result.add(v));
	}
	result.delete(ext);
	return [...result].sort();
}

function command(input, output, engines, quality = 'standard', workDir) {
	const source = canonicalExtension(path.extname(input));
	const target = path.extname(output).slice(1).toLowerCase();
	if (
		!['standard', 'high'].includes(quality) ||
		!targets(source, engines).includes(target)
	)
		throw new Error(
			'Unsupported conversion. Check offline setup for the required engine.',
		);
	if (
		engines.ffmpeg &&
		(audio.includes(source) ||
			video.includes(source) ||
			images.includes(source))
	) {
		const args = [
			'-nostdin',
			'-hide_banner',
			'-loglevel',
			'error',
			'-protocol_whitelist',
			'file,pipe',
			'-i',
			input,
		];
		if (audio.includes(target)) args.push('-vn');
		if (['mp4', 'mov', 'mkv'].includes(target))
			args.push(
				'-c:v',
				'libx264',
				'-crf',
				quality === 'high' ? '18' : '23',
				'-pix_fmt',
				'yuv420p',
				'-c:a',
				'aac',
			);
		if (target === 'webm')
			args.push(
				'-c:v',
				'libvpx-vp9',
				'-crf',
				quality === 'high' ? '24' : '32',
				'-b:v',
				'0',
				'-c:a',
				'libopus',
			);
		if (target === 'mp3')
			args.push(
				'-c:a',
				'libmp3lame',
				'-q:a',
				quality === 'high' ? '0' : '2',
			);
		if (target === 'gif' && video.includes(source))
			args.push('-vf', 'fps=12,scale=640:-1:flags=lanczos');
		if (images.includes(source)) args.push('-frames:v', '1');
		if (target === 'ico')
			args.push(
				'-vf',
				'scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
			);
		args.push('-n', output);
		return { executable: engines.ffmpeg, args };
	}
	if (
		engines.pandoc &&
		pandocInputs.includes(source) &&
		markup.includes(target)
	) {
		// Pandoc cannot read its own plain-text writer name.
		const from =
			source === 'txt'
				? 'markdown'
				: source === 'html'
					? 'html'
					: pandocNames[source] || source;
		return {
			executable: engines.pandoc,
			args: [
				'--sandbox',
				'--from',
				from,
				'--to',
				pandocNames[target] || target,
				'--output',
				output,
				input,
			],
		};
	}
	return {
		executable: engines.libreoffice,
		args: [
			`-env:UserInstallation=${pathToFileURL(path.join(workDir, 'profile')).href}`,
			'--headless',
			'--convert-to',
			target,
			'--outdir',
			workDir,
			input,
		],
		officeOutput: path.join(
			workDir,
			`${path.basename(input, path.extname(input))}.${target}`,
		),
	};
}

function run(executable, args, { signal, onLog = () => {} } = {}) {
	return new Promise((resolve, reject) => {
		signal?.throwIfAborted();
		const child = spawn(executable, args, {
			windowsHide: true,
			shell: false,
			stdio: ['ignore', 'ignore', 'pipe'],
		});
		let detail = '';
		let killTimer;
		const abort = () => {
			child.kill();
			killTimer = setTimeout(
				() => child.kill('SIGKILL'),
				2000,
			);
			killTimer.unref();
		};
		signal?.addEventListener('abort', abort, { once: true });
		child.stderr.on('data', (chunk) => {
			detail = (detail + chunk.toString()).slice(-4000);
			onLog(detail);
		});
		child.once('error', reject);
		child.once('close', (code) => {
			clearTimeout(killTimer);
			signal?.removeEventListener('abort', abort);
			if (signal?.aborted) reject(new Error('Cancelled'));
			else if (code !== 0)
				reject(
					new Error(
						detail.trim() ||
							`Engine exited with code ${code}`,
					),
				);
			else resolve();
		});
	});
}

async function publishOutput(temp, folder, name) {
	const ext = path.extname(name);
	const base = path.basename(name, ext);
	for (let number = 0; ; number++) {
		const output = path.join(
			folder,
			`${base}${number ? ` (${number})` : ''}${ext}`,
		);
		try {
			// Hard-linking publishes a complete file atomically and never replaces a file.
			await fs.link(temp, output);
			return output;
		} catch (error) {
			if (
				['EPERM', 'EOPNOTSUPP', 'ENOTSUP'].includes(
					error.code,
				)
			) {
				try {
					await fs.copyFile(
						temp,
						output,
						fs.constants.COPYFILE_EXCL,
					);
					return output;
				} catch (copyError) {
					if (copyError.code !== 'EEXIST')
						throw copyError;
				}
			} else if (error.code !== 'EEXIST') throw error;
		}
	}
}

async function convertOne({
	input,
	destination,
	target,
	quality,
	engines,
	signal,
}) {
	if (!/^[a-z0-9]+$/.test(target))
		throw new Error('Invalid output format');
	const workDir = await fs.mkdtemp(path.join(destination, '.local-gui-'));
	try {
		const temp = path.join(workDir, `${randomUUID()}.${target}`);
		const spec = command(input, temp, engines, quality, workDir);
		await run(spec.executable, spec.args, { signal });
		signal?.throwIfAborted();
		const result = spec.officeOutput || temp;
		if ((await fs.stat(result)).size === 0)
			throw new Error('The engine produced an empty file');
		return await publishOutput(
			result,
			destination,
			`${path.basename(input, path.extname(input))}.${target}`,
		);
	} finally {
		await fs.rm(workDir, { recursive: true, force: true });
	}
}

module.exports = { targets, command, run, convertOne, publishOutput };
