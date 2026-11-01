import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import type RouterService from '@ember/routing/router-service';
import type DesktopService from 'delphitools-v2/services/desktop';
import { toolCategories, getToolById } from 'delphitools-v2/lib/tools';
import { IconSvg } from 'delphitools-v2/components/icon';

const QUICK_PICKS = [
	'image-converter',
	'pdf-organiser',
	'audio-trimmer',
].flatMap((id) => {
	const tool = getToolById(id);
	return tool ? [tool] : [];
});

export default class ToolDirectory extends Component {
	@service declare router: RouterService;
	@service declare desktop: DesktopService;
	@tracked query = '';
	@tracked category = '';
	quickPicks = QUICK_PICKS;
	get categories() {
		return toolCategories.filter((c) => c.id !== 'elsewhere');
	}
	get count() {
		return this.categories.reduce(
			(count, category) => count + category.tools.length,
			0,
		);
	}
	get featuredCategories() {
		return [...this.categories]
			.sort((a, b) => b.tools.length - a.tools.length)
			.slice(0, 3);
	}
	get readyCount() {
		return this.desktop.setup.packs.filter((pack) => pack.ready)
			.length;
	}
	get engines() {
		return [
			{
				id: 'ffmpeg',
				name: 'Images, audio & video',
				icon: 'image',
			},
			{
				id: 'pandoc',
				name: 'Documents & ebooks',
				icon: 'file-text',
			},
			{
				id: 'libreoffice',
				name: 'Office & PDF export',
				icon: 'files',
			},
		].map((engine) => ({
			...engine,
			ready: !!this.desktop.setup.engines[engine.id],
		}));
	}
	get filtered() {
		return !!this.query.trim() || !!this.category;
	}
	get groups() {
		const query = this.query.trim().toLowerCase();
		return this.categories
			.filter((c) => !this.category || c.id === this.category)
			.map((c) => ({
				...c,
				tools: c.tools.filter((t) =>
					`${t.name} ${t.description} ${c.name}`
						.toLowerCase()
						.includes(query),
				),
			}))
			.filter((c) => c.tools.length);
	}
	search = (event: Event) => {
		this.query = (event.target as HTMLInputElement).value;
	};
	select = (event: Event) => {
		this.category = (event.target as HTMLSelectElement).value;
	};
	go = (href: string, event: MouseEvent) => {
		event.preventDefault();
		void this.router.transitionTo(href);
	};

