import DesktopWorkspace from 'delphitools-v2/components/desktop-workspace';
import { pageTitle } from 'ember-page-title';

<template>
	{{pageTitle "PolyWrench"}}
	<DesktopWorkspace>{{outlet}}</DesktopWorkspace>
</template>
