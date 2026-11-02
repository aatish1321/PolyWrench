import type { TOC } from '@ember/component/template-only';
import 'delphitools-v2/components/substrata/editor/tool-bar/tools.css';

// navigation changes secure context
const insecure = window.isSecureContext === false;

const SecureContextNotice: TOC<object> = <template>
	{{#if insecure}}
		<div role="alert" class="sub-secure">
			This window cannot access secure local storage. Restart
			PolyWrench before saving.
		</div>
	{{/if}}
</template>;

export default SecureContextNotice;
