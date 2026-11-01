const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
	chooseFiles: () => ipcRenderer.invoke('files:choose'),
	dropFiles: (files) =>
		ipcRenderer.invoke(
			'files:drop',
			Array.from(files, (file) =>
				webUtils.getPathForFile(file),
			),
		),
	refreshFiles: (ids) => ipcRenderer.invoke('files:refresh', ids),
	chooseDestination: () => ipcRenderer.invoke('destination:choose'),
	status: () => ipcRenderer.invoke('setup:status'),
	chooseEngine: (name) => ipcRenderer.invoke('engine:choose', name),
	download: (id, accepted) =>
		ipcRenderer.invoke('assets:install', id, accepted),
	cancelDownload: () => ipcRenderer.invoke('assets:cancel'),
	start: (options) => ipcRenderer.invoke('jobs:start', options),
	cancel: () => ipcRenderer.invoke('jobs:cancel'),
	reveal: (id) => ipcRenderer.invoke('output:reveal', id),
	onEvent: (callback) => {
		const listener = (_event, payload) => callback(payload);
		ipcRenderer.on('desktop:event', listener);
		return () =>
			ipcRenderer.removeListener('desktop:event', listener);
	},
});
