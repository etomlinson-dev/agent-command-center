import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options, PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { getRegistry } from "./agent-registry";
import { spawnAgentTask } from "./sdk-manager";
import { emitHandoff } from "./handoff-manager";
import type { ExecutionPlan, PlanAgent, HandoffEvent } from "@/app/types/plan";
import type { AgentCategory } from "@/app/types/agent";
import { CATEGORY_META } from "@/app/types/agent";
import { getBackendMode } from "@/app/lib/config";
import { runApiCompletion } from "./api-adapter";

const plans = new Map<string, ExecutionPlan>();

type PlanListener = (plan: ExecutionPlan) => void;
const planListeners = new Set<PlanListener>();

export function onPlanUpdate(cb: PlanListener): () => void {
  planListeners.add(cb);
  return () => planListeners.delete(cb);
}

function notifyPlanUpdate(plan: ExecutionPlan) {
  for (const cb of planListeners) {
    try { cb(plan); } catch { planListeners.delete(cb); }
  }
}

function makeId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ORCHESTRATOR_PROMPT = `You are an AI agent orchestrator. Given a task, analyze it and propose an execution plan by assigning subtasks to specialized agents. Model dependencies between subtasks so agents hand off work in the right order.

Available agent categories and their roles:
- core-dev: coder, planner, researcher, reviewer, tester (Central Workshop)
- github: PR management, code review, release automation (The Forge)
- security: scanning, verification, audit (War Room)
- performance: monitoring, profiling, optimization (Watchtower)
- memory: knowledge retrieval, context management (The Archive)
- infrastructure: VM management, networking (Power Plant)
- browser: web scraping, form filling (The Factory)
- release: CI/CD, deployment, versioning (Launch Pad)
- docs: documentation generation, API docs (The Library)
- architecture: system design, infrastructure planning (Design Studio)
- data: analytics, ETL, reporting (Data Center)
- communication: messaging, notifications (Signal Tower)

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "summary": "one-line summary of what you understood",
  "complexity": "low" | "medium" | "high",
  "assignments": [
    {
      "index": 0,
      "role": "the agent role (e.g. coder, reviewer)",
      "category": "the category slug",
      "subtask": "specific subtask description",
      "targetBuilding": "building name or null",
      "dependsOn": []
    }
  ]
}

Rules:
- Assign 2-6 agents. Each agent gets ONE focused subtask.
- Use "dependsOn" to list indices of assignments that must complete first. Agents with no dependencies run in parallel.
- Example: a reviewer (index 2) that depends on a coder (index 0) would have "dependsOn": [0].`;

export async function proposePlan(task: string): Promise<ExecutionPlan> {
  const registry = getRegistry();
  const planId = makeId();

  let assignments: {
    role: string;
    category: AgentCategory;
    subtask: string;
    targetBuilding: string | null;
    dependsOn: number[];
  }[];
  let summary: string;
  let complexity: "low" | "medium" | "high";

  try {
    let resultText = "";

    if (getBackendMode() === "api-key") {
      const response = await runApiCompletion(`${ORCHESTRATOR_PROMPT}\n\nTask: ${task}`);
      resultText = response.text;
    } else {
      const options: Partial<Options> = {
        allowedTools: [],
        permissionMode: "default" as PermissionMode,
        maxTurns: 1,
        maxBudgetUsd: 0.1,
        persistSession: false,
      };

      const stream = query({
        prompt: `${ORCHESTRATOR_PROMPT}\n\nTask: ${task}`,
        options: options as Options,
      });

      for await (const message of stream) {
        if (message.type === "result" && message.subtype === "success") {
          resultText = message.result;
        }
      }
    }

    const parsed = JSON.parse(extractJson(resultText));
    summary = parsed.summary ?? task;
    complexity = parsed.complexity ?? "medium";
    assignments = (parsed.assignments ?? []).map((a: Record<string, unknown>, i: number) => ({
      role: a.role as string,
      category: a.category as AgentCategory,
      subtask: a.subtask as string,
      targetBuilding: (a.targetBuilding as string | null) ?? null,
      dependsOn: Array.isArray(a.dependsOn) ? a.dependsOn.filter((d: unknown) => typeof d === "number" && d < i) : [],
    }));
  } catch {
    const fallback = heuristicPlan(task);
    summary = fallback.summary;
    complexity = fallback.complexity;
    assignments = fallback.assignments;
  }

  const usedAgentIds = new Set<string>();
  const planAgents: PlanAgent[] = assignments.map((a) => {
    const allAgents = registry.getAllAgents();
    const match = allAgents.find(
      (ag) => ag.data.category === a.category && ag.data.role === a.role && ag.data.status === "idle" && !usedAgentIds.has(ag.data.id),
    ) ?? allAgents.find(
      (ag) => ag.data.category === a.category && ag.data.status === "idle" && !usedAgentIds.has(ag.data.id),
    );

    const agentId = match?.data.id ?? `agent-unassigned-${Math.random().toString(36).slice(2, 6)}`;
    const agentName = match?.data.name ?? `${a.role} (unassigned)`;
    const meta = CATEGORY_META[a.category] ?? CATEGORY_META["core-dev"];

    usedAgentIds.add(agentId);

    return {
      agentId,
      agentName,
      role: a.role,
      category: a.category,
      subtask: a.subtask,
      targetBuilding: a.targetBuilding,
      accentColor: meta.color,
      dependsOn: a.dependsOn,
      status: "pending" as const,
    };
  });

  const plan: ExecutionPlan = {
    id: planId,
    task,
    summary,
    status: "proposed",
    agents: planAgents,
    handoffs: [],
    estimatedComplexity: complexity,
    createdAt: Date.now(),
    approvedAt: null,
    completedAt: null,
  };

  plans.set(planId, plan);
  notifyPlanUpdate(plan);
  return plan;
}

