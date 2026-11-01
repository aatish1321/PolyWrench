const {
	app,
	BrowserWindow,
	protocol,
	ipcMain,
	dialog,
	shell,
	session,
	desktopCapturer,
	systemPreferences,
	Menu,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { serveFile } = require('./resources.cjs');
const { randomUUID } = require('node:crypto');
const { Assets } = require('./assets.cjs');
const { Engines } = require('./engines.cjs');
const { targets, convertOne } = require('./conversion.cjs');
const { inside, localRequest } = require('./paths.cjs');

protocol.registerSchemesAsPrivileged([
	{
		scheme: 'app',
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			corsEnabled: true,
			stream: true,
		},
	},
]);
// GTK4 expects newer GNOME font schema keys than some supported desktops provide.
if (process.platform === 'linux')
	app.commandLine.appendSwitch('gtk-version', '3');
app.setName('PolyWrench');
if (process.env.LOCAL_GUI_TEST_DATA)
	app.setPath('userData', path.resolve(process.env.LOCAL_GUI_TEST_DATA));
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
	if (window) {
		if (window.isMinimized()) window.restore();
		window.focus();
	}
});
const devURL =
	!app.isPackaged &&
	process.env.LOCAL_GUI_DEV_URL === 'http://localhost:3000'
		? process.env.LOCAL_GUI_DEV_URL
		: null;
let window;
let assets;
let engines;
let job;
const selected = new Map();
const destinations = new Map();
const outputs = new Map();
const send = (event) => {
	if (window && !window.isDestroyed())
		window.webContents.send('desktop:event', event);
};

function trusted(event) {
	const url = event.senderFrame?.url;
	if (
		event.sender !== window?.webContents ||
		event.senderFrame !== window.webContents.mainFrame ||
		!(
			url?.startsWith('app://local/') ||
			(devURL && new URL(url).origin === devURL)
		)
	)
		throw new Error('Untrusted caller');
}
function handle(name, callback) {
	ipcMain.handle(name, (event, ...args) => {
		trusted(event);
		return callback(...args);
	});
}
async function registerFiles(paths) {
	if (
		!Array.isArray(paths) ||
		paths.length > 500 ||
		paths.some((p) => typeof p !== 'string' || !path.isAbsolute(p))
	)
		throw new Error('Invalid file selection');
	const installed = await engines.paths();
	const result = [];
	for (const input of paths) {
		const stat = await fs.stat(input);
		if (!stat.isFile())
			throw new Error('Select files, not directories');
		const id = randomUUID();
		selected.set(id, input);
		result.push({
			id,
			name: path.basename(input),
			size: stat.size,
			targets: targets(path.extname(input), installed),
		});
	}
	return result;
}