	<template>
		<div class="lg-page lg-directory">
			<header class="lg-welcome"><div><div
						class="lg-eyebrow"
					>A LITTLE SPACE TO MAKE THINGS</div><h1
					>Your everyday toolbox<span
							class="lg-heading-dot"
						>.</span></h1><p
						class="lg-intro"
					>Big ideas. Small tasks. A handy tool
						for all of it.</p></div><span
					class="lg-welcome-mark"
					aria-hidden="true"
				>✳</span></header>
			{{#unless this.filtered}}
				<div class="lg-dashboard">
					<div class="lg-dashboard-content">
						<div class="lg-overview">
							<article
								class="lg-widget lg-tool-total"
							><div
									class="lg-widget-label"
								>Tools at your
									fingertips<span
										class="lg-tiny-icon"
									><IconSvg
											@name="layout-grid"
										/></span></div><div
									class="lg-total-line"
								><strong
									>{{this.count}}</strong><span
									>little
										helpers,<br
										/>endless
										possibilities.</span><div
										class="lg-count-art"
										aria-hidden="true"
									><i
										></i><i
										></i><i
										></i><i
										></i></div></div><p
								>One app. A
									whole
									lot less
									busywork.</p></article>
							<article
								class="lg-widget lg-category-widget"
							><div
									class="lg-widget-label"
								>Something for
									every
									project<span
										class="lg-small-tag"
									>{{this.categories.length}}
										categories</span></div><div
									class="lg-category-bars"
								>{{#each
										this.featuredCategories
										as |category|
									}}<div
										><div
											><span
												>{{category.name}}</span><strong
												>{{category.tools.length}}
													tools</strong></div><progress
												max={{this.count}}
												value={{category.tools.length}}
												aria-label={{category.name}}
											></progress></div>{{/each}}</div></article>
						</div>
						<a
							class="lg-converter-card"
							href="/converter"
							{{on
								"click"
								(fn
									this.go
									"/converter"
								)
							}}
						><div
								class="lg-converter-copy"
							><span
									class="lg-small-tag"
								>THE FILE
									MAKEOVER
									STATION</span><h2
								>Same file.<br
									/>Fresh
									possibilities.</h2><p
								>Images, audio,
									video,
									documents.<br
									/>Give
									your
									files a
									change
									of
									format.</p><span
									class="lg-converter-cta"
								>Open converter
									<span
										aria-hidden="true"
									>↗</span></span></div><div
								class="lg-file-art"
								aria-hidden="true"
							><span
									class="lg-art-file lg-art-file--pink"
								><IconSvg
										@name="image"
									/><b
									>IMG</b></span><span
									class="lg-art-file lg-art-file--yellow"
								><IconSvg
										@name="file-text"
									/><b
									>DOC</b></span><span
									class="lg-art-file lg-art-file--purple"
								><IconSvg
										@name="play"
									/><b
									>MP4</b></span><span
									class="lg-art-spark"
								>✳</span></div></a>
						<section
							class="lg-quick-picks"
						><div
								class="lg-section-heading"
							><h2>A good place to
									start</h2><span
								>Three everyday
									favourites</span></div><div
								class="lg-quick-grid"
							>{{#each
									this.quickPicks
									as |tool|
								}}<a
										class="lg-quick-card"
										href={{tool.href}}
										{{on
											"click"
											(fn
												this.go
												tool.href
											)
										}}
									><div
											class="lg-quick-art"
											aria-hidden="true"
										><span
											><IconSvg
													@name={{tool.icon}}
												/></span><i
											></i><i
											></i></div><div
											class="lg-quick-copy"
										><h3
											>{{tool.name}}<span
													aria-hidden="true"
												>↗</span></h3><p
											>{{tool.description}}</p><span
												class="lg-quick-tag"
											>Ready
												for
												your
												next
												project</span></div></a>{{/each}}</div></section>
					</div>
					<aside
						class="lg-dashboard-rail"
						aria-label="Workspace widgets"
					>
						<section
							class="lg-widget lg-local-widget"
						><div
								class="lg-widget-label"
							>Made to stay local<span
									class="lg-tiny-icon"
								><IconSvg
										@name="lock"
									/></span></div><div
								class="lg-local-illustration"
								aria-hidden="true"
							><span><IconSvg
										@name="hard-drive"
									/></span><i
								>✓</i><b
								>✦</b></div><h2
							>Your files.<br />Your
								device.</h2><p
							>No uploads. No
								accounts.<br
								/>Just you and
								your next good
								idea.</p><span
								class="lg-private-badge"
							><span></span>Private by
								design</span></section>
						<section
							class="lg-widget lg-readiness-widget"
						><div
								class="lg-widget-label"
							>Your local engines<a
									href="/setup"
									aria-label="Manage local engines"
									{{on
										"click"
										(fn
											this.go
											"/setup"
										)
									}}
								><IconSvg
										@name="settings-2"
									/></a></div><ul
							>{{#each
									this.engines
									as |engine|
								}}<li><span
											class="lg-engine-icon"
										><IconSvg
												@name={{engine.icon}}
											/></span><div
										><strong
											>{{engine.name}}</strong><span
												class="lg-engine-state
													{{if
														engine.ready
														'is-ready'
													}}"
											>{{if
													engine.ready
													"Ready to go"
													"Needs setup"
												}}</span></div><span
											class="lg-engine-dot
												{{if
													engine.ready
													'is-ready'
												}}"
											aria-hidden="true"
										></span></li>{{/each}}</ul><a
								class="lg-setup-cta"
								href="/setup"
								{{on
									"click"
									(fn
										this.go
										"/setup"
									)
								}}
							><span
								>{{this.readyCount}}
									/
									{{this.desktop.setup.packs.length}}
									downloads
									installed</span><span
									aria-hidden="true"
								>↗</span></a></section>
						<a
							class="lg-workflow-widget"
							href="/workflows"
							{{on
								"click"
								(fn
									this.go
									"/workflows"
								)
							}}
						><div
								class="lg-workflow-art"
								aria-hidden="true"
							><span><IconSvg
										@name="image"
									/></span><b
								>→</b><span
								><IconSvg
										@name="scissors"
									/></span><b
								>→</b><span
								>✓</span></div><h2
							>Find your flow.</h2><p
							>A few tools, one smooth
								workflow.</p><span
							>Explore workflows
								<span
									aria-hidden="true"
								>↗</span></span></a>
					</aside>
				</div>
			{{/unless}}
			<section class="lg-library" aria-label="All tools">
				<div class="lg-section-heading"><h2>The whole
						toolbox</h2><span>{{this.count}}
						ways to get it done</span></div>
				<div class="lg-directory-filters"><label
						class="lg-search"
					><IconSvg @name="search" /><input
							type="search"
							aria-label="Search all tools"
							placeholder="Find your next little helper…"
							value={{this.query}}
							{{on
								"input"
								this.search
							}}
						/></label><select
						aria-label="Filter category"
						{{on "change" this.select}}
					><option value="">All categories</option>{{#each
							this.categories
							as |c|
						}}<option
								value={{c.id}}
							>{{c.name}}</option>{{/each}}</select></div>
				{{#each this.groups as |group|}}<section
						class="lg-group"
					><h2>{{group.name}}<span
							>{{group.tools.length}}</span></h2><div
							class="lg-tool-grid"
						>{{#each
								group.tools
								as |tool|
							}}<a
									class="lg-tool-card"
									href={{tool.href}}
									{{on
										"click"
										(fn
											this.go
											tool.href
										)
									}}
								><span
										class="lg-card-icon"
									><IconSvg
											@name={{tool.icon}}
										/></span><strong
									>{{tool.name}}</strong><p
									>{{tool.description}}</p></a>{{/each}}</div></section>{{else}}<p
					>No tools match your search.</p>{{/each}}
			</section>
			<footer class="lg-directory-footer">Built on Delphi’s
				open-source tools. No accounts. No uploads.<a
					href="https://github.com/1612elphi/delphitools"
					target="_blank"
					rel="noopener noreferrer"
				>Upstream source & credits ↗</a></footer>
		</div>
	</template>
}
