import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import electron from 'electron';
import puppeteer from 'puppeteer-core';
import { inventory } from './tool-inventory.mjs';

const data =
	process.env.POLYWRENCH_TEST_DATA ||
	(await mkdtemp(join(tmpdir(), 'polywrench-smoke-')));
const executable = process.env.ELECTRON_EXECUTABLE || electron;
const args = [
	'--remote-debugging-port=0',
	...(process.platform === 'linux'
		? [
				'--no-sandbox',
				'--disable-gpu',
				'--gtk-version=3',
				'--ozone-platform=x11',
			]
		: []),
	...(process.env.ELECTRON_EXECUTABLE ? [] : ['.']),
];
const child = spawn(executable, args, {
	env: { ...process.env, LOCAL_GUI_TEST_DATA: data },
	stdio: ['ignore', 'ignore', 'pipe'],
});
let browser;
try {
	const endpoint = await new Promise((resolve, reject) => {
		let stderr = '';
		const timer = setTimeout(
			() =>
				reject(
					new Error(
						`Electron startup timed out: ${stderr.slice(-3000)}`,
					),
				),
			30000,
		);
		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString();
			const match = stderr.match(
				/DevTools listening on (ws:\/\/[^\s]+)/,
			);
			if (match) {
				clearTimeout(timer);
				resolve(match[1]);
			}
		});
		child.on('error', reject);
		child.on('exit', (code) => {
			clearTimeout(timer);
			reject(
				new Error(
					`Electron exited ${code}: ${stderr.slice(-3000)}`,
				),
			);
		});
	});
	browser = await puppeteer.connect({ browserWSEndpoint: endpoint });
	let page;
	for (let attempt = 0; attempt < 100 && !page; attempt++) {
		page = (await browser.pages()).find((p) =>
			p.url().startsWith('app://local/'),
		);
		if (!page)
			await new Promise((resolve) =>
				setTimeout(resolve, 100),
			);
	}
	assert(page, 'Application window opened');
	const exceptions = [];
	page.on('pageerror', (error) => {
		exceptions.push(error.message);
		console.log('PAGE ERROR:', error.message);
	});
	page.on('console', (message) => {
		if (message.type() === 'error')
			console.log('CONSOLE:', message.text());
	});
	page.on('requestfailed', (request) =>
		console.log(
			'FAILED REQUEST:',
			request.url(),
			request.failure()?.errorText,
		),
	);
	await page.setViewport({ width: 1440, height: 960 });
	await page.waitForSelector('.lg-tool-card', { timeout: 30000 });
	assert(
		await page.evaluate(() => !!window.desktop),
		'Preload API available',
	);
	const status = await page.evaluate(() => window.desktop.status());
	assert(status.packs.length >= 7, 'Offline setup manifest available');
	const networkBlocked = await page.evaluate(async () => {
		try {
			await fetch('https://example.com/');
			return false;
		} catch {
			return true;
		}
	});
	assert(networkBlocked, 'Renderer network requests are blocked');
	const denied = await page.evaluate(async () => {
		try {
			await window.desktop.start({
				fileIds: ['/etc/passwd'],
				destinationId: '/tmp',
				target: 'txt',
				quality: 'standard',
			});
			return false;
		} catch {
			return true;
		}
	});
	assert(denied, 'IPC rejects unselected filesystem paths');
	if (process.env.POLYWRENCH_VERIFY_OFFLINE)
		await page.setOfflineMode(true);
	await page.evaluate(() => {
		const input = document.createElement('input');
		input.type = 'file';
		input.id = 'native-file-test';
		document.body.append(input);
	});
	await (
		await page.$('#native-file-test')
	).uploadFile('public/polywrench.png');
	const dropped = await page.evaluate(() =>
		window.desktop.dropFiles(
			Array.from(
				document.querySelector('#native-file-test')
					.files,
			),
		),
	);
	assert.equal(
		dropped[0].name,
		'polywrench.png',
		'Native file drop resolves only a real File object',
	);
	await page.evaluate(() =>
		document.querySelector('#native-file-test').remove(),
	);
	await mkdir('artifacts', { recursive: true });
	await page.screenshot({ path: 'artifacts/workspace.png' });
	await page.type('input[aria-label="Search all tools"]', 'json');
	await page.waitForFunction(
		() => document.querySelectorAll('.lg-tool-card').length === 1,
	);
	const rows = await inventory();
	const routes = ['/converter', '/setup', ...rows.map((row) => row.href)];
	const results = [];
	for (const route of routes) {
		const before = exceptions.length;
		await page.goto(`app://local${route}`, { waitUntil: 'load' });
		await page.waitForSelector('.lg-main', { timeout: 15000 });
		if (route.startsWith('/tools/'))
			await page.waitForSelector(
				'.dt-canon-tool > :not(.dt-canon-edge)',
				{ timeout: 15000 },
			);
		await new Promise((resolve) => setTimeout(resolve, 100));
		const errors = exceptions.slice(before);
		results.push({ route, passed: errors.length === 0, errors });
		console.log(
			`${errors.length ? 'FAIL' : 'PASS'} ${route}${errors.length ? `: ${errors.join('; ')}` : ''}`,
		);
	}
	if (process.env.POLYWRENCH_VERIFY_OFFLINE) {
		await verifyOffline(page);
	}
	await writeFile(
		'artifacts/smoke-results.json',
		JSON.stringify(results, null, 2) + '\n',
	);
	assert(
		results.every((result) => result.passed),
		'Every tool route rendered without uncaught errors',
	);
	console.log(
		`Desktop smoke passed: ${routes.length} routes, network blocking, preload and IPC validation`,
	);
} finally {
	browser?.disconnect();
	child.kill();
	await new Promise((resolve) =>
		child.exitCode === null
			? child.once('exit', resolve)
			: resolve(),
	);
	if (!process.env.POLYWRENCH_TEST_DATA)
		await rm(data, { recursive: true, force: true });
}

