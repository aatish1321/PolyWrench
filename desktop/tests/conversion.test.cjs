const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
	targets,
	command,
	run,
	convertOne,
	publishOutput,
} = require('../conversion.cjs');
const { inside, localRequest } = require('../paths.cjs');

test('formats require engines and respect input families', () => {
	assert.deepEqual(targets('.wav', {}), []);
	assert(targets('.MOV', { ffmpeg: 'ffmpeg' }).includes('mp3'));
	assert(!targets('.pdf', { pandoc: 'pandoc' }).includes('docx'));
	assert(!targets('.rtf', { pandoc: 'pandoc' }).includes('docx'));
	assert(targets('.pptx', { libreoffice: 'soffice' }).includes('pdf'));
	assert(!targets('.pptx', { libreoffice: 'soffice' }).includes('docx'));
	assert(!targets('.docx', { pandoc: 'pandoc' }).includes('docx'));
});

test('commands use argument arrays and reject invalid targets', () => {
	const spec = command(
		'/tmp/a $(echo hacked).mov',
		'/tmp/out.mp4',
		{ ffmpeg: '/bin/ffmpeg' },
		'standard',
		'/tmp',
	);
	assert(spec.args.includes('/tmp/a $(echo hacked).mov'));
	assert(spec.args.includes('-nostdin'));
	assert.throws(() =>
		command(
			'a.wav',
			'a.docx',
			{ ffmpeg: 'ffmpeg' },
			'standard',
			'/tmp',
		),
	);
	assert.throws(() =>
		command(
			'a.wav',
			'a.mp3',
			{ ffmpeg: 'ffmpeg' },
			'invalid',
			'/tmp',
		),
	);
	assert(
		command(
			'a.md',
			'a.docx',
			{ pandoc: 'pandoc' },
			'standard',
			'/tmp',
		).args.includes('--sandbox'),
	);
});

test('resource paths cannot escape their directory or origin', () => {
	assert.equal(
		inside('/tmp/assets', 'a/b'),
		path.resolve('/tmp/assets/a/b'),
	);
	assert.throws(() => inside('/tmp/assets', '../secret'));
	assert.throws(() => localRequest('https://evil.test/index.html'));
	assert.throws(() => localRequest('app://local/models/%2e%2e%2fsecret'));
	assert.throws(() => localRequest('app://local/models/a%5c..%5csecret'));
});

test('publishing never overwrites files, including concurrent jobs', async (t) => {
	const dir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'local-gui-publish-'),
	);
	t.after(() => fs.rm(dir, { recursive: true, force: true }));
	const temp = path.join(dir, 'temp.txt');
	await fs.writeFile(temp, 'new');
	await fs.writeFile(path.join(dir, 'result.txt'), 'original');
	const outputs = await Promise.all([
		publishOutput(temp, dir, 'result.txt'),
		publishOutput(temp, dir, 'result.txt'),
	]);
	assert.equal(new Set(outputs).size, 2);
	assert.equal(
		await fs.readFile(path.join(dir, 'result.txt'), 'utf8'),
		'original',
	);
	assert.equal(await fs.readFile(outputs[0], 'utf8'), 'new');
});

test('cancellation terminates a running child', async () => {
	const controller = new AbortController();
	const running = run(
		process.execPath,
		['-e', 'setInterval(() => {}, 1000)'],
		{ signal: controller.signal },
	);
	setTimeout(() => controller.abort(), 100);
	await assert.rejects(running, /Cancelled/);
});

test('real media conversion handles Unicode, collisions and failed-input cleanup', async (t) => {
	let executable = process.env.FFMPEG_PATH || 'ffmpeg';
	try {
		await run(executable, ['-version']);
	} catch {
		t.skip('FFmpeg is not installed');
		return;
	}
	const dir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'local-gui-convert-'),
	);
	t.after(() => fs.rm(dir, { recursive: true, force: true }));
	const input = path.join(dir, 'árvíz space.wav');
	await run(executable, [
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:duration=0.2',
		input,
	]);
	const options = {
		input,
		destination: dir,
		target: 'mp3',
		quality: 'standard',
		engines: { ffmpeg: executable },
	};
	const output = await convertOne(options);
	const second = await convertOne(options);
	assert.notEqual(output, second);
	assert((await fs.stat(output)).size > 0);
	assert((await fs.stat(input)).size > 0);
	await fs.writeFile(path.join(dir, 'invalid.wav'), 'invalid');
	await assert.rejects(
		convertOne({
			...options,
			input: path.join(dir, 'invalid.wav'),
		}),
	);
	assert(
		!(await fs.readdir(dir)).some((name) =>
			name.startsWith('.local-gui-'),
		),
	);
});
