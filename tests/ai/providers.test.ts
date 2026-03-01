/**
 * Tests for AI provider layer factories.
 * These tests verify that the layers can be created - they don't make actual API calls.
 */
import { describe, it, expect } from "vitest";
import { Layer } from "effect";
import { createOpenAiLayer, createAnthropicLayer } from "../../src/ai/providers.js";

describe("AI Providers", () => {
  describe("createOpenAiLayer", () => {
    it("creates a layer with minimal config", () => {
      const layer = createOpenAiLayer({
        apiKey: "test-key",
        model: "gpt-4",
      });

      // Layer should be created successfully
      expect(Layer.isLayer(layer)).toBe(true);
    });

    it("creates a layer with custom API URL", () => {
      const layer = createOpenAiLayer({
        apiKey: "lm-studio",
        apiUrl: "http://localhost:1234/v1",
        model: "local-model",
      });

      expect(Layer.isLayer(layer)).toBe(true);
    });
  });

  describe("createAnthropicLayer", () => {
    it("creates a layer with config", () => {
      const layer = createAnthropicLayer({
        apiKey: "test-key",
        model: "claude-sonnet-4-20250514",
      });

      expect(Layer.isLayer(layer)).toBe(true);
    });
  });
});