export async function executePlan(planId: string): Promise<ExecutionPlan> {
  const plan = plans.get(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);
  if (plan.status !== "proposed") throw new Error(`Plan ${planId} is ${plan.status}, not proposed`);

  plan.status = "approved";
  plan.approvedAt = Date.now();
  notifyPlanUpdate(plan);

  const registry = getRegistry();

  // Set target positions so agents walk to their buildings
  for (const pa of plan.agents) {
    if (pa.agentId.startsWith("agent-unassigned")) continue;
    if (pa.targetBuilding) {
      const building = registry.getAllAgents()
        .find((a) => a.data.id === pa.agentId);
      const targetCat = Object.entries(CATEGORY_META).find(
        ([, meta]) => meta.buildingName === pa.targetBuilding,
      );
      if (building && targetCat) {
        const layout = BUILDING_LAYOUT[targetCat[0] as AgentCategory];
        if (layout) {
          registry.updateAgent(pa.agentId, {
            targetPosition: layout.position,
            status: "walking",
          });
        }
      }
    }
  }

  plan.status = "running";
  notifyPlanUpdate(plan);

  runPlanWithDependencies(plan).catch(() => {});

  return plan;
}

const BUILDING_LAYOUT: Record<AgentCategory, { position: [number, number, number] }> = {
  "core-dev":       { position: [0, 0, 0] },
  swarm:            { position: [-8, 0, -6] },
  consensus:        { position: [8, 0, -6] },
  github:           { position: [-12, 0, 4] },
  performance:      { position: [12, 0, 4] },
  security:         { position: [-6, 0, 10] },
  memory:           { position: [6, 0, 10] },
  browser:          { position: [-14, 0, -10] },
  release:          { position: [14, 0, -10] },
  training:         { position: [-10, 0, 14] },
  docs:             { position: [10, 0, 14] },
  architecture:     { position: [0, 0, -12] },
  communication:    { position: [-16, 0, 10] },
  data:             { position: [16, 0, 10] },
  infrastructure:   { position: [0, 0, 16] },
  specialized:      { position: [16, 0, -6] },
};

