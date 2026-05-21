import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "@/app/lib/config";
import type { AgentProfile } from "./agent-registry";

interface ApiTaskResult {
  success: boolean;
  result: string | null;
  error: string | null;
  costUsd: number;
  turns: number;
  inputTokens: number;
  outputTokens: number;
}

interface ApiStreamCallbacks {
  onText?: (text: string) => void;
  onToolUse?: (toolName: string) => void;
  onResult?: (result: ApiTaskResult) => void;
}

function buildSystemPrompt(profile: AgentProfile, promptSuffix?: string): string {
  const tools = profile.allowedTools.join(", ");
  const parts = [
    `You are a specialized AI agent. Your available tools/capabilities: ${tools}.`,
    `Be concise and focused. Complete the task efficiently.`,
  ];
  if (promptSuffix) parts.push(promptSuffix);
  return parts.join("\n");
}

function getClient(): Anthropic {
  return new Anthropic({ apiKey: getApiKey() });
}

export async function runApiTask(
  prompt: string,
  profile: AgentProfile,
  callbacks?: ApiStreamCallbacks,
  abortSignal?: AbortSignal,
  systemPromptSuffix?: string,
): Promise<ApiTaskResult> {
  const client = getClient();
  const system = buildSystemPrompt(profile, systemPromptSuffix);

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let turns = 0;
  const maxTurns = profile.maxTurns ?? 10;

  let finalResult: string | null = null;

  while (turns < maxTurns) {
    if (abortSignal?.aborted) {
      return { success: false, result: null, error: "Cancelled", costUsd: estimateCost(totalInputTokens, totalOutputTokens), turns, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
    }

    turns++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    let hasToolUse = false;
    const assistantContent: Anthropic.ContentBlock[] = [];

    for (const block of response.content) {
      assistantContent.push(block);

      if (block.type === "text") {
        finalResult = block.text;
        callbacks?.onText?.(block.text);
      } else if (block.type === "tool_use") {
        hasToolUse = true;
        callbacks?.onToolUse?.(block.name);
      }
    }

    messages.push({ role: "assistant", content: assistantContent });

    if (response.stop_reason === "end_turn" || !hasToolUse) {
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = assistantContent
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((toolBlock) => ({
        type: "tool_result" as const,
        tool_use_id: toolBlock.id,
        content: "Tool execution is not available in API-key mode. Respond based on your knowledge.",
      }));

    messages.push({ role: "user", content: toolResults });
  }

  const costUsd = estimateCost(totalInputTokens, totalOutputTokens);
  const result: ApiTaskResult = {
    success: true,
    result: finalResult,
    error: null,
    costUsd,
    turns,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  };

  callbacks?.onResult?.(result);
  return result;
}

export async function runApiChat(
  prompt: string,
  profile: AgentProfile,
  onText: (text: string) => void,
  abortSignal?: AbortSignal,
): Promise<{ result: string; costUsd: number; turns: number }> {
  const client = getClient();
  const system = buildSystemPrompt(profile);

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  if (abortSignal) {
    abortSignal.addEventListener("abort", () => stream.abort(), { once: true });
  }

  let fullText = "";

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
      onText(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();

  return {
    result: fullText,
    costUsd: estimateCost(finalMessage.usage.input_tokens, finalMessage.usage.output_tokens),
    turns: 1,
  };
}

export async function runApiCompletion(
  prompt: string,
): Promise<{ text: string; costUsd: number }> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    text,
    costUsd: estimateCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  // Sonnet 4 pricing: $3/M input, $15/M output
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
