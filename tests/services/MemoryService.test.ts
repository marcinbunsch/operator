import { it, describe } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { MemoryService } from "../../src/services/MemoryService.js";
import { withTempDir } from "../helpers.js";

describe("MemoryService.addMemory", () => {
  it.scoped("creates a memory with unique ID", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("addMemory");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const mem = yield* memory.addMemory("test-topic", "Remember this");

      expect(mem.id).toBeDefined();
      expect(mem.topic).toBe("test-topic");
      expect(mem.content).toBe("Remember this");
      expect(mem.createdAt).toBeDefined();
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("normalizes topic to lowercase", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("addMemory-normalize");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const mem = yield* memory.addMemory("Test-TOPIC", "content");

      expect(mem.topic).toBe("test-topic");
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("trims topic whitespace", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("addMemory-trim");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const mem = yield* memory.addMemory("  spaced  ", "content");

      expect(mem.topic).toBe("spaced");
    }).pipe(Effect.provide(MemoryService.Default)),
  );
});

describe("MemoryService.getMemories", () => {
  it.scoped("returns memories for a topic", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getMemories");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      yield* memory.addMemory("topic-a", "first");
      yield* memory.addMemory("topic-a", "second");
      yield* memory.addMemory("topic-b", "other");

      const memories = yield* memory.getMemories("topic-a");

      expect(memories.length).toBe(2);
      expect(memories[0].content).toBe("first");
      expect(memories[1].content).toBe("second");
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("returns empty array for unknown topic", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getMemories-empty");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const memories = yield* memory.getMemories("nonexistent");

      expect(memories).toEqual([]);
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("returns memories in chronological order", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getMemories-order");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      yield* memory.addMemory("topic", "first");
      yield* memory.addMemory("topic", "second");
      yield* memory.addMemory("topic", "third");

      const memories = yield* memory.getMemories("topic");

      expect(memories[0].content).toBe("first");
      expect(memories[1].content).toBe("second");
      expect(memories[2].content).toBe("third");
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("normalizes topic for lookup", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getMemories-normalize");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      yield* memory.addMemory("My-Topic", "content");

      const memories = yield* memory.getMemories("MY-TOPIC");

      expect(memories.length).toBe(1);
    }).pipe(Effect.provide(MemoryService.Default)),
  );
});

describe("MemoryService.getTopics", () => {
  it.scoped("returns all topics with memories", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getTopics");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      yield* memory.addMemory("alpha", "content");
      yield* memory.addMemory("beta", "content");
      yield* memory.addMemory("alpha", "more content");

      const topics = yield* memory.getTopics();

      expect(topics).toEqual(["alpha", "beta"]);
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("returns empty array when no memories", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("getTopics-empty");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const topics = yield* memory.getTopics();

      expect(topics).toEqual([]);
    }).pipe(Effect.provide(MemoryService.Default)),
  );
});

describe("MemoryService.deleteMemory", () => {
  it.scoped("deletes memory by ID", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("deleteMemory");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const mem = yield* memory.addMemory("topic", "to delete");
      const deleted = yield* memory.deleteMemory(mem.id);

      expect(deleted).toBe(true);

      const memories = yield* memory.getMemories("topic");
      expect(memories.length).toBe(0);
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("returns false for unknown ID", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("deleteMemory-notfound");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const deleted = yield* memory.deleteMemory("nonexistent-id");

      expect(deleted).toBe(false);
    }).pipe(Effect.provide(MemoryService.Default)),
  );
});

describe("MemoryService.clearTopic", () => {
  it.scoped("deletes all memories for a topic", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("clearTopic");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      yield* memory.addMemory("topic-a", "first");
      yield* memory.addMemory("topic-a", "second");
      yield* memory.addMemory("topic-b", "other");

      const count = yield* memory.clearTopic("topic-a");

      expect(count).toBe(2);

      const memoriesA = yield* memory.getMemories("topic-a");
      expect(memoriesA.length).toBe(0);

      const memoriesB = yield* memory.getMemories("topic-b");
      expect(memoriesB.length).toBe(1);
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("returns 0 for unknown topic", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("clearTopic-empty");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const count = yield* memory.clearTopic("nonexistent");

      expect(count).toBe(0);
    }).pipe(Effect.provide(MemoryService.Default)),
  );
});

describe("MemoryService.formatForPrompt", () => {
  it.scoped("formats memories as numbered list", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("formatForPrompt");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      yield* memory.addMemory("analysis", "Look for event X");
      yield* memory.addMemory("analysis", "Check connection issues");

      const formatted = yield* memory.formatForPrompt("analysis");

      expect(formatted).toContain('REMEMBERED CONTEXT FOR "ANALYSIS"');
      expect(formatted).toContain("1. Look for event X");
      expect(formatted).toContain("2. Check connection issues");
    }).pipe(Effect.provide(MemoryService.Default)),
  );

  it.scoped("returns empty string for unknown topic", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("formatForPrompt-empty");
      const memory = yield* MemoryService;
      yield* memory.configure(tmp.path("memories.json"));

      const formatted = yield* memory.formatForPrompt("nonexistent");

      expect(formatted).toBe("");
    }).pipe(Effect.provide(MemoryService.Default)),
  );
});

describe("MemoryService persistence", () => {
  it.scoped("persists memories to disk", () =>
    Effect.gen(function* () {
      const tmp = yield* withTempDir("persistence");
      const filePath = tmp.path("memories.json");

      // First instance: add memories
      const memory1 = yield* MemoryService;
      yield* memory1.configure(filePath);
      yield* memory1.addMemory("topic", "persisted content");

      // Second instance: should load from disk
      const memory2 = yield* MemoryService;
      yield* memory2.configure(filePath);

      const memories = yield* memory2.getMemories("topic");

      expect(memories.length).toBe(1);
      expect(memories[0].content).toBe("persisted content");
    }).pipe(Effect.provide(MemoryService.Default)),
  );
});