async function runPlanWithDependencies(plan: ExecutionPlan) {
  const registry = getRegistry();
  const agentResults = new Map<number, Promise<void>>();

  for (let i = 0; i < plan.agents.length; i++) {
    const pa = plan.agents[i];
    if (pa.agentId.startsWith("agent-unassigned")) {
      pa.status = "completed";
      agentResults.set(i, Promise.resolve());
      continue;
    }

    const depPromises = pa.dependsOn
      .map((depIdx) => agentResults.get(depIdx))
      .filter((p): p is Promise<void> => p !== undefined);

    const taskPromise = (async () => {
      if (depPromises.length > 0) {
        await Promise.allSettled(depPromises);

        // Emit handoff events from completed dependencies
        for (const depIdx of pa.dependsOn) {
          const source = plan.agents[depIdx];
          if (source && source.status === "completed") {
            const handoff: HandoffEvent = {
              id: `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              planId: plan.id,
              sourceAgentId: source.agentId,
              targetAgentId: pa.agentId,
              sourceAgentName: source.agentName,
              targetAgentName: pa.agentName,
              data: `${source.subtask} → ${pa.subtask}`,
              timestamp: Date.now(),
            };
            plan.handoffs.push(handoff);
            emitHandoff(handoff);
          }
        }
      }

      pa.status = "running";
      notifyPlanUpdate(plan);

      try {
        await spawnAgentTask(pa.agentId, pa.subtask);
        pa.status = "completed";
      } catch {
        pa.status = "failed";
      }
      notifyPlanUpdate(plan);
    })();

    agentResults.set(i, taskPromise);
  }

  await Promise.allSettled(Array.from(agentResults.values()));

  const allCompleted = plan.agents.every((a) => a.status === "completed");
  const anyFailed = plan.agents.some((a) => a.status === "failed");

  plan.completedAt = Date.now();
  plan.status = allCompleted ? "completed" : anyFailed ? "failed" : "completed";
  notifyPlanUpdate(plan);

  // Reset agent positions after completion
  for (const pa of plan.agents) {
    if (!pa.agentId.startsWith("agent-unassigned")) {
      registry.updateAgent(pa.agentId, { targetPosition: null });
    }
  }
}

export function getPlan(planId: string): ExecutionPlan | undefined {
  return plans.get(planId);
}

export function getAllPlans(): ExecutionPlan[] {
  return Array.from(plans.values());
}

export function getActivePlans(): ExecutionPlan[] {
  return getAllPlans().filter((p) => p.status === "running" || p.status === "approved");
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

function heuristicPlan(task: string): {
  summary: string;
  complexity: "low" | "medium" | "high";
  assignments: { role: string; category: AgentCategory; subtask: string; targetBuilding: string | null; dependsOn: number[] }[];
} {
  const lower = task.toLowerCase();
  const assignments: { role: string; category: AgentCategory; subtask: string; targetBuilding: string | null; dependsOn: number[] }[] = [];

  // Index 0: always a coder
  assignments.push({
    role: "coder",
    category: "core-dev",
    subtask: task,
    targetBuilding: "Central Workshop",
    dependsOn: [],
  });

  const coderIdx = 0;

  if (lower.includes("test")) {
    assignments.push({ role: "tester", category: "core-dev", subtask: `Write tests for: ${task}`, targetBuilding: "Central Workshop", dependsOn: [coderIdx] });
  }
  if (lower.includes("review") || lower.includes("pr")) {
    assignments.push({ role: "reviewer", category: "github", subtask: `Review changes for: ${task}`, targetBuilding: "The Forge", dependsOn: [coderIdx] });
  }
  if (lower.includes("security") || lower.includes("auth") || lower.includes("oauth")) {
    assignments.push({ role: "scanner", category: "security", subtask: `Security audit for: ${task}`, targetBuilding: "War Room", dependsOn: [coderIdx] });
  }
  if (lower.includes("deploy") || lower.includes("release")) {
    const depIndices = assignments.map((_, i) => i).filter((i) => i > 0);
    assignments.push({ role: "deploy", category: "release", subtask: `Deployment plan for: ${task}`, targetBuilding: "Launch Pad", dependsOn: depIndices.length > 0 ? depIndices : [coderIdx] });
  }
  if (lower.includes("doc")) {
    assignments.push({ role: "generator", category: "docs", subtask: `Document: ${task}`, targetBuilding: "The Library", dependsOn: [coderIdx] });
  }

  if (assignments.length < 3) {
    assignments.push({ role: "reviewer", category: "core-dev", subtask: `Review implementation of: ${task}`, targetBuilding: "Central Workshop", dependsOn: [coderIdx] });
  }

  return {
    summary: task.slice(0, 120),
    complexity: assignments.length > 4 ? "high" : assignments.length > 2 ? "medium" : "low",
    assignments,
  };
}
