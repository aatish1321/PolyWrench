import { pageTitle } from 'ember-page-title';
import ErrataShell from 'delphitools-v2/components/errata/errata-shell';

// bypass application chrome
<template>
	{{pageTitle "PDF Studio"}}

	<div class="sub-editor-viewport">
		<ErrataShell />
	</div>
</template>
