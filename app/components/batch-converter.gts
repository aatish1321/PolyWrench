import Component from '@glimmer/component';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import eq from 'ember-truth-helpers/helpers/eq';
import type DesktopService from 'delphitools-v2/services/desktop';
import { IconSvg } from 'delphitools-v2/components/icon';
import { sizeLabel } from 'delphitools-v2/lib/desktop-api';

export default class BatchConverter extends Component {
	@service declare desktop: DesktopService;
	prevent = (event: DragEvent) => {
		event.preventDefault();
	};
	target = (event: Event) => {
		this.desktop.target = (event.target as HTMLSelectElement).value;
	};
	quality = (event: Event) => {
		this.desktop.quality = (
			event.target as HTMLSelectElement
		).value;
	};
	<template>
		<div class="lg-page">
			<div class="lg-eyebrow">FILES IN. FRESH FORMATS OUT.</div><h1
			>Batch Converter</h1><p class="lg-intro">Convert files
				locally. Your originals stay exactly where they
				are.</p>
			<div
				class="lg-drop"
				{{on "dragover" this.prevent}}
				{{on "drop" this.desktop.drop}}
			><IconSvg @name="files" /><h2>Drop your files here</h2><p
				>Or choose files from your device. Use one file
					family per batch.</p><button
					class="lg-button lg-button--primary"
					type="button"
					disabled={{this.desktop.locked}}
					{{on "click" this.desktop.chooseFiles}}
				>Choose files</button></div>
			<div class="lg-convert-controls"><label>Convert to<select
						value={{this.desktop.target}}
						disabled={{this.desktop.locked}}
						{{on "change" this.target}}
					><option value="">Select a format</option>{{#each
							this.desktop.targets
							as |format|
						}}<option
								value={{format}}
								selected={{eq
									this.desktop.target
									format
								}}
							>{{format}}</option>{{/each}}</select></label><label
				>Quality<select
						disabled={{this.desktop.locked}}
						{{on "change" this.quality}}
					><option
							value="standard"
							selected={{eq
								this.desktop.quality
								"standard"
							}}
						>Standard</option><option
							value="high"
							selected={{eq
								this.desktop.quality
								"high"
							}}
						>High</option></select></label><div
				><span>Save to</span><button
						type="button"
						class="lg-button lg-destination"
						disabled={{this.desktop.locked}}
						{{on
							"click"
							this.desktop.chooseDestination
						}}
					>{{if
							this.desktop.destination
							this.desktop.destination.name
							"Choose output folder"
						}}</button></div></div>
			{{#if this.desktop.files.length}}<section
					class="lg-queue"
				><div class="lg-queue-heading"><h2
						>{{this.desktop.files.length}}
							files</h2><button
							type="button"
							disabled={{this.desktop.locked}}
							{{on
								"click"
								this.desktop.clear
							}}
						>Clear queue</button></div><ul
					>{{#each
							this.desktop.files
							as |file|
						}}<li><IconSvg
									@name="file"
								/><div
									class="lg-file-info"
								><strong
									>{{file.name}}</strong><small
									>{{sizeLabel
											file.size
										}}
										{{#if
											file.output
										}}·
											{{file.output}}{{/if}}</small>{{#if
										file.error
									}}<p
											class="lg-file-error"
										>{{file.error}}</p>{{/if}}{{#unless
										file.targets.length
									}}<p
											class="lg-file-error"
										>No
											conversion
											engine
											for
											this
											file.
											Open
											Offline
											Setup.</p>{{/unless}}</div><span
									class="lg-job-state"
									aria-live="polite"
								>{{if
										file.state
										file.state
										"ready"
									}}</span>{{#if
									(eq
										file.state
										"done"
									)
								}}<button
										type="button"
										{{on
											"click"
											(fn
												this.desktop.reveal
												file.id
											)
										}}
									>Show
										file</button>{{/if}}<button
									type="button"
									aria-label="Remove file"
									disabled={{this.desktop.locked}}
									{{on
										"click"
										(fn
											this.desktop.remove
											file.id
										)
									}}
								>×</button></li>{{/each}}</ul></section>{{else}}<p
					class="lg-muted"
				>Need a conversion engine? Download FFmpeg and
					Pandoc in Offline Setup.</p>{{/if}}
			{{#if this.desktop.files.length}}{{#unless
					this.desktop.targets.length
				}}<p class="lg-error">These files have no common
						output format. Try a batch with
						matching file types, or install
						the missing engine in Offline
						Setup.</p>{{/unless}}{{/if}}
			<div class="lg-convert-footer"><p>Existing files are
					preserved. Each new output gets a unique
					name.</p>{{#if
					this.desktop.busy
				}}<button
						type="button"
						class="lg-button"
						{{on
							"click"
							this.desktop.cancel
						}}
					>Cancel conversion</button>{{else}}<button
						type="button"
						class="lg-button lg-button--primary"
						disabled={{unless
							this.desktop.canStart
							true
						}}
						{{on
							"click"
							this.desktop.start
						}}
					>Convert files →</button>{{/if}}</div>
		</div>
	</template>
}
