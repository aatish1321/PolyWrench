import RouteTemplate from 'ember-route-template';
import { pageTitle } from 'ember-page-title';
import ToolWorkspace from 'delphitools-v2/components/tool-workspace';
import type { ToolModel } from 'delphitools-v2/routes/tools/tool';

export default RouteTemplate<{ Args: { model: ToolModel } }>(
	<template>
		{{pageTitle @model.tool.name}}

		<ToolWorkspace @model={{@model}} />
	</template>,
);
