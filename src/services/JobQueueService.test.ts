import { it, describe } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { expect } from "vitest";
import { JobQueueService } from "./JobQueueService.js";
import { withTempDir } from "../test/helpers.js";

describe("JobQueueService.enqueue", () => {
  it.scoped("creates a job with queued status", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("enqueue");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const job = yield* queue.enqueue("test-type", "/tmp", { key: "value" });

      expect(job.id).toBeDefined();
      expect(job.type).toBe("test-type");
      expect(job.status).toBe("queued");
      expect(job.workingDir).toBe("/tmp");
      expect(job.payload).toEqual({ key: "value" });
      expect(job.metadata).toEqual({});
    }).pipe(Effect.provide(JobQueueService.Default)),
  );

  it.scoped("assigns unique IDs to jobs", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("enqueue-unique");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const job1 = yield* queue.enqueue("test", "/tmp", {});
      const job2 = yield* queue.enqueue("test", "/tmp", {});

      expect(job1.id).not.toBe(job2.id);
    }).pipe(Effect.provide(JobQueueService.Default)),
  );
});

describe("JobQueueService.getJob", () => {
  it.scoped("returns job by ID", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getJob");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const created = yield* queue.enqueue("test", "/tmp", { foo: "bar" });
      const retrieved = yield* queue.getJob(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.payload).toEqual({ foo: "bar" });
    }).pipe(Effect.provide(JobQueueService.Default)),
  );

  it.scoped("fails with JobNotFoundError for unknown ID", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getJob-notfound");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const result = yield* queue.getJob("nonexistent-id").pipe(Effect.exit);

      expect(Exit.isFailure(result)).toBe(true);
    }).pipe(Effect.provide(JobQueueService.Default)),
  );
});

describe("JobQueueService.updateMetadata", () => {
  it.scoped("updates job metadata", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("updateMetadata");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const job = yield* queue.enqueue("test", "/tmp", {});
      yield* queue.updateMetadata(job.id, { pid: 12345, progress: "50%" });

      const updated = yield* queue.getJob(job.id);
      expect(updated.metadata).toEqual({ pid: 12345, progress: "50%" });
    }).pipe(Effect.provide(JobQueueService.Default)),
  );

  it.scoped("merges with existing metadata", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("updateMetadata-merge");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const job = yield* queue.enqueue("test", "/tmp", {});
      yield* queue.updateMetadata(job.id, { a: 1 });
      yield* queue.updateMetadata(job.id, { b: 2 });

      const updated = yield* queue.getJob(job.id);
      expect(updated.metadata).toEqual({ a: 1, b: 2 });
    }).pipe(Effect.provide(JobQueueService.Default)),
  );
});

describe("JobQueueService.completeJob", () => {
  it.scoped("marks job as done", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("completeJob-done");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const job = yield* queue.enqueue("test", "/tmp", {});
      yield* queue.completeJob(job.id, "done");

      const completed = yield* queue.getJob(job.id);
      expect(completed.status).toBe("done");
      expect(completed.endedAt).toBeDefined();
    }).pipe(Effect.provide(JobQueueService.Default)),
  );

  it.scoped("marks job as failed with error", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("completeJob-failed");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      const job = yield* queue.enqueue("test", "/tmp", {});
      yield* queue.completeJob(job.id, "failed", "Something went wrong");

      const completed = yield* queue.getJob(job.id);
      expect(completed.status).toBe("failed");
      expect(completed.error).toBe("Something went wrong");
    }).pipe(Effect.provide(JobQueueService.Default)),
  );
});

describe("JobQueueService.getJobs", () => {
  it.scoped("returns all jobs", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getJobs");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      yield* queue.enqueue("type-a", "/tmp", {});
      yield* queue.enqueue("type-b", "/tmp", {});
      yield* queue.enqueue("type-a", "/tmp", {});

      const jobs = yield* queue.getJobs();
      expect(jobs.length).toBe(3);
    }).pipe(Effect.provide(JobQueueService.Default)),
  );
});

describe("JobQueueService.registerRunner", () => {
  it.scoped("registers runner without error", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("registerRunner");
      const queue = yield* JobQueueService;
      yield* queue.configure(tmp.path("jobs.json"));

      // Should not throw
      yield* queue.registerRunner("test-runner", 2, () => Effect.void);
    }).pipe(Effect.provide(JobQueueService.Default)),
  );
});
