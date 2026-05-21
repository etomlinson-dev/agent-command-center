import type { Trace, Evaluation, RatchetResult, AgentConfig } from "@/app/types/ratchet";
import type { AgentData } from "@/app/types/agent";
import { CATEGORY_META } from "@/app/types/agent";

function yaml(obj: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => JSON.stringify(v)).join(", ")}]`);
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`  ${k}: ${JSON.stringify(v)}`);
      }
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function dateStamp(): string {
  return new Date().toISOString().split("T")[0];
}

export function agentProfileTemplate(agent: AgentData, config: AgentConfig): string {
  const meta = CATEGORY_META[agent.category];
  const fm = yaml({
    title: agent.name,
    type: "agent-profile",
    "ai-first": true,
    date: dateStamp(),
    tags: ["agent-profile", agent.category, "agent-command-center"],
    category: agent.category,
    agentId: agent.id,
    level: agent.level,
    xp: agent.xp,
    health: Math.round(agent.health),
    status: agent.status,
    improvementCount: config.improvementCount,
  });

  return `${fm}

## For future Claude

Agent profile for ${agent.name}, a ${meta.label} agent in the [[AgentNetwork/Agent Command Center]]. Level ${agent.level} with ${agent.xp} XP. ${config.improvementCount} ratchet improvements applied.

---

## Identity

- **Name:** ${agent.name}
- **Role:** ${agent.role}
- **Category:** [[${meta.label}]] (${agent.category})
- **Building:** ${meta.buildingName}
- **Level:** ${agent.level}
- **XP:** ${agent.xp}
- **Health:** ${Math.round(agent.health)}%

## Skills

${agent.skills.length > 0 ? agent.skills.map((s) => `- ${s}`).join("\n") : "- (none unlocked yet)"}

## Performance Stats

| Metric | Value |
|---|---|
| Tasks Completed | ${agent.stats.tasksCompleted} |
| Tasks Failed | ${agent.stats.tasksFailed} |
| Avg Iterations | ${agent.stats.avgIterations.toFixed(1)} |
| Ratchet Improvements | ${agent.stats.ratchetImprovements} |
| Ratchet Reverts | ${agent.stats.ratchetReverts} |

## Agent Config

- **Prompt suffix:** ${config.systemPromptSuffix || "(none)"}
- **Preferred tools:** ${config.preferredTools.join(", ") || "(none)"}
- **Workflow hints:** ${config.workflowHints.join(", ") || "(none)"}
- **Total improvements:** ${config.improvementCount}
- **Last updated:** ${new Date(config.lastUpdated).toISOString()}
`;
}

export function traceTemplate(trace: Trace, evaluation: Evaluation): string {
  const fm = yaml({
    title: `Trace: ${trace.agentName} — ${trace.prompt.slice(0, 50)}`,
    type: "trace",
    "ai-first": true,
    date: dateStamp(),
    tags: ["trace", trace.category, "agent-command-center"],
    agentId: trace.agentId,
    agentName: trace.agentName,
    taskId: trace.taskId,
    success: trace.success,
    score: evaluation.score,
    turns: trace.turns,
    durationMs: trace.totalDurationMs,
    costUsd: trace.costUsd,
  });

  const toolLines = trace.toolCalls.length > 0
    ? trace.toolCalls.map((tc) =>
        `| ${tc.tool} | ${tc.success ? "ok" : "FAILED"} | ${tc.durationMs}ms | ${tc.error ?? "-"} |`
      ).join("\n")
    : "| (none) | - | - | - |";

  return `${fm}

## For future Claude

Execution trace for [[${trace.agentName}]] on task "${trace.prompt.slice(0, 80)}". Score: ${evaluation.score}/100. ${trace.success ? "Succeeded" : "Failed"} in ${trace.turns} turns, ${trace.totalDurationMs}ms, $${trace.costUsd.toFixed(4)}.

---

## Task

> ${trace.prompt}

## Outcome

- **Success:** ${trace.success}
- **Turns:** ${trace.turns}
- **Duration:** ${trace.totalDurationMs}ms
- **Cost:** $${trace.costUsd.toFixed(4)}
${trace.error ? `- **Error:** ${trace.error}` : ""}

