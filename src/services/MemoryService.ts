import { Effect, Ref } from "effect";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * A memory entry stored under a topic.
 */
export interface Memory {
  /** Unique identifier */
  id: string;
  /** Topic/category this memory belongs to */
  topic: string;
  /** The memory content */
  content: string;
  /** When this memory was created */
  createdAt: string;
}

/**
 * MemoryService provides persistent topic-based memory for agents.
 *
 * Memories are organized by topic, allowing agents to store observations
 * and retrieve them later for context. For example, an agent analyzing
 * transcripts can remember patterns to look for in future analyses.
 *
 * Usage:
 * 1. Call configure() with a file path to enable persistence
 * 2. Use addMemory() to store observations under a topic
 * 3. Use getMemories() to retrieve all memories for a topic
 * 4. Inject retrieved memories into prompts for context
 */
export class MemoryService extends Effect.Service<MemoryService>()(
  "@operator/core/MemoryService",
  {
    effect: Effect.gen(function* () {
      const memoriesRef = yield* Ref.make<Memory[]>([]);
      const memoriesFileRef = yield* Ref.make<string | null>(null);

      const log = (...args: unknown[]) =>
        Effect.log(`[memory] ${args.map(String).join(" ")}`);

      const saveToDisk = Effect.gen(function* () {
        const memoriesFile = yield* Ref.get(memoriesFileRef);
        if (!memoriesFile) return;

        const memories = yield* Ref.get(memoriesRef);
        writeFileSync(memoriesFile, JSON.stringify({ memories }, null, 2));
      });

      const loadFromDisk = Effect.gen(function* () {
        const memoriesFile = yield* Ref.get(memoriesFileRef);
        if (!memoriesFile) return;

        if (existsSync(memoriesFile)) {
          const data = JSON.parse(readFileSync(memoriesFile, "utf-8"));
          const memories = (data.memories || []) as Memory[];
          yield* Ref.set(memoriesRef, memories);
          yield* log(`Loaded ${memories.length} memories from disk`);
        }
      });

      yield* log("MemoryService initialized");

      return {
        /**
         * Configure the memories file path and load existing memories.
         * Must be called before memories will persist.
         */
        configure: (memoriesFile: string): Effect.Effect<void> =>
          Effect.gen(function* () {
            yield* Ref.set(memoriesFileRef, memoriesFile);
            yield* loadFromDisk;
          }),

        /**
         * Add a memory under a topic.
         * Returns the created memory.
         */
        addMemory: (topic: string, content: string): Effect.Effect<Memory> =>
          Effect.gen(function* () {
            const memory: Memory = {
              id: crypto.randomUUID(),
              topic: topic.toLowerCase().trim(),
              content,
              createdAt: new Date().toISOString(),
            };

            yield* Ref.update(memoriesRef, (memories) => [...memories, memory]);
            yield* saveToDisk;
            yield* log(`Added memory to topic "${memory.topic}": ${content.slice(0, 50)}...`);

            return memory;
          }),

        /**
         * Get all memories for a topic.
         * Returns memories in chronological order (oldest first).
         */
        getMemories: (topic: string): Effect.Effect<readonly Memory[]> =>
          Effect.gen(function* () {
            const normalizedTopic = topic.toLowerCase().trim();
            const memories = yield* Ref.get(memoriesRef);
            return memories
              .filter((m) => m.topic === normalizedTopic)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          }),

        /**
         * Get all topics that have memories.
         */
        getTopics: (): Effect.Effect<readonly string[]> =>
          Effect.gen(function* () {
            const memories = yield* Ref.get(memoriesRef);
            return [...new Set(memories.map((m) => m.topic))].sort();
          }),

        /**
         * Delete a memory by ID.
         * Returns true if the memory was found and deleted.
         */
        deleteMemory: (id: string): Effect.Effect<boolean> =>
          Effect.gen(function* () {
            const memories = yield* Ref.get(memoriesRef);
            const found = memories.some((m) => m.id === id);

            if (found) {
              yield* Ref.update(memoriesRef, (mems) => mems.filter((m) => m.id !== id));
              yield* saveToDisk;
              yield* log(`Deleted memory ${id.slice(0, 8)}`);
            }

            return found;
          }),

        /**
         * Delete all memories for a topic.
         * Returns the number of memories deleted.
         */
        clearTopic: (topic: string): Effect.Effect<number> =>
          Effect.gen(function* () {
            const normalizedTopic = topic.toLowerCase().trim();
            const memories = yield* Ref.get(memoriesRef);
            const toDelete = memories.filter((m) => m.topic === normalizedTopic);

            if (toDelete.length > 0) {
              yield* Ref.update(memoriesRef, (mems) =>
                mems.filter((m) => m.topic !== normalizedTopic),
              );
              yield* saveToDisk;
              yield* log(`Cleared ${toDelete.length} memories from topic "${normalizedTopic}"`);
            }

            return toDelete.length;
          }),

        /**
         * Format memories for injection into a prompt.
         * Returns a formatted string, or empty string if no memories.
         */
        formatForPrompt: (topic: string): Effect.Effect<string> =>
          Effect.gen(function* () {
            const normalizedTopic = topic.toLowerCase().trim();
            const allMemories = yield* Ref.get(memoriesRef);
            const memories = allMemories
              .filter((m) => m.topic === normalizedTopic)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

            if (memories.length === 0) return "";

            const lines = memories.map((m, i) => `${i + 1}. ${m.content}`);
            return `\n\nREMEMBERED CONTEXT FOR "${topic.toUpperCase()}":\n${lines.join("\n")}\n`;
          }),
      };
    }),
  },
) {}
