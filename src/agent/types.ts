import { Context } from "effect";

/**
 * Interface-agnostic context for agent interactions.
 * Interfaces (Slack, Matrix, HTTP, etc.) create this from their events.
 */
export interface AgentContextValue {
  /** Interface-provided user identifier */
  readonly userId: string;

  /** Unique session/conversation ID */
  readonly sessionId: string;

  /** Interface-specific metadata (platform, channel, thread, etc.) */
  readonly metadata: Record<string, unknown>;
}

/**
 * Effect Context tag for AgentContext.
 * Tools and services access this via `yield* AgentContext`.
 */
export class AgentContext extends Context.Tag("@operator/core/AgentContext")<
  AgentContext,
  AgentContextValue
>() {}

/**
 * Abstract target for sending responses (e.g., job completion notifications).
 * Stored with jobs so the response service knows where to send results.
 */
export interface ResponseTarget {
  /** Session ID to respond to */
  readonly sessionId: string;

  /** Interface-specific metadata for routing the response */
  readonly metadata: Record<string, unknown>;
}

/**
 * Response from the agentic loop.
 */
export type AgentResponse =
  | { readonly type: "text"; readonly content: string }
  | { readonly type: "max-iterations-reached" }
  | { readonly type: "error"; readonly error: unknown };
