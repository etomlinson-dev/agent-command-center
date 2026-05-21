import Anthropic from "@anthropic-ai/sdk";
import type { Trace, Evaluation, ProposedImprovement, ImprovementType, AgentConfig } from "@/app/types/ratchet";

const anthropic = new Anthropic();

interface ImprovementSuggestion {
  type: ImprovementType;
  description: string;
  before: string;
  after: string;
  confidence: number;
  reasoning: string;
}

function buildAnalysisPrompt(trace: Trace, evaluation: Evaluation, config: AgentConfig): string {
  const toolSummary = trace.toolCalls.map((tc) =>
    `  ${tc.tool}: ${tc.success ? "ok" : "FAILED"} (${tc.durationMs}ms)`
  ).join("\n");

  return `Analyze this agent execution trace and propose improvements.

Agent: ${trace.agentName} (${trace.category})
Task: ${trace.prompt}
Success: ${trace.success}
Turns: ${trace.turns}
Duration: ${trace.totalDurationMs}ms
Cost: $${trace.costUsd.toFixed(4)}
Score: ${evaluation.score}/100
Flags: ${evaluation.flags.join(", ") || "none"}

Tool calls:
${toolSummary || "  (none)"}

${trace.error ? `Error: ${trace.error}` : ""}
${trace.result ? `Result summary: ${trace.result.slice(0, 500)}` : ""}

Current agent config:
- System prompt suffix: ${config.systemPromptSuffix || "(none)"}
- Preferred tools: ${config.preferredTools.join(", ") || "(none)"}
- Workflow hints: ${config.workflowHints.join(", ") || "(none)"}

Respond with a JSON array of improvements (0-3 items). Each item:
{
  "type": "prompt_refinement" | "tool_selection" | "workflow_pattern",
  "description": "what to change",
  "before": "current state",
  "after": "proposed state",
  "confidence": 0.0-1.0,
  "reasoning": "why this helps"
}

Only suggest improvements with confidence >= 0.5. If the trace is already optimal, return [].
Respond ONLY with the JSON array, no other text.`;
}

export async function proposeImprovements(
  trace: Trace,
  evaluation: Evaluation,
  config: AgentConfig,
): Promise<ProposedImprovement[]> {
  if (evaluation.score >= 90 && evaluation.flags.length === 0) {
    return [];
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        { role: "user", content: buildAnalysisPrompt(trace, evaluation, config) },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const suggestions: ImprovementSuggestion[] = JSON.parse(text);

    return suggestions
      .filter((s) => s.confidence >= 0.5)
      .slice(0, 3)
      .map((s) => ({
        id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        traceId: trace.id,
        agentId: trace.agentId,
        type: s.type,
        description: s.description,
        before: s.before,
        after: s.after,
        confidence: s.confidence,
        reasoning: s.reasoning,
      }));
  } catch {
    return [];
  }
}

export function applyImprovements(config: AgentConfig, improvements: ProposedImprovement[]): AgentConfig {
  const updated = { ...config, lastUpdated: Date.now() };

  for (const imp of improvements) {
    switch (imp.type) {
      case "prompt_refinement":
        updated.systemPromptSuffix = imp.after;
        break;
      case "tool_selection":
        updated.preferredTools = imp.after.split(",").map((t) => t.trim()).filter(Boolean);
        break;
      case "workflow_pattern":
        updated.workflowHints = [
          ...updated.workflowHints.filter((h) => h !== imp.before),
          imp.after,
        ].slice(-5);
        break;
    }
    updated.improvementCount++;
  }

  return updated;
}
