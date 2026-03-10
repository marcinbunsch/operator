import { Effect, Schema } from "effect";
import { Tool, Toolkit } from "../../ai/index.js";
import { MemoryService } from "../../services/MemoryService.js";

// Schema definitions
const MemoryResult = Schema.Struct({
  id: Schema.String,
  topic: Schema.String,
  content: Schema.String,
  createdAt: Schema.String,
});

const MemoryListResult = Schema.Struct({
  memories: Schema.Array(MemoryResult),
  topic: Schema.String,
  count: Schema.Number,
});

const TopicsResult = Schema.Struct({
  topics: Schema.Array(Schema.String),
  count: Schema.Number,
});

const OperationResult = Schema.Struct({
  success: Schema.Boolean,
  message: Schema.String,
});

// Tools
export const AddMemory = Tool.make("add_memory", {
  description: `Store a memory under a topic for future reference.
Use this when you want to remember something for next time you work on a similar task.
Examples:
- Topic "transcript-analysis": "Look for event X as an indicator of connection problems"
- Topic "code-review": "This project prefers early returns over nested conditionals"
- Topic "user-preferences": "User prefers concise responses"

The memory will be available when you load memories for that topic.`,
  parameters: {
    topic: Schema.String.annotations({
      description:
        "The topic/category for this memory (e.g., 'transcript-analysis', 'code-review')",
    }),
    content: Schema.String.annotations({
      description: "The memory content - what you want to remember",
    }),
  },
  success: MemoryResult,
});

export const GetMemories = Tool.make("get_memories", {
  description: `Retrieve all stored memories for a topic.
Use this at the start of a task to load relevant context from past experiences.`,
  parameters: {
    topic: Schema.String.annotations({
      description: "The topic to get memories for",
    }),
  },
  success: MemoryListResult,
});

export const ListTopics = Tool.make("list_memory_topics", {
  description: "List all topics that have stored memories",
  parameters: {},
  success: TopicsResult,
});

export const DeleteMemory = Tool.make("delete_memory", {
  description: "Delete a specific memory by its ID",
  parameters: {
    memory_id: Schema.String.annotations({
      description: "The ID of the memory to delete",
    }),
  },
  success: OperationResult,
});

export const ClearTopic = Tool.make("clear_memory_topic", {
  description: "Delete all memories for a topic",
  parameters: {
    topic: Schema.String.annotations({
      description: "The topic to clear all memories from",
    }),
  },
  success: OperationResult,
});

// Combined toolkit
export const MemoryToolkit = Toolkit.make(
  AddMemory,
  GetMemories,
  ListTopics,
  DeleteMemory,
  ClearTopic,
);

// Handler layer
export const MemoryToolHandlers = MemoryToolkit.toLayer(
  Effect.gen(function* () {
    const memory = yield* MemoryService;

    return {
      add_memory: ({ topic, content }) =>
        Effect.gen(function* () {
          const mem = yield* memory.addMemory(topic, content);
          return {
            id: mem.id,
            topic: mem.topic,
            content: mem.content,
            createdAt: mem.createdAt,
          };
        }),

      get_memories: ({ topic }) =>
        Effect.gen(function* () {
          const memories = yield* memory.getMemories(topic);
          return {
            memories: memories.map((m) => ({
              id: m.id,
              topic: m.topic,
              content: m.content,
              createdAt: m.createdAt,
            })),
            topic: topic.toLowerCase().trim(),
            count: memories.length,
          };
        }),

      list_memory_topics: () =>
        Effect.gen(function* () {
          const topics = yield* memory.getTopics();
          return {
            topics: [...topics],
            count: topics.length,
          };
        }),

      delete_memory: ({ memory_id }) =>
        Effect.gen(function* () {
          const deleted = yield* memory.deleteMemory(memory_id);
          return {
            success: deleted,
            message: deleted
              ? `Memory ${memory_id.slice(0, 8)} deleted`
              : `Memory ${memory_id} not found`,
          };
        }),

      clear_memory_topic: ({ topic }) =>
        Effect.gen(function* () {
          const count = yield* memory.clearTopic(topic);
          return {
            success: true,
            message:
              count > 0
                ? `Cleared ${count} memories from topic "${topic}"`
                : `No memories found for topic "${topic}"`,
          };
        }),
    };
  }),
);
