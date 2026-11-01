const fs = require('node:fs/promises');
const path = require('node:path');

const commands = {
	ffmpeg: ['ffmpeg'],
	pandoc: ['pandoc'],
	libreoffice: ['libreoffice', 'soffice'],
};
class Engines {
	constructor(root, assets) {
		this.configFile = path.join(root, 'engines.json');
		this.assets = assets;
	}
	async config() {
		try {
			return JSON.parse(
				await fs.readFile(this.configFile, 'utf8'),
			);
		} catch (error) {
			if (error.code === 'ENOENT') return {};
			throw error;
		}
	}
	async set(name, executable) {
		if (!Object.hasOwn(commands, name))
			throw new Error('Unknown engine');
		if (!(await fs.stat(executable)).isFile())
			throw new Error('Choose an executable file');
		const config = await this.config();
		config[name] = executable;
		await fs.mkdir(path.dirname(this.configFile), {
			recursive: true,
		});
		const temp = `${this.configFile}.tmp`;
		await fs.writeFile(temp, JSON.stringify(config, null, 2));
		await fs.rename(temp, this.configFile);
	}
	async paths() {
		const config = await this.config();
		const result = {};
		for (const [name, candidates] of Object.entries(commands)) {
			const managed = await this.assets.engine(name);
			const dirs = (process.env.PATH || '').split(
				path.delimiter,
			);
			const locations = [config[name], managed];
			if (
				process.platform === 'darwin' &&
				name === 'libreoffice'
			)
				locations.push(
					'/Applications/LibreOffice.app/Contents/MacOS/soffice',
				);
			if (
				process.platform === 'win32' &&
				name === 'libreoffice'
			) {
				for (const dir of [
					process.env.ProgramFiles,
					process.env['ProgramFiles(x86)'],
				].filter(Boolean))
					locations.push(
						path.join(
							dir,
							'LibreOffice',
							'program',
							'soffice.exe',
						),
					);
			}
			for (const dir of dirs.filter(Boolean))
				for (const candidate of candidates)
					locations.push(
						path.join(
							dir,
							candidate +
								(process.platform ===
								'win32'
									? '.exe'
									: ''),
						),
					);
			result[name] = null;
			for (const location of locations.filter(Boolean)) {
				try {
					if (!(await fs.stat(location)).isFile())
						continue;
					await fs.access(
						location,
						process.platform === 'win32'
							? fs.constants.F_OK
							: fs.constants.X_OK,
					);
					result[name] = location;
					break;
				} catch {
					/* Try the next installed location. */
				}
			}
		}
		return result;
	}
}
module.exports = { Engines };
