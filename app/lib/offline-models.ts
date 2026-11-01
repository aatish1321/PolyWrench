import type { env as TransformersEnv } from '@huggingface/transformers';

export function configureOfflineModels(env: typeof TransformersEnv) {
	env.allowLocalModels = true;
	env.allowRemoteModels = false;
	env.localModelPath = '/models/';
	env.useBrowserCache = false;
	env.backends.onnx.wasm!.wasmPaths = '/onnx/';
}
