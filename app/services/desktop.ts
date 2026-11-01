import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { desktop } from 'delphitools-v2/lib/desktop-api';
import type {
	DesktopEvent,
	SelectedFile,
	SetupStatus,
} from 'delphitools-v2/lib/desktop-api';

export default class DesktopService extends Service {
	@tracked files: SelectedFile[] = [];
	@tracked destination: { id: string; name: string } | null = null;
	@tracked target = '';
	@tracked quality = 'standard';
	@tracked busy = false;
	@tracked error = '';
	@tracked setup: SetupStatus = { packs: [], engines: {} };
	@tracked downloadId = '';
	@tracked downloadPercent = 0;
	private unsubscribe?: () => void;

	constructor(...args: ConstructorParameters<typeof Service>) {
		super(...args);
		this.unsubscribe = window.desktop?.onEvent(this.receive);
		void this.refresh();
	}
	override willDestroy() {
		super.willDestroy();
		this.unsubscribe?.();
	}

	receive = (event: DesktopEvent) => {
		if (event.type === 'queue-done') this.busy = false;
		if (event.type === 'download')
			this.downloadPercent = Math.floor(
				((event.received || 0) / (event.total || 1)) *
					100,
			);
		if (event.type === 'job')
			this.files = this.files.map((file) =>
				file.id === event.id
					? {
							...file,
							state: event.state,
							error: event.error,
							output: event.output,
						}
					: file,
			);
	};
	get targets() {
		const first = this.files[0];
		return first
			? first.targets.filter((target) =>
					this.files.every((file) =>
						file.targets.includes(target),
					),
				)
			: [];
	}
	get canStart() {
		return (
			!!this.files.length &&
			!!this.destination &&
			this.targets.includes(this.target) &&
			!this.busy &&
			!this.downloadId
		);
	}
	get locked() {
		return this.busy || !!this.downloadId;
	}

	async attempt(work: () => Promise<unknown>) {
		this.error = '';
		try {
			await work();
		} catch (error) {
			this.error =
				error instanceof Error
					? error.message
					: String(error);
		}
	}
	refresh = () =>
		this.attempt(async () => {
			if (!window.desktop) return;
			this.setup = await desktop().status();
			if (this.files.length && !this.busy) {
				const updated = await desktop().refreshFiles(
					this.files.map((file) => file.id),
				);
				this.files = this.files.map((file) => ({
					...file,
					targets:
						updated.find(
							(fresh) =>
								fresh.id ===
								file.id,
						)?.targets || [],
				}));
			}
		});
	add = (files: SelectedFile[]) => {
		this.files = [...this.files, ...files];
		if (!this.targets.includes(this.target))
			this.target = this.targets[0] || '';
	};
	chooseFiles = () =>
		this.attempt(async () => {
			this.add(await desktop().chooseFiles());
		});
	drop = (event: DragEvent) => {
		event.preventDefault();
		if (this.locked || !event.dataTransfer?.files.length) return;
		const files = Array.from(event.dataTransfer.files);
		void this.attempt(async () => {
			this.add(await desktop().dropFiles(files));
		});
	};
	chooseDestination = () =>
		this.attempt(async () => {
			this.destination =
				(await desktop().chooseDestination()) ||
				this.destination;
		});
	start = () =>
		this.attempt(async () => {
			if (!this.canStart || !this.destination) return;
			this.busy = true;
			this.files = this.files.map((file) => ({
				...file,
				state: 'queued',
				error: undefined,
				output: undefined,
			}));
			try {
				await desktop().start({
					fileIds: this.files.map(
						(file) => file.id,
					),
					destinationId: this.destination.id,
					target: this.target,
					quality: this.quality,
				});
			} catch (error) {
				this.busy = false;
				throw error;
			}
		});
	cancel = () => this.attempt(() => desktop().cancel());
	clear = () => {
		if (!this.locked) {
			this.files = [];
			this.target = '';
		}
	};
	remove = (id: string) => {
		if (!this.locked)
			this.files = this.files.filter(
				(file) => file.id !== id,
			);
	};
	reveal = (id: string) => this.attempt(() => desktop().reveal(id));
	chooseEngine = (name: string) =>
		this.attempt(async () => {
			await desktop().chooseEngine(name);
			await this.refresh();
		});
	install = (id: string, accepted: boolean) =>
		this.attempt(async () => {
			if (this.locked) return;
			this.downloadId = id;
			this.downloadPercent = 0;
			try {
				await desktop().download(id, accepted);
			} finally {
				this.downloadId = '';
				await this.refresh();
			}
		});
	cancelDownload = () => this.attempt(() => desktop().cancelDownload());
}

declare module '@ember/service' {
	interface Registry {
		desktop: DesktopService;
	}
}
