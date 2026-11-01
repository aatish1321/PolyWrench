import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import eq from 'ember-truth-helpers/helpers/eq';
import type RouterService from '@ember/routing/router-service';
import type FlowService from 'delphitools-v2/services/flow';
import type ThemeService from 'delphitools-v2/services/theme';
import type DesktopService from 'delphitools-v2/services/desktop';
import { toolCategories, getToolById } from 'delphitools-v2/lib/tools';
import { IconSvg } from 'delphitools-v2/components/icon';
import FlowState from 'delphitools-v2/components/flow-state';
import CanonToast from 'delphicanon/components/canon-toast';
import './desktop-workspace.css';

export default class DesktopWorkspace extends Component<{
	Blocks: { default: [] };
}> {
	@service declare router: RouterService;
	@service declare theme: ThemeService;
	@service declare desktop: DesktopService;
	@service declare flow: FlowService;
	@tracked search = '';
	get categories() {
		const query = this.search.toLowerCase().trim();
		return toolCategories
			.filter((category) => category.id !== 'elsewhere')
			.map((category) => ({
				...category,
				tools: category.tools.filter(
					(tool) =>
						!tool.external &&
						`${tool.name} ${tool.description} ${category.name}`
							.toLowerCase()
							.includes(query),
				),
			}))
			.filter((category) => category.tools.length);
	}
	get title() {
		const route = this.router.currentRouteName;
		if (route === 'tools.tool') {
			const id =
				this.router.currentRoute?.params?.['tool_id'];
			return (
				getToolById(typeof id === 'string' ? id : '')
					?.name || 'Tool'
			);
		}
		return (
			(
				{
					index: 'Dashboard',
					converter: 'Batch Converter',
					setup: 'Offline Setup',
					editor: 'Substrata',
					errata: 'Errata',
					workflows: 'Workflows',
					experiments: 'Experiments',
				} as Record<string, string>
			)[route || ''] || 'PolyWrench'
		);
	}
	get fullscreen() {
		return ['editor', 'errata', 'workflow'].includes(
			this.router.currentRouteName || '',
		);
	}
	searchChanged = (event: Event) => {
		this.search = (event.target as HTMLInputElement).value;
	};
	go = (href: string, event: MouseEvent) => {
		event.preventDefault();
		void this.router.transitionTo(href);
	};

	<template>
		<a href="#main-content" class="lg-skip">Skip to workspace</a>
		<div class="lg-app {{if this.fullscreen 'lg-app--editor'}}">
			<aside class="lg-sidebar" aria-label="Tools navigation">
				<a
					class="lg-brand"
					href="/"
					{{on "click" (fn this.go "/")}}
				><img
						class="lg-logo"
						src="/polywrench.png"
						alt=""
					/><span>PolyWrench<small>Everything
							stays on your device</small></span></a>
				<label class="lg-search"><IconSvg
						@name="search"
					/><input
						type="search"
						placeholder="Find a tool…"
						aria-label="Search tools"
						value={{this.search}}
						{{on
							"input"
							this.searchChanged
						}}
					/></label>
				<nav class="lg-primary" aria-label="Workspace">
					<a
						href="/"
						aria-current={{if
							(eq
								this.router.currentRouteName
								"index"
							)
							"page"
						}}
						{{on "click" (fn this.go "/")}}
					><IconSvg
							@name="layout-grid"
						/>Dashboard</a>
					<a
						class="lg-converter-link"
						aria-current={{if
							(eq
								this.router.currentRouteName
								"converter"
							)
							"page"
						}}
						href="/converter"
						{{on
							"click"
							(fn
								this.go
								"/converter"
							)
						}}
					><IconSvg
							@name="arrow-left-right"
						/>Batch Converter</a>
					<a
						href="/workflows"
						aria-current={{if
							(eq
								this.router.currentRouteName
								"workflows"
							)
							"page"
						}}
						{{on
							"click"
							(fn
								this.go
								"/workflows"
							)
						}}
					><IconSvg
							@name="workflow"
						/>Workflows</a>
				</nav>
				<nav
					class="lg-tool-nav"
					aria-label="Tool categories"
				>
					{{#each this.categories as |category|}}
						<details
							open={{if
								this.search
								true
							}}
						><summary>{{category.name}}
								<span
								>{{category.tools.length}}</span></summary>
							{{#each
								category.tools
								as |tool|
							}}<a
									href={{tool.href}}
									{{on
										"click"
										(fn
											this.go
											tool.href
										)
									}}
								><IconSvg
										@name={{tool.icon}}
									/>{{tool.name}}</a>{{/each}}
						</details>
					{{else}}<p class="lg-muted">No matching
							tools.</p>{{/each}}
				</nav>
				<div class="lg-sidebar-note"><span
						aria-hidden="true"
					>✳</span><strong>A little more doing.<br
						/>A little less fuss.</strong><small
					>Your everyday tools, all together.</small></div>
				<a
					class="lg-setup-link"
					href="/setup"
					{{on "click" (fn this.go "/setup")}}
				><IconSvg @name="hard-drive-download" />Offline
					Setup</a>
			</aside>
			<section class="lg-workspace">
				<header class="lg-topbar"><span
					>{{this.title}}</span><div
						class="lg-top-actions"
					>{{#if this.desktop.busy}}<a
								href="/converter"
								{{on
									"click"
									(fn
										this.go
										"/converter"
									)
								}}
							>Converting…</a>{{/if}}<span
							class="lg-local"
						><span></span>Local processing</span><button
							type="button"
							aria-label="Toggle colour theme"
							{{on
								"click"
								this.theme.toggle
							}}
						><IconSvg
								@name="sun-moon"
							/></button></div></header>
				{{#if this.desktop.error}}<div
						class="lg-error"
						role="alert"
					>{{this.desktop.error}}</div>{{/if}}
				<FlowState /><main
					id="main-content"
					class="dt-main lg-main
						{{if
							this.flow.finale
							'is-behind'
						}}"
					inert={{if this.flow.finale true}}
					tabindex="-1"
					{{this.flow.main}}
				>{{yield}}<CanonToast /></main>
			</section>
		</div>
	</template>
}
