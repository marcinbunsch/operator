import { Effect, Scope } from "effect";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * A temporary directory handle with helper methods.
 */
export interface TempDir {
  /** The absolute path to the temp directory */
  readonly dir: string;
  /** Get absolute path to a file in the temp directory */
  readonly path: (filename: string) => string;
}

/**
 * Creates a temporary directory that is automatically cleaned up
 * when the Effect scope ends.
 *
 * Usage:
 * ```ts
 * it.effect("my test", () =>
 *   Effect.scoped(
 *     Effect.gen(function* () {
 *       const tmp = yield* withTempDir("my-test");
 *       const filePath = tmp.path("data.json");
 *       // ... use filePath
 *     }) // tmp directory is cleaned up automatically
 *   )
 * );
 * ```
 */
export const withTempDir = (name: string): Effect.Effect<TempDir, never, Scope.Scope> => {
  const baseDir = join(process.cwd(), "tmp");
  const uniqueDir = join(baseDir, `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  return Effect.acquireRelease(
    // Acquire: create the directory
    Effect.sync(() => {
      mkdirSync(uniqueDir, { recursive: true });
      return {
        dir: uniqueDir,
        path: (filename: string) => join(uniqueDir, filename),
      };
    }),
    // Release: remove the directory and all contents
    () =>
      Effect.sync(() => {
        if (existsSync(uniqueDir)) {
          rmSync(uniqueDir, { recursive: true, force: true });
        }
      }),
  );
};
