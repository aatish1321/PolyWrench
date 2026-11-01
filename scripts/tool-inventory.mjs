import ts from 'typescript';
import { readFile, writeFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

export async function inventory() {
	const source = await readFile(
		new URL('../app/lib/tools.ts', import.meta.url),
		'utf8',
	);
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	const context = { exports: {} };
	runInNewContext(compiled, context);
	const rows = [];
	for (const category of context.exports.toolCategories) {
		if (category.id === 'elsewhere') continue;
		for (const tool of category.tools) {
			if (tool.external) continue;
			if (!tool.route)
				await access(
					new URL(
						`../app/components/tools/${tool.component || tool.id}.gts`,
						import.meta.url,
					),
				);
			rows.push({
				id: tool.id,
				name: tool.name,
				category: category.name,
				href: tool.href,
				component: tool.route
					? null
					: tool.component || tool.id,
			});
		}
	}
	for (const route of ['workflows', 'experiments'])
		rows.push({
			id: route,
			name: route,
			category: 'Workspace',
			href: `/${route}`,
			component: null,
		});
	if (new Set(rows.map((r) => r.id)).size !== rows.length)
		throw new Error('Duplicate tool IDs');
	return rows;
}

if (
	process.argv[1] &&
	new URL(process.argv[1], 'file:').href === import.meta.url
) {
	const rows = await inventory();
	await writeFile(
		new URL('../docs/tool-inventory.json', import.meta.url),
		JSON.stringify(
			{
				upstream: JSON.parse(
					await readFile(
						new URL(
							'../UPSTREAM.json',
							import.meta.url,
						),
					),
				),
				entries: rows,
			},
			null,
			2,
		) + '\n',
	);
	console.log(
		`${rows.length} tool/suite/workspace entries; all tool components present`,
	);
}
