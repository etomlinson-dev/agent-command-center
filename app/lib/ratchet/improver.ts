import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options, PermissionMode, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Trace, Evaluation, ProposedImprovement, ImprovementType, AgentConfig } from "@/app/types/ratchet";

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
    const options: Partial<Options> = {
      allowedTools: [],
      permissionMode: "default" as PermissionMode,
      maxTurns: 1,
      maxBudgetUsd: 0.1,
      persistSession: false,
    };

    let resultText = "";
    const stream = query({
      prompt: buildAnalysisPrompt(trace, evaluation, config),
      options: options as Options,
    });

    for await (const message of stream) {
      if (message.type === "result" && (message as SDKMessage & { subtype?: string }).subtype === "success") {
        resultText = (message as SDKMessage & { result?: string }).result ?? "";
      }
    }

    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const suggestions: ImprovementSuggestion[] = JSON.parse(jsonMatch[0]);

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
