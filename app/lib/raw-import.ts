// Load packaged runtime modules without eval or bundler rewriting.
export function rawImport<T>(url: string): Promise<T> {
	return import(/* @vite-ignore */ url) as Promise<T>;
}