## Evaluation

- **Score:** ${evaluation.score}/100
- **Success:** ${evaluation.breakdown.successScore}/40
- **Efficiency:** ${evaluation.breakdown.efficiencyScore}/30
- **Cost:** ${evaluation.breakdown.costScore}/20
- **Error penalty:** -${evaluation.breakdown.errorPenalty}
- **Flags:** ${evaluation.flags.join(", ") || "none"}

## Tool Calls

| Tool | Status | Duration | Error |
|---|---|---|---|
${toolLines}

${trace.result ? `## Result\n\n${trace.result.slice(0, 1000)}` : ""}
`;
}

export function improvementTemplate(result: RatchetResult): string {
  const fm = yaml({
    title: `Improvement: ${result.agentName} — ${result.verdict}`,
    type: "improvement",
    "ai-first": true,
    date: dateStamp(),
    tags: ["improvement", result.category, result.verdict, "agent-command-center"],
    agentId: result.agentId,
    agentName: result.agentName,
    verdict: result.verdict,
    baselineScore: result.baselineScore,
    improvedScore: result.improvedScore,
    xpAwarded: result.xpAwarded,
  });

  const improvementLines = result.improvements.length > 0
    ? result.improvements.map((imp) =>
        `### ${imp.type}\n\n- **Description:** ${imp.description}\n- **Confidence:** ${(imp.confidence * 100).toFixed(0)}%\n- **Before:** ${imp.before}\n- **After:** ${imp.after}\n- **Reasoning:** ${imp.reasoning}`
      ).join("\n\n")
    : "(no improvements proposed)";

  return `${fm}

## For future Claude

Ratchet result for [[${result.agentName}]]: **${result.verdict}**. Baseline score ${result.baselineScore}${result.improvedScore != null ? ` → ${Math.round(result.improvedScore)}` : ""}. ${result.improvements.length} improvements proposed. ${result.xpAwarded} XP awarded.

---

## Summary

- **Agent:** [[${result.agentName}]]
- **Verdict:** ${result.verdict}
- **Baseline Score:** ${result.baselineScore}/100
${result.improvedScore != null ? `- **Improved Score:** ${Math.round(result.improvedScore)}/100` : ""}
- **XP Awarded:** ${result.xpAwarded}
- **Improvements:** ${result.improvements.length}

## Improvements

${improvementLines}

## Related

- Trace: [[${result.traceId}]]
- Agent: [[${result.agentName}]]
`;
}

export function metricsTemplate(
  agent: AgentData,
  results: RatchetResult[],
): string {
  const fm = yaml({
    title: `Metrics: ${agent.name}`,
    type: "metrics",
    "ai-first": true,
    date: dateStamp(),
    tags: ["metrics", agent.category, "agent-command-center"],
    agentId: agent.id,
  });

  const kept = results.filter((r) => r.verdict === "kept").length;
  const reverted = results.filter((r) => r.verdict === "reverted").length;
  const skipped = results.filter((r) => r.verdict === "skipped").length;
  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.baselineScore, 0) / results.length
    : 0;

  return `${fm}

## For future Claude

Performance metrics for [[${agent.name}]]. ${results.length} ratchet cycles total: ${kept} kept, ${reverted} reverted, ${skipped} skipped. Average score: ${avgScore.toFixed(1)}.

---

## Ratchet Summary

| Metric | Value |
|---|---|
| Total Cycles | ${results.length} |
| Kept | ${kept} |
| Reverted | ${reverted} |
| Skipped | ${skipped} |
| Keep Rate | ${results.length > 0 ? ((kept / results.length) * 100).toFixed(1) : 0}% |
| Average Score | ${avgScore.toFixed(1)} |

## Recent Results

${results.slice(0, 10).map((r) =>
  `- ${new Date(r.timestamp).toISOString().slice(0, 16)} — **${r.verdict}** (${r.baselineScore}${r.improvedScore != null ? ` → ${Math.round(r.improvedScore)}` : ""}) — ${r.improvements.length} improvements`
).join("\n")}
`;
}
