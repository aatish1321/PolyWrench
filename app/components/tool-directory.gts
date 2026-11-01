import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import type RouterService from '@ember/routing/router-service';
import { toolCategories } from 'delphitools-v2/lib/tools';
import { IconSvg } from 'delphitools-v2/components/icon';

export default class ToolDirectory extends Component {
	@service declare router: RouterService;
	@tracked query = '';
	@tracked category = '';
	get categories() {
		return toolCategories.filter((c) => c.id !== 'elsewhere');
	}
	get count() {
		return this.categories.reduce(
			(count, category) => count + category.tools.length,
			0,
		);
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
			<div class="lg-eyebrow">ONE DESKTOP. ALL YOUR TOOLS.</div>
			<h1>A little less busywork.</h1>
			<p class="lg-intro">Convert, create and get things done.
				{{this.count}}
				tools, running locally.</p>
			<a
				class="lg-converter-card"
				href="/converter"
				{{on "click" (fn this.go "/converter")}}
			><span class="lg-feature-icon"><IconSvg
						@name="arrow-left-right"
					/></span><span><strong>Meet your file
						converter</strong><small>Images,
						audio, video and documents. Drop
						in a batch and keep moving.</small></span><span
					aria-hidden="true"
				>→</span></a>
			<div class="lg-directory-filters"><label
					class="lg-search"
				><IconSvg @name="search" /><input
						type="search"
						aria-label="Search all tools"
						placeholder="What do you need to do?"
						value={{this.query}}
						{{on "input" this.search}}
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
					>{{#each group.tools as |tool|}}<a
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
			<footer class="lg-directory-footer">Built on Delphi’s
				open-source tools. No accounts. No uploads.<a
					href="https://github.com/1612elphi/delphitools"
					target="_blank"
					rel="noopener noreferrer"
				>Upstream source & credits ↗</a></footer>
		</div>
	</template>
}