async function setupIPC() {
	handle('files:choose', async () => {
		const result = await dialog.showOpenDialog(window, {
			properties: ['openFile', 'multiSelections'],
		});
		return result.canceled ? [] : registerFiles(result.filePaths);
	});
	handle('files:drop', registerFiles);
	handle('files:refresh', async (ids) => {
		if (!Array.isArray(ids) || ids.some((id) => !selected.has(id)))
			throw new Error('Unknown file');
		const installed = await engines.paths();
		return ids.map((id) => ({
			id,
			targets: targets(
				path.extname(selected.get(id)),
				installed,
			),
		}));
	});
	handle('destination:choose', async () => {
		const result = await dialog.showOpenDialog(window, {
			properties: ['openDirectory', 'createDirectory'],
		});
		if (result.canceled) return null;
		const id = randomUUID();
		destinations.set(id, result.filePaths[0]);
		return { id, name: result.filePaths[0] };
	});
	handle('setup:status', async () => ({
		packs: await assets.list(),
		engines: await engines.paths(),
	}));
	handle('engine:choose', async (name) => {
		if (!['ffmpeg', 'pandoc', 'libreoffice'].includes(name))
			throw new Error('Unknown engine');
		if (job || assets.active)
			throw new Error(
				'Wait for the current operation to finish',
			);
		const result = await dialog.showOpenDialog(window, {
			title: `Select ${name} executable`,
			properties: ['openFile'],
		});
		if (!result.canceled)
			await engines.set(name, result.filePaths[0]);
		return engines.paths();
	});
	handle('assets:install', async (id, accepted) => {
		if (job) throw new Error('Wait for conversions to finish');
		await assets.install(id, accepted, (progress) =>
			send({ type: 'download', ...progress }),
		);
		return assets.list();
	});
	handle('assets:cancel', () => assets.cancel());
	handle('jobs:cancel', () => job?.abort());
	handle('output:reveal', (id) => {
		if (!outputs.has(id)) throw new Error('Unknown output');
		shell.showItemInFolder(outputs.get(id));
	});
	handle('jobs:start', async (options) => {
		if (job || assets.active)
			throw new Error('Another operation is running');
		const { fileIds, destinationId, target, quality } =
			options || {};
		if (
			!Array.isArray(fileIds) ||
			!fileIds.length ||
			fileIds.length > 500 ||
			new Set(fileIds).size !== fileIds.length ||
			fileIds.some((id) => !selected.has(id)) ||
			!destinations.has(destinationId) ||
			typeof target !== 'string' ||
			!['standard', 'high'].includes(quality)
		)
			throw new Error('Invalid conversion request');
		const enginePaths = await engines.paths();
		if (
			fileIds.some(
				(id) =>
					!targets(
						path.extname(selected.get(id)),
						enginePaths,
					).includes(target),
			)
		)
			throw new Error(
				'Some selected files cannot use this target format. Check offline setup.',
			);
		const controller = new AbortController();
		job = controller;
		void (async () => {
			try {
				for (
					let index = 0;
					index < fileIds.length;
					index++
				) {
					const id = fileIds[index];
					if (controller.signal.aborted) {
						send({
							type: 'job',
							id,
							state: 'cancelled',
						});
						continue;
					}
					send({
						type: 'job',
						id,
						state: 'running',
						index: index + 1,
						total: fileIds.length,
					});
					try {
						const output = await convertOne(
							{
								input: selected.get(
									id,
								),
								destination:
									destinations.get(
										destinationId,
									),
								target,
								quality,
								engines: enginePaths,
								signal: controller.signal,
							},
						);
						outputs.set(id, output);
						send({
							type: 'job',
							id,
							state: 'done',
							output: path.basename(
								output,
							),
						});
					} catch (error) {
						send({
							type: 'job',
							id,
							state: controller.signal
								.aborted
								? 'cancelled'
								: 'error',
							error: error.message,
						});
					}
				}
			} finally {
				job = null;
				send({ type: 'queue-done' });
			}
		})();
		return true;
	});
}

