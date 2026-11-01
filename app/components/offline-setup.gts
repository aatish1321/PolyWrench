import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import eq from 'ember-truth-helpers/helpers/eq';
import type DesktopService from 'delphitools-v2/services/desktop';
import { sizeLabel } from 'delphitools-v2/lib/desktop-api';

export default class OfflineSetup extends Component {
	@service declare desktop: DesktopService;
	@tracked accepted = false;
	accept = (event: Event) => {
		this.accepted = (event.target as HTMLInputElement).checked;
	};
	get engines() {
		return ['ffmpeg', 'pandoc', 'libreoffice'].map((id) => ({
			id,
			executable: this.desktop.setup.engines[id],
		}));
	}
	<template>
		<div class="lg-page"><div class="lg-eyebrow">DOWNLOAD ONCE. WORK
				OFFLINE.</div><h1>Offline Setup</h1><p
				class="lg-intro"
			>Choose the engines and models you need. Downloads are
				verified and stored on this device.</p>
			<section class="lg-setup-section"><h2>Conversion engines</h2><p
				>Use a managed download below, or select an
					existing executable. Restarting does not
					require another download.</p><div
					class="lg-engine-grid"
				>{{#each this.engines as |engine|}}<article><h3
							>{{engine.id}}</h3><p
								class="lg-engine-path"
							>{{if
									engine.executable
									engine.executable
									"Not installed"
								}}</p><button
								class="lg-button"
								type="button"
								disabled={{this.desktop.locked}}
								{{on
									"click"
									(fn
										this.desktop.chooseEngine
										engine.id
									)
								}}
							>Select executable</button></article>{{/each}}</div><p
					class="lg-muted"
				>For office documents and PDF export, install
					<a
						href="https://www.libreoffice.org/download/download-libreoffice/"
						target="_blank"
						rel="noopener noreferrer"
					>LibreOffice ↗</a>, then select its
					libreoffice or soffice executable. On
					macOS it is detected inside
					/Applications/LibreOffice.app.</p></section>
			<section class="lg-setup-section"><h2>Offline downloads</h2><p
				>Only selected downloads use the internet. Files
					you work on are never uploaded.</p><label
					class="lg-license-accept"
				><input
						type="checkbox"
						checked={{this.accepted}}
						{{on "change" this.accept}}
					/>I have read and accept the separate
					BRIA model terms for background removal.
					Commercial use requires a commercial
					license.</label>
				<div class="lg-packs">{{#each
						this.desktop.setup.packs
						as |pack|
					}}<article class="lg-pack"><div><h3
								>{{pack.title}}
									<small
									>{{sizeLabel
											pack.bytes
										}}</small></h3><p
								>{{pack.description}}</p><a
									href={{pack.licenseUrl}}
									target="_blank"
									rel="noopener noreferrer"
								>{{pack.license}}
									↗</a></div><div
								class="lg-pack-actions"
							>{{#if pack.ready}}<span
										class="lg-ready"
									>Ready
										offline
										✓</span>{{else if
									(eq
										this.desktop.downloadId
										pack.id
									)
								}}<progress
										max="100"
										value={{this.desktop.downloadPercent}}
										aria-label="Download progress"
									></progress><span
										role="status"
									>{{this.desktop.downloadPercent}}%</span><button
										type="button"
										{{on
											"click"
											this.desktop.cancelDownload
										}}
									>Cancel</button>{{else}}<button
										type="button"
										class="lg-button"
										disabled={{if
											pack.restricted
											(unless
												this.accepted
												true
												this.desktop.locked
											)
											this.desktop.locked
										}}
										{{on
											"click"
											(fn
												this.desktop.install
												pack.id
												this.accepted
											)
										}}
									>Download</button>{{/if}}</div></article>{{/each}}</div>
			</section><p class="lg-muted">Large Turbo transcription
				requires a compatible WebGPU device. Screen
				capture availability depends on your operating
				system and its recording permissions.
				Screen/system audio is not captured; microphone
				audio can be enabled in the recorder.</p>
		</div>
	</template>
}
