import Component from '@glimmer/component';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import type RouterService from '@ember/routing/router-service';
import { getCategoryByToolId } from 'delphitools-v2/lib/tools';
import type { ToolModel } from 'delphitools-v2/routes/tools/tool';
import CanonTool from 'delphitools-v2/components/canon-tool';
import { IconSvg } from 'delphitools-v2/components/icon';
import './tool-workspace.css';

export default class ToolWorkspace extends Component<{
	Args: { model: ToolModel };
}> {
	@service declare router: RouterService;
	get category() {
		return getCategoryByToolId(this.args.model.tool.id)!;
	}
	back = () => {
		void this.router.transitionTo('/');
	};
	<template>
		<section
			class="pw-tool-workspace"
			data-category={{this.category.id}}
		>
			<header class="pw-tool-header"><div
					class="pw-tool-identity"
				><span class="pw-tool-icon"><IconSvg
							@name={{@model.tool.icon}}
						/></span><div><div
							class="pw-tool-category"
						>{{this.category.name}}
							<span
								aria-hidden="true"
							>/</span>
							PolyWrench</div><h1
						>{{@model.tool.name}}</h1><p
						>{{@model.tool.description}}</p></div></div><button
					type="button"
					class="lg-button pw-tool-back"
					{{on "click" this.back}}
				>All tools
					<span
						aria-hidden="true"
					>↗</span></button></header>
			<div class="pw-tool-stage"><CanonTool
					@tool={{@model.tool}}
					@component={{@model.component}}
				/></div>
			<footer class="pw-tool-footer"><span><span
						aria-hidden="true"
					>●</span>
					A little tool. All on your device.</span><span
				>Your files stay yours.</span></footer>
		</section>
	</template>
}