async function createWindow() {
	window = new BrowserWindow({
		width: 1440,
		height: 960,
		minWidth: 920,
		minHeight: 640,
		backgroundColor: '#f5f6f8',
		title: 'PolyWrench',
		icon: path.join(__dirname, '..', 'dist', 'polywrench.png'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.cjs'),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			webviewTag: false,
		},
	});
	const external = async (url) => {
		if (!/^https?:\/\//.test(url)) return;
		const result = await dialog.showMessageBox(window, {
			type: 'question',
			message: 'Open this link in your browser?',
			detail: url,
			buttons: ['Cancel', 'Open browser'],
			defaultId: 0,
			cancelId: 0,
		});
		if (result.response === 1) await shell.openExternal(url);
	};
	window.webContents.setWindowOpenHandler(({ url }) => {
		void external(url);
		return { action: 'deny' };
	});
	window.webContents.on('will-navigate', (event, url) => {
		if (
			(new URL(url).origin === (devURL || 'null') &&
				devURL) ||
			url.startsWith('app://local/')
		)
			return;
		event.preventDefault();
		void external(url);
	});
	window.on('close', (event) => {
		if (!job && !assets.active) return;
		event.preventDefault();
		void dialog
			.showMessageBox(window, {
				message: 'Cancel the current operation and close?',
				buttons: ['Keep working', 'Cancel and close'],
				defaultId: 0,
				cancelId: 0,
			})
			.then(async (answer) => {
				if (answer.response !== 1) return;
				job?.abort();
				assets.cancel();
				// Keep the process alive until child processes and temporary files are cleaned.
				const timer = setInterval(() => {
					if (!job && !assets.active) {
						clearInterval(timer);
						window.destroy();
					}
				}, 100);
			});
	});
	await window.loadURL(devURL || 'app://local/');
}

app.whenReady()
	.then(async () => {
		assets = new Assets(
			path.join(app.getPath('userData'), 'packs'),
		);
		engines = new Engines(app.getPath('userData'), assets);
		protocol.handle('app', async (request) => {
			try {
				const name = localRequest(request.url);
				let file;
				if (
					name.startsWith('models/') ||
					name.startsWith('offline/')
				)
					file = await assets.resource(name);
				else {
					const root = path.join(
						__dirname,
						'..',
						'dist',
					);
					file = inside(
						root,
						name || 'index.html',
					);
					try {
						await fs.access(file);
					} catch {
						if (!path.extname(name))
							file = path.join(
								root,
								'index.html',
							);
						else file = null;
					}
				}
				if (!file)
					return new Response(
						'Open Offline Setup to install this asset.',
						{ status: 404 },
					);
				const response = await serveFile(file, request);
				const headers = new Headers(response.headers);
				headers.set(
					'Cross-Origin-Opener-Policy',
					'same-origin',
				);
				headers.set(
					'Cross-Origin-Embedder-Policy',
					'require-corp',
				);
				headers.set(
					'Content-Security-Policy',
					"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self' blob: data:; object-src 'none'; frame-src 'self' blob:; base-uri 'self'",
				);
				return new Response(response.body, {
					status: response.status,
					headers,
				});
			} catch {
				return new Response('Resource unavailable', {
					status: 404,
				});
			}
		});
		session.defaultSession.webRequest.onBeforeRequest(
			(details, callback) => {
				const url = new URL(details.url);
				const allowed =
					[
						'app:',
						'blob:',
						'data:',
						'devtools:',
					].includes(url.protocol) ||
					(devURL &&
						(url.origin === devURL ||
							(url.protocol ===
								'ws:' &&
								url.hostname ===
									'localhost' &&
								url.port ===
									'3000')));
				callback({ cancel: !allowed });
			},
		);
		session.defaultSession.setPermissionCheckHandler(
			(_webContents, permission, origin) =>
				(origin === 'app://local' ||
					origin === devURL) &&
				[
					'media',
					'display-capture',
					'clipboard-sanitized-write',
				].includes(permission),
		);
		session.defaultSession.setPermissionRequestHandler(
			async (contents, permission, callback) => {
				if (
					contents !== window?.webContents ||
					![
						'media',
						'display-capture',
						'clipboard-sanitized-write',
					].includes(permission)
				)
					return callback(false);
				if (permission === 'clipboard-sanitized-write')
					return callback(true);
				const answer = await dialog.showMessageBox(
					window,
					{
						message:
							permission === 'media'
								? 'Allow this tool to use your microphone/camera?'
								: 'Allow screen recording?',
						buttons: ['Deny', 'Allow'],
						defaultId: 0,
						cancelId: 0,
					},
				);
				if (
					answer.response === 1 &&
					process.platform === 'darwin' &&
					permission === 'media'
				)
					callback(
						await systemPreferences.askForMediaAccess(
							'microphone',
						),
					);
				else callback(answer.response === 1);
			},
		);
		session.defaultSession.setDisplayMediaRequestHandler(
			async (_request, callback) => {
				try {
					const sources =
						await desktopCapturer.getSources(
							{
								types: [
									'screen',
									'window',
								],
							},
						);
					if (!sources.length)
						return callback({});
					const answer =
						await dialog.showMessageBox(
							window,
							{
								message: 'Choose a screen or window to record',
								buttons: [
									'Cancel',
									...sources.map(
										(
											s,
										) =>
											s.name,
									),
								],
								cancelId: 0,
								defaultId: 0,
							},
						);
					const source =
						sources[answer.response - 1];
					callback(
						source ? { video: source } : {},
					);
				} catch {
					callback({});
				}
			},
			{ useSystemPicker: true },
		);
		Menu.setApplicationMenu(
			Menu.buildFromTemplate([
				...(process.platform === 'darwin'
					? [{ role: 'appMenu' }]
					: []),
				{ role: 'fileMenu' },
				{ role: 'editMenu' },
				{ role: 'viewMenu' },
				{ role: 'windowMenu' },
			]),
		);
		await setupIPC();
		await createWindow();
		app.on('activate', () => {
			if (BrowserWindow.getAllWindows().length === 0)
				void createWindow();
		});
	})
	.catch((error) => {
		console.error(error);
		app.quit();
	});
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});
