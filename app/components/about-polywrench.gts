import type { TOC } from '@ember/component/template-only';
import { VERSION } from 'delphitools-v2/lib/build-flags';

export const BUILT_WITH: { name: string; url?: string; route?: string }[] = [
	{ name: 'Ember', url: 'https://emberjs.com' },
	{ name: 'Vite', url: 'https://vite.dev' },
	{ name: 'Crayon', url: 'https://crayoncss.com' },
	{ name: 'Lucide', url: 'https://lucide.dev' },
];

const AboutPolyWrench: TOC<{ Element: HTMLDivElement }> = <template>
	<div class="dt-about-body" ...attributes>
		<h2>PolyWrench</h2>
		<p>Version {{VERSION}}</p>
		<p>A local desktop workspace for file conversion, image editing,
			PDF tools and everyday creative tasks.</p>
		<p>Your files are processed on this device. No accounts or
			uploads are required.</p>
		<p><a
				href="https://github.com/aatish1321/PolyWrench"
				target="_blank"
				rel="noopener noreferrer"
			>Source and documentation</a></p>
		<p><a
				href="https://github.com/aatish1321/PolyWrench/issues"
				target="_blank"
				rel="noopener noreferrer"
			>Report an issue</a></p>
	</div>
</template>;

export default AboutPolyWrench;
