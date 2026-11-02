/* eslint n/no-unsupported-features/node-builtins: ["error", { "ignores": ["localStorage"] }] -- localStorage is used only inside Chromium page.evaluate callbacks. */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import electron from 'electron';
import puppeteer from 'puppeteer-core';
import { PDFDocument, PDFName } from 'pdf-lib';
import { inventory } from './tool-inventory.mjs';

const data =
	process.env.POLYWRENCH_TEST_DATA ||
	(await mkdtemp(join(tmpdir(), 'polywrench-smoke-')));
const executable = process.env.ELECTRON_EXECUTABLE || electron;
const args = [
	'--remote-debugging-port=0',
	'--disable-gpu',
	...(process.platform === 'linux'
		? ['--no-sandbox', '--gtk-version=3', '--ozone-platform=x11']
		: []),
	...(process.env.ELECTRON_EXECUTABLE ? [] : ['.']),
];
const child = spawn(executable, args, {
	env: { ...process.env, LOCAL_GUI_TEST_DATA: data },
	stdio: ['ignore', 'ignore', 'pipe'],
});
let browser;
let page;
let stderr = '';
const rendererErrors = [];
child.stderr.on('data', (chunk) => {
	stderr = (stderr + chunk.toString()).slice(-20000);
});
try {
	const endpoint = await new Promise((resolve, reject) => {
		const timer = setTimeout(
			() =>
				reject(
					new Error(
						`Electron startup timed out: ${stderr.slice(-3000)}`,
					),
				),
			30000,
		);
		child.stderr.on('data', () => {
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
		rendererErrors.push(error.stack || error.message);
		console.log('PAGE ERROR:', error.message);
	});
	page.on('console', (message) => {
		if (message.type() === 'error') {
			rendererErrors.push(message.text());
			console.log('CONSOLE:', message.text());
		}
	});
	page.on('requestfailed', (request) =>
		console.log(
			'FAILED REQUEST:',
			request.url(),
			request.failure()?.errorText,
		),
	);
	await page.setViewport({ width: 1440, height: 960 });
	// Attach before a controlled reload so early startup errors are observable on every OS.
	// Wait for the first load to finish; interrupting BrowserWindow.loadURL aborts startup.
	await page.waitForFunction(() => document.readyState === 'complete', {
		timeout: 30000,
	});
	await page.evaluate(() =>
		window.localStorage.setItem('theme', 'light'),
	);
	await page.reload({ waitUntil: 'load' });
	await page.waitForSelector('.lg-tool-card', { timeout: 30000 });
	assert.equal(
		await page.$$eval('.lg-quick-card', (cards) => cards.length),
		3,
	);
	const toolCount = await page.$eval(
		'.lg-tool-total .lg-total-line > strong',
		(element) => Number(element.textContent),
	);
	assert.equal(
		toolCount,
		(await inventory()).filter(
			(entry) => entry.category !== 'Workspace',
		).length,
	);

	assert(
		await page.evaluate(() => !!window.desktop),
		'Preload API available',
	);
	const status = await page.evaluate(() => window.desktop.status());
	assert(status.packs.length >= 7, 'Offline setup manifest available');
	await assertAppBranding(page);
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
	await page.evaluate(() => document.fonts.ready);
	const media = await page.createCDPSession();
	await media.send('Emulation.setEmulatedMedia', {
		features: [
			{
				name: 'prefers-reduced-transparency',
				value: 'no-preference',
			},
		],
	});
	const typography = await page.evaluate(() => ({
		body: getComputedStyle(document.querySelector('.lg-app'))
			.fontFamily,
		heading: getComputedStyle(
			document.querySelector('.lg-welcome h1'),
		).fontFamily,
		loaded: [...document.fonts]
			.filter((font) => font.status === 'loaded')
			.map((font) => font.family),
		frost: getComputedStyle(document.querySelector('.lg-widget'))
			.backdropFilter,
	}));
	assert(
		typography.body.includes('Google Sans') &&
			typography.heading.includes('Google Sans'),
	);
	assert(
		typography.loaded.some((name) => name.includes('Google Sans')),
		'Google Sans loads from packaged files',
	);
	assert(typography.frost.includes('blur'), 'Frosted surface is enabled');
	await media.send('Emulation.setEmulatedMedia', {
		features: [
			{
				name: 'prefers-reduced-transparency',
				value: 'reduce',
			},
		],
	});
	assert.equal(
		await page.$eval(
			'.lg-widget',
			(el) => getComputedStyle(el).backdropFilter,
		),
		'none',
		'Reduced transparency disables blur',
	);
	await media.send('Emulation.setEmulatedMedia', { features: [] });
	await media.detach();
	await page.emulateMediaFeatures([
		{ name: 'prefers-reduced-motion', value: 'reduce' },
	]);
	assert.equal(
		await page.$eval(
			'.lg-widget',
			(el) => getComputedStyle(el).animationName,
		),
		'none',
		'Reduced motion disables entrance animation',
	);
	await page.emulateMediaFeatures([
		{ name: 'prefers-reduced-motion', value: 'no-preference' },
	]);
	await page.evaluate(() =>
		Promise.all(
			document
				.getAnimations()
				.map((animation) =>
					animation.finished.catch(() => {}),
				),
		),
	);
	await page.screenshot({ path: 'artifacts/workspace.png' });
	await page.click('button[aria-label="Toggle colour theme"]');
	assert(
		await page.evaluate(() =>
			document.documentElement.classList.contains('dark'),
		),
	);
	await page.waitForFunction(
		() =>
			getComputedStyle(
				document.querySelector(
					'.lg-primary a[aria-current]',
				),
			).backgroundColor ===
			getComputedStyle(document.querySelector('.lg-search'))
				.backgroundColor,
	);
	await page.screenshot({ path: 'artifacts/workspace-dark.png' });
	await page.click('button[aria-label="Toggle colour theme"]');
	await page.setViewport({ width: 960, height: 720 });
	assert(
		await page.evaluate(
			() =>
				document.documentElement.scrollWidth <=
				innerWidth,
		),
	);
	await page.waitForFunction(
		() =>
			getComputedStyle(
				document.querySelector(
					'.lg-primary a[aria-current]',
				),
			).backgroundColor ===
			getComputedStyle(document.querySelector('.lg-search'))
				.backgroundColor,
	);
	await page.screenshot({ path: 'artifacts/workspace-compact.png' });
	await page.setViewport({ width: 1440, height: 960 });

	await page.type('input[aria-label="Search all tools"]', 'json');
	await page.waitForFunction(
		() => document.querySelectorAll('.lg-tool-card').length === 1,
	);
	const rows = await inventory();
	const routes = [
		'/converter',
		'/setup',
		'/w/image-to-pdf.pdf-compressor',
		'/privacy',
		...rows.map((row) => row.href),
	];
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
		if (route.startsWith('/tools/'))
			assert(
				await page.$('.pw-tool-header h1'),
				'PolyWrench tool header is present',
			);
		if (
			[
				'/tools/image-converter',
				'/tools/json-formatter',
				'/tools/pdf-organiser',
				'/converter',
			].includes(route)
		) {
			await page.evaluate(() =>
				Promise.all(
					document
						.getAnimations()
						.filter(
							(animation) =>
								animation.effect?.getComputedTiming()
									.iterations !==
								Infinity,
						)
						.map((animation) =>
							animation.finished.catch(
								() => {},
							),
						),
				),
			);
			await page.screenshot({
				path: `artifacts/${route.split('/').pop()}.png`,
			});
		}
		if (route === '/tools/image-converter') {
			await (
				await page.$(
					'.image-converter input[type="file"]',
				)
			).uploadFile('public/polywrench.png');
			await page.waitForFunction(
				() => {
					const button =
						document.querySelector(
							'.conv-download',
						);
					return button && !button.disabled;
				},
				{ timeout: 30000 },
			);
			assert(
				!(await page.$('.conv-failure')),
				'Image conversion succeeds through the redesigned controls',
			);
			await page.screenshot({
				path: 'artifacts/image-converter-loaded.png',
			});
		}
		if (route === '/errata') {
			await page.click(
				'button[aria-label="Toggle colour theme"]',
			);
			await page.waitForFunction(
				() =>
					getComputedStyle(
						document.documentElement,
					)
						.getPropertyValue(
							'--canon-card',
						)
						.trim() ===
					getComputedStyle(
						document.documentElement,
					)
						.getPropertyValue('--lg-panel')
						.trim(),
			);
			const pdf = await PDFDocument.create();
			pdf.addPage([600, 800]).drawText('Signature test');
			const fixture = join(data, 'signature-source.pdf');
			const downloads = join(data, 'signed-exports');
			await mkdir(downloads, { recursive: true });
			await writeFile(fixture, await pdf.save());
			await (
				await page.$('input[aria-label="Open PDF"]')
			).uploadFile(fixture);
			await page.waitForSelector('[data-page-label]');
			const openSign = async () => {
				await page.click('.sub-canvas-wrap');
				await page.keyboard.press('g');
				await page.waitForSelector('.err-sig.is-open');
				await page.waitForFunction(() => {
					const r = document
						.querySelector(
							'.err-sig.is-open',
						)
						.getBoundingClientRect();
					return (
						r.top >= 0 &&
						r.bottom <= window.innerHeight
					);
				});
			};
			const place = async () => {
				await page.click(
					'.err-sig.is-open .err-mode-apply',
				);
				await page.waitForSelector('.err-sig.is-open', {
					hidden: true,
				});
				await page.waitForFunction(
					() =>
						document.querySelector(
							'.err-sig-place img',
						)?.naturalWidth > 0,
				);
			};
			await openSign();
			await page.click(
				'.err-sig-methods button:nth-child(2)',
			);
			await page.type('.err-sig-name input', 'Alex Example');
			await page.screenshot({
				path: 'artifacts/pdf-editor-signature.png',
			});
			await place();
			await page.click('button[aria-label="Undo"]');
			await page.click('button[aria-label="Redo"]');
			await openSign();
			await page.click('.err-sig-methods button:first-child');
			const pad = await page.$('.err-sig-pad');
			const rect = await pad.boundingBox();
			await page.mouse.move(rect.x + 20, rect.y + 40);
			await page.mouse.down();
			await page.mouse.move(rect.x + 140, rect.y + 80, {
				steps: 12,
			});
			await page.mouse.up();
			await place();
			await openSign();
			const invalid = join(data, 'invalid-signature.txt');
			await writeFile(invalid, 'Not an image');
			await (
				await page.$(
					'input[aria-label="Upload signature"]',
				)
			).uploadFile(invalid);
			await page.waitForSelector(
				'.err-sig.is-open [role="alert"]',
			);
			const upload = join(data, 'signature.jpg');
			const jpeg = await page.evaluate(() => {
				const c = document.createElement('canvas');
				c.width = 100;
				c.height = 30;
				const ctx = c.getContext('2d');
				ctx.fillStyle = '#fff';
				ctx.fillRect(0, 0, 100, 30);
				ctx.fillStyle = '#111';
				ctx.fillText('Upload', 5, 20);
				return c.toDataURL('image/jpeg').split(',')[1];
			});
			await writeFile(upload, Buffer.from(jpeg, 'base64'));
			await (
				await page.$(
					'input[aria-label="Upload signature"]',
				)
			).uploadFile(upload);
			await page.waitForSelector('.err-sig.is-open', {
				hidden: true,
			});
			const saved = await page.evaluate(() =>
				JSON.parse(
					window.localStorage.getItem(
						'errata:signatures',
					),
				),
			);
			assert.equal(
				saved.length,
				3,
				'All signature methods saved locally',
			);
			assert(
				saved.every((url) =>
					url.startsWith('data:image/png'),
				),
				'Uploads normalized for PDF embedding',
			);
			const cdp = await page.createCDPSession();
			await cdp.send('Browser.setDownloadBehavior', {
				behavior: 'allow',
				downloadPath: downloads,
				eventsEnabled: true,
			});
			const downloaded = new Promise((resolve, reject) => {
				const timer = setTimeout(
					() =>
						reject(
							new Error(
								'Signed PDF export timed out',
							),
						),
					30000,
				);
				cdp.on('Browser.downloadProgress', (event) => {
					if (event.state === 'completed') {
						clearTimeout(timer);
						resolve();
					}
				});
			});
			await page.screenshot({
				path: 'artifacts/pdf-editor-signed.png',
			});
			await page.click('button[aria-label="Export"]');
			await downloaded;
			const result = await PDFDocument.load(
				await readFile(
					join(downloads, 'signature-source.pdf'),
				),
			);
			assert.equal(result.getPageCount(), 1);
			assert.equal(
				result
					.getPage(0)
					.node.Resources()
					.lookup(PDFName.of('XObject'))
					.keys().length,
				3,
				'Export embeds all three signature images',
			);
			await cdp.detach();
			await page.reload({ waitUntil: 'load' });
			await page.waitForSelector(
				'input[aria-label="Open PDF"]',
			);
			await (
				await page.$('input[aria-label="Open PDF"]')
			).uploadFile(fixture);
			await page.waitForSelector('[data-page-label]');
			await openSign();
			assert.equal(
				await page.$$eval(
					'.err-sig-cell',
					(cells) => cells.length,
				),
				3,
				'Signatures survive reload',
			);
			await page.click('.err-sig-remove');
			assert.equal(
				await page.evaluate(
					() =>
						JSON.parse(
							window.localStorage.getItem(
								'errata:signatures',
							),
						).length,
				),
				2,
				'Saved signature can be removed',
			);

			await page.click(
				'button[aria-label="Toggle colour theme"]',
			);
			console.log(
				'PASS typed, drawn and JPEG signatures, undo/redo and signed PDF export',
			);
		}
		if (route === '/tools/pdf-organiser') {
			const pdf = await PDFDocument.create();
			pdf.addPage([200, 300]);
			const fixture = join(data, 'smoke.pdf');
			await writeFile(fixture, await pdf.save());
			for (let attempt = 0; attempt < 2; attempt++) {
				await (
					await page.$(
						'.pdf-organiser input[type="file"]',
					)
				).uploadFile(fixture);
				await page.waitForFunction(() =>
					[
						...document.querySelectorAll(
							'.porg-strip img',
						),
					].some((img) => img.naturalWidth > 0),
				);
				await page.click('.porg-file button');
				await page.waitForSelector('.porg-blank');
			}
			console.log('PASS PDF rendering, cleanup and reopen');
		}
		await assertAppBranding(page);
		const errors = exceptions.slice(before);
		results.push({ route, passed: errors.length === 0, errors });
		console.log(
			`${errors.length ? 'FAIL' : 'PASS'} ${route}${errors.length ? `: ${errors.join('; ')}` : ''}`,
		);
	}
	await verifyAppAbout(page);
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
} catch (error) {
	await mkdir('artifacts', { recursive: true });
	await writeFile('artifacts/electron-stderr.log', stderr);
	console.error('Electron diagnostics:', stderr.slice(-6000));
	if (process.env.GITHUB_ACTIONS)
		console.error(
			'::error title=PolyWrench desktop failure::' +
				[
					error.message,
					...rendererErrors,
					stderr.slice(-4000),
				]
					.join(' | ')
					.replaceAll('%', '%25')
					.replaceAll('\r', '%0D')
					.replaceAll('\n', '%0A'),
		);
	if (page && !page.isClosed()) {
		await page
			.screenshot({ path: 'artifacts/startup-failure.png' })
			.catch(() => {});
		await writeFile(
			'artifacts/startup-failure.html',
			await page.content().catch(() => 'Page unavailable'),
		);
		console.error(
			'Page diagnostics:',
			await page
				.evaluate(() => ({
					url: location.href,
					readyState: document.readyState,
					text: document.body?.innerText.slice(
						0,
						3000,
					),
				}))
				.catch(() => 'Page unavailable'),
		);
	}
	throw error;
} finally {
	browser?.disconnect();
	child.kill();
	await new Promise((resolve) =>
		child.exitCode === null
			? child.once('exit', resolve)
			: resolve(),
	);
	if (!process.env.POLYWRENCH_TEST_DATA)
		await rm(data, {
			recursive: true,
			force: true,
			maxRetries: 6,
			retryDelay: 250,
		});
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

async function assertAppBranding(page) {
	const content = await page.evaluate(() => {
		const labels = [
			...document.querySelectorAll(
				'[aria-label], [title], img[alt], a[href]',
			),
		].flatMap((element) =>
			['aria-label', 'title', 'alt', 'href'].map(
				(name) => element.getAttribute(name) || '',
			),
		);
		return [
			document.title,
			document.body.innerText,
			...labels,
		].join('\n');
	});
	assert(
		!/delphi(?:tools|e)?\b|delphi\.tools|1612elphi|rmv\.fyi/i.test(
			content,
		),
		'Application labels and links use PolyWrench branding',
	);
}

async function verifyAppAbout(page) {
	await page.goto('app://local/editor', { waitUntil: 'load' });
	await page.waitForSelector('.sub-ed');

	await page.click('.sub-ed-stack [title="Menu"]');
	await page.waitForSelector('.sub-pg-link');
	await page.evaluate(() =>
		[...document.querySelectorAll('.sub-pg-link')]
			.find((element) =>
				element.textContent.includes(
					'About PolyWrench',
				),
			)
			?.click(),
	);
	await page.waitForSelector('dialog[open] .dt-about-body');
	assert(
		(
			await page.$eval(
				'dialog[open] .dt-about-body',
				(element) => element.innerText,
			)
		).includes('PolyWrench'),
	);
	await assertAppBranding(page);
	console.log('PASS PolyWrench About dialog and editor menu branding');
}
