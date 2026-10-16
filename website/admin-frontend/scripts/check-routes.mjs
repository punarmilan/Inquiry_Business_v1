// Check the actual dev-server module graph, including lazy pages and optimized
// dependencies. A successful production build cannot detect a stale dev cache.
import ts from 'typescript';

const moduleImports = (source, filename) => {
  const imports = [];
  const visit = (node) => {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
      ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : undefined;
    if (specifier && ts.isStringLiteralLike(specifier)) imports.push(specifier.text);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS));
  return imports;
};

const base = process.env.ADMIN_DEV_URL || 'http://localhost:5173';
const pending = ['/src/main.tsx'];
const visited = new Set();
const failures = [];

while (pending.length) {
  const batch = [...new Set(pending.splice(0, 8))].filter((url) => !visited.has(url));
  batch.forEach((url) => visited.add(url));
  await Promise.all(batch.map(async (url) => {
    try {
      const response = await fetch(new URL(url, base), { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) {
        failures.push(`${response.status} ${url}`);
        return;
      }
      const source = await response.text();
      for (const specifier of moduleImports(source, url)) {
        if (!/^(\/|\.\/|\.\.\/)/.test(specifier)) continue;
        const dependency = new URL(specifier, new URL(url, base));
        const target = dependency.pathname + dependency.search;
        if (!visited.has(target)) pending.push(target);
      }
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }));
}

const pageCount = [...visited].filter((url) => url.startsWith('/src/pages/')).length;
if (failures.length) {
  console.error(`Module loading failed for ${failures.length} request(s):\n${failures.join('\n')}`);
  process.exitCode = 1;
} else if (!pageCount) {
  console.error(`No admin pages were discovered. Check that ${base} is the admin dev server.`);
  process.exitCode = 1;
} else {
  console.log(`All ${pageCount} page modules and their dependencies loaded successfully (${visited.size} module requests).`);
}
