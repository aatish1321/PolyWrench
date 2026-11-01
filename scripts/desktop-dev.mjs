import { spawn } from 'node:child_process';
import electron from 'electron';

const vite = spawn(
	process.execPath,
	['node_modules/vite/bin/vite.js', '--port', '3000', '--strictPort'],
	{ stdio: 'inherit' },
);
let desktop;
const stop = () => {
	desktop?.kill();
	vite.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
vite.on('exit', () => desktop?.kill());
for (let attempt = 0; attempt < 120; attempt++) {
	try {
		const response = await fetch('http://localhost:3000');
		if (response.ok) break;
	} catch {
		/* Wait for Vite to start. */
	}
	if (attempt === 119) {
		stop();
		throw new Error('Development server did not start');
	}
	await new Promise((resolve) => setTimeout(resolve, 500));
}
desktop = spawn(electron, ['.'], {
	stdio: 'inherit',
	env: { ...process.env, LOCAL_GUI_DEV_URL: 'http://localhost:3000' },
});
desktop.on('exit', (code) => {
	vite.kill();
	process.exitCode = code || 0;
});