async function verifyOffline(page) {
	await page.goto('app://local/tools/auto-subtitle', {
		waitUntil: 'load',
	});
	await page.waitForSelector('.as-mode');
	await page.evaluate(() => {
		const rate = 16000,
			samples = rate / 2;
		const wav = new ArrayBuffer(44 + samples * 2);
		const view = new DataView(wav);
		const text = (offset, value) =>
			[...value].forEach((c, index) =>
				view.setUint8(offset + index, c.charCodeAt(0)),
			);
		text(0, 'RIFF');
		view.setUint32(4, 36 + samples * 2, true);
		text(8, 'WAVE');
		text(12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, 1, true);
		view.setUint32(24, rate, true);
		view.setUint32(28, rate * 2, true);
		view.setUint16(32, 2, true);
		view.setUint16(34, 16, true);
		text(36, 'data');
		view.setUint32(40, samples * 2, true);
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([wav], 'silence.wav', { type: 'audio/wav' }),
		);
		document.querySelector(
			'.auto-subtitle .canon-split-sidebar',
		).dispatchEvent(
			new DragEvent('drop', {
				dataTransfer: transfer,
				bubbles: true,
				cancelable: true,
			}),
		);
		[...document.querySelectorAll('.as-mode [role="radio"]')]
			.find((button) => button.textContent.trim() === 'Rough')
			?.click();
	});
	await page.waitForFunction(
		() => !document.querySelector('.as-run')?.disabled,
	);
	await page.click('.as-run');
	await page.waitForFunction(
		() => document.querySelector('.as-run')?.disabled,
		{ timeout: 10000 },
	);
	await page.waitForFunction(
		() => !document.querySelector('.as-run')?.disabled,
		{ timeout: 180000 },
	);
	const failed = await page.evaluate(() =>
		[...document.querySelectorAll('.canon-status')]
			.map((el) => el.textContent)
			.join(' '),
	);
	assert(
		!(await page.$('.as-problem')),
		`Offline transcription: ${failed}`,
	);
	console.log(
		'PASS real Whisper Base CPU inference with networking disabled',
	);
	await page.goto('app://local/tools/doc-converter', {
		waitUntil: 'load',
	});
	await page.waitForSelector('.dc-editor');
	await page.$eval('.dc-editor', (element) => {
		element.value = '# PolyWrench\n\nOffline document conversion.';
		element.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await page.$eval(
		'.dc-format-pick[aria-label^="Target format"]',
		(element) => element.click(),
	);
	await page.waitForSelector(
		'.dc-format-dialog[open] .canon-command-input',
	);
	await page.type('.dc-format-dialog[open] .canon-command-input', 'word');
	await page.keyboard.press('Enter');
	await page.waitForFunction(
		() => !document.querySelector('.dc-convert')?.disabled,
	);
	await page.click('.dc-convert');
	await page.waitForFunction(
		() =>
			document.querySelector('.dc-save') ||
			document.querySelector('.dc-error'),
		{ timeout: 60000 },
	);
	assert(
		!(await page.$('.dc-error')),
		await page.evaluate(
			() => document.querySelector('.dc-error')?.textContent,
		),
	);
	console.log(
		'PASS real Pandoc WASM document conversion with networking disabled',
	);
}
