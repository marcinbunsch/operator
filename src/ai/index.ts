/**
 * AI Module
 *
 * Re-exports LLM abstraction from @effect/ai along with provider factories.
 * The LanguageModel service provides a unified interface for all LLM providers.
 */

// Provider factories for creating LLM layers
export {
  createOpenAiLayer,
  createAnthropicLayer,
  type OpenAiConfig,
  type AnthropicConfig,
} from "./providers.js";

// Re-export core AI types from @effect/ai
// These are the abstractions that tools and the agentic loop use
export * as LanguageModel from "@effect/ai/LanguageModel";
export * as Prompt from "@effect/ai/Prompt";
export * as Tool from "@effect/ai/Tool";
export * as Toolkit from "@effect/ai/Toolkit";
export * as AiError from "@effect/ai/AiError";
