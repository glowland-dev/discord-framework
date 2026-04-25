import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface LoadModulesOptions<TModule> {
  directory: string;
  extensions?: readonly string[];
  cacheBust?: boolean;
  validate?: (value: unknown) => value is TModule;
}

export async function loadDefaultModules<TModule>(
  options: LoadModulesOptions<TModule>,
): Promise<TModule[]> {
  const extensions = options.extensions ?? [".ts", ".js", ".mjs", ".cjs"];

  const files = readdirSync(options.directory, {
    recursive: true,
    encoding: "utf8",
    withFileTypes: true,
  }).filter(
    (file) =>
      file.isFile() &&
      extensions.some((extension) => file.name.endsWith(extension)),
  );

  const modules: TModule[] = [];

  for (const file of files) {
    const fullPath = path.resolve(
      options.directory,
      path.relative(options.directory, path.join(file.parentPath, file.name)),
    );
    const moduleUrl = pathToFileURL(fullPath).href;
    const importUrl =
      (options.cacheBust ?? true)
        ? `${moduleUrl}?update=${Date.now()}`
        : moduleUrl;
    const loadedModule = (await import(importUrl)) as { default?: unknown };
    const defaultExport = loadedModule.default;

    if (options.validate && !options.validate(defaultExport)) continue;
    modules.push(defaultExport as TModule);
  }

  return modules;
}
