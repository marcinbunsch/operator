import { it, describe } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { writeFileSync } from "node:fs";
import { SpawnService } from "./SpawnService.js";
import { withTempDir } from "../test/helpers.js";

describe("SpawnService.isPidAlive", () => {
  it.effect("returns true for current process PID", () =>
    Effect.gen(function* () {
      const spawn = yield* SpawnService;
      const result = yield* spawn.isPidAlive(process.pid);
      expect(result).toBe(true);
    }).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("returns false for bogus PID", () =>
    Effect.gen(function* () {
      const spawn = yield* SpawnService;
      const result = yield* spawn.isPidAlive(999999999);
      expect(result).toBe(false);
    }).pipe(Effect.provide(SpawnService.Default)),
  );
});

describe("SpawnService.readLogTail", () => {
  it.effect("returns '(no log file found)' for nonexistent file", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("readLogTail-nofile");
        const spawn = yield* SpawnService;
        const result = yield* spawn.readLogTail(tmp.path("nonexistent.log"));
        expect(result).toBe("(no log file found)");
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("returns last N lines of file", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("readLogTail-lines");
        const logPath = tmp.path("test.log");
        const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
        writeFileSync(logPath, lines.join("\n"));

        const spawn = yield* SpawnService;
        const result = yield* spawn.readLogTail(logPath, 5);

        expect(result).toContain("Line 46");
        expect(result).toContain("Line 50");
        expect(result).not.toContain("Line 1");
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("returns all content if fewer lines than requested", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("readLogTail-all");
        const logPath = tmp.path("test.log");
        writeFileSync(logPath, "Line 1\nLine 2\nLine 3");

        const spawn = yield* SpawnService;
        const result = yield* spawn.readLogTail(logPath, 25);

        expect(result).toContain("Line 1");
        expect(result).toContain("Line 3");
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );
});

describe("SpawnService.getExitCodeFromLog", () => {
  it.effect("returns null for nonexistent file", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("exitCode-nofile");
        const spawn = yield* SpawnService;
        const result = yield* spawn.getExitCodeFromLog(tmp.path("nonexistent.txt"));
        expect(result).toBeNull();
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("returns null for file without exit code marker", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("exitCode-nomarker");
        const logPath = tmp.path("test.log");
        writeFileSync(logPath, "Some log output\nMore output");

        const spawn = yield* SpawnService;
        const result = yield* spawn.getExitCodeFromLog(logPath);
        expect(result).toBeNull();
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("returns 0 for __EXIT_CODE__=0", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("exitCode-zero");
        const logPath = tmp.path("test.log");
        writeFileSync(logPath, "Log output\n__EXIT_CODE__=0\n");

        const spawn = yield* SpawnService;
        const result = yield* spawn.getExitCodeFromLog(logPath);
        expect(result).toBe(0);
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("returns exit code from end of file", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("exitCode-end");
        const logPath = tmp.path("test.log");
        writeFileSync(logPath, "Processing...\nDone!\n__EXIT_CODE__=42\n");

        const spawn = yield* SpawnService;
        const result = yield* spawn.getExitCodeFromLog(logPath);
        expect(result).toBe(42);
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );
});

describe("SpawnService.spawnDetached", () => {
  it.effect("spawns a detached process and returns PID", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("spawnDetached");
        const spawn = yield* SpawnService;
        const pid = yield* spawn.spawnDetached(["echo", "hello"], {
          cwd: tmp.dir,
          logPath: tmp.path("spawn.log"),
        });

        // Just verify we get a valid PID back
        expect(typeof pid).toBe("number");
        expect(pid).toBeGreaterThan(0);
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );
});

describe("SpawnService.waitForPid", () => {
  it.effect("returns immediately for dead PID", () =>
    Effect.gen(function* () {
      const startTime = Date.now();

      const spawn = yield* SpawnService;
      yield* spawn.waitForPid(999999999);

      const elapsed = Date.now() - startTime;
      // Should return almost immediately
      expect(elapsed).toBeLessThan(100);
    }).pipe(Effect.provide(SpawnService.Default)),
  );
});

describe("SpawnService.loadEnvFile", () => {
  it.effect("returns empty object for nonexistent file", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("loadEnv-nofile");
        const spawn = yield* SpawnService;
        const result = yield* spawn.loadEnvFile(tmp.path("nonexistent.env"));
        expect(result).toEqual({});
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("parses key=value pairs", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("loadEnv-parse");
        const envPath = tmp.path("test.env");
        writeFileSync(envPath, "FOO=bar\nBAZ=qux");

        const spawn = yield* SpawnService;
        const result = yield* spawn.loadEnvFile(envPath);
        expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("skips comments", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("loadEnv-comments");
        const envPath = tmp.path("test.env");
        writeFileSync(envPath, "# This is a comment\nKEY=value\n# Another comment");

        const spawn = yield* SpawnService;
        const result = yield* spawn.loadEnvFile(envPath);
        expect(result).toEqual({ KEY: "value" });
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );

  it.effect("handles values with equals signs", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const tmp = yield* withTempDir("loadEnv-equals");
        const envPath = tmp.path("test.env");
        writeFileSync(envPath, "URL=https://example.com?foo=bar");

        const spawn = yield* SpawnService;
        const result = yield* spawn.loadEnvFile(envPath);
        expect(result).toEqual({ URL: "https://example.com?foo=bar" });
      }),
    ).pipe(Effect.provide(SpawnService.Default)),
  );
});
