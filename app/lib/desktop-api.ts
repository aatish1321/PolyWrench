export interface SelectedFile {
	id: string;
	name: string;
	size: number;
	targets: string[];
	state?: string;
	error?: string;
	output?: string;
}
export interface AssetPack {
	id: string;
	title: string;
	description: string;
	engine?: string;
	license: string;
	licenseUrl: string;
	restricted: boolean;
	bytes: number;
	ready: boolean;
}
export interface SetupStatus {
	packs: AssetPack[];
	engines: Record<string, string | null>;
}
export interface DesktopEvent {
	type: string;
	id?: string;
	state?: string;
	output?: string;
	error?: string;
	received?: number;
	total?: number;
}
export interface DesktopAPI {
	chooseFiles(): Promise<SelectedFile[]>;
	dropFiles(files: File[]): Promise<SelectedFile[]>;
	refreshFiles(ids: string[]): Promise<SelectedFile[]>;
	chooseDestination(): Promise<{ id: string; name: string } | null>;
	status(): Promise<SetupStatus>;
	chooseEngine(name: string): Promise<SetupStatus['engines']>;
	download(id: string, accepted: boolean): Promise<AssetPack[]>;
	cancelDownload(): Promise<void>;
	start(options: {
		fileIds: string[];
		destinationId: string;
		target: string;
		quality: string;
	}): Promise<boolean>;
	cancel(): Promise<void>;
	reveal(id: string): Promise<void>;
	onEvent(callback: (event: DesktopEvent) => void): () => void;
}
declare global {
	interface Window {
		desktop?: DesktopAPI;
	}
}
export function desktop(): DesktopAPI {
	if (!window.desktop)
		throw new Error(
			'Open PolyWrench as a desktop application to use this feature.',
		);
	return window.desktop;
}
export function sizeLabel(bytes: number): string {
	return bytes >= 1e9
		? `${(bytes / 1e9).toFixed(1)} GB`
		: `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}
