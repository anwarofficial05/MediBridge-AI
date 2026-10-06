import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolve both current absolute upload paths and older relative seed paths.
 * Returning null prevents callers from accidentally exposing an unresolved path.
 */
export function resolveStoredFilePath(filePath: string) {
  const candidates = path.isAbsolute(filePath)
    ? [filePath]
    : [path.resolve(process.cwd(), filePath), path.resolve(process.cwd(), '..', filePath)];
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

export function storedFileExists(filePath: string) {
  return Boolean(resolveStoredFilePath(filePath));
}
