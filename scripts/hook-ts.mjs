/**
 * Hook resolusi modul untuk runner uji Node (test:parser dkk.): memetakan
 * alias `@/` ke akar repo dan menambahkan ekstensi `.ts`/`.tsx` yang tidak
 * ditulis di specifier — persis yang dilakukan bundler Next. Dengan ini
 * berkas yang diuji boleh mengimpor modul murni lain (mis. lib/parse/platform)
 * tanpa menyalin kodenya. Dipasang lewat `module.register()` di runner.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (spec.startsWith("@/")) spec = pathToFileURL(join(root, spec.slice(2))).href;
  try {
    return await next(spec, context);
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND" && err?.code !== "ERR_UNSUPPORTED_DIR_IMPORT") throw err;
    const dasar = spec.startsWith("file:")
      ? fileURLToPath(spec)
      : spec.startsWith(".")
        ? join(dirname(fileURLToPath(context.parentURL)), spec)
        : null;
    if (dasar) {
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        if (existsSync(dasar + ext)) return next(pathToFileURL(dasar + ext).href, context);
      }
    }
    throw err;
  }
}
