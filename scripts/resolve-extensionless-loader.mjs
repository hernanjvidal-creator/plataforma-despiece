// Loader mínimo para poder correr los motores de lib/ con `node` directo:
// esos archivos usan imports relativos sin extensión (ej. "./shared"),
// que Next.js resuelve solo pero el ESM loader nativo de Node no. Prueba
// agregar ".js" antes de rendirse.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      if (existsSync(base + '.js')) {
        return nextResolve(specifier + '.js', context);
      }
    }
    throw err;
  }
}
