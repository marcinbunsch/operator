/**
 * LLM Provider Factories
 *
 * Creates Effect layers for different LLM providers. All providers implement
 * the same LanguageModel interface from @effect/ai, making them interchangeable.
 *
 * Usage:
 * ```typescript
 * // OpenAI-compatible API (LM Studio, OpenAI, etc.)
 * const layer = createOpenAiLayer({
 *   apiKey: "your-key",
 *   apiUrl: "http://localhost:1234/v1",
 *   model: "gpt-4",
 * })
 *
 * // Anthropic API
 * const layer = createAnthropicLayer({
 *   apiKey: "your-key",
 *   model: "claude-sonnet-4-20250514",
 * })
 * ```
 */
import { Layer, Redacted } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";

// ============================================================================
// OpenAI Provider
// ============================================================================

export interface OpenAiConfig {
  /** API key (use "lm-studio" for local LM Studio) */
  readonly apiKey: string;
  /** API URL (defaults to OpenAI, use http://localhost:1234/v1 for LM Studio) */
  readonly apiUrl?: string;
  /** Model name (e.g., "gpt-4", "gpt-3.5-turbo", or local model name) */
  readonly model: string;
}

/**
 * Creates a LanguageModel layer using an OpenAI-compatible API.
 * Works with OpenAI, Azure OpenAI, LM Studio, and other compatible providers.
 */
export const createOpenAiLayer = (config: OpenAiConfig) => {
  const clientLayer = OpenAiClient.layer({
    apiKey: Redacted.make(config.apiKey),
    apiUrl: config.apiUrl,
  }).pipe(Layer.provide(FetchHttpClient.layer));

  return OpenAiLanguageModel.layer({
    model: config.model,
  }).pipe(Layer.provide(clientLayer));
};

// ============================================================================
// Anthropic Provider
// ============================================================================

export interface AnthropicConfig {
  /** Anthropic API key */
  readonly apiKey: string;
  /** Model name (e.g., "claude-sonnet-4-20250514", "claude-3-opus-20240229") */
  readonly model: string;
}

/**
 * Creates a LanguageModel layer using the Anthropic API.
 */
export const createAnthropicLayer = (config: AnthropicConfig) => {
  const clientLayer = AnthropicClient.layer({
    apiKey: Redacted.make(config.apiKey),
  }).pipe(Layer.provide(FetchHttpClient.layer));

  return AnthropicLanguageModel.layer({
    model: config.model,
  }).pipe(Layer.provide(clientLayer));
};
