import { promises as fs } from "fs";
import path from "path";
import type { RatchetResult } from "@/app/types/ratchet";
import type { Trace, Evaluation, AgentConfig } from "@/app/types/ratchet";
import type { AgentData } from "@/app/types/agent";
import {
  agentProfileTemplate,
  traceTemplate,
  improvementTemplate,
  metricsTemplate,
} from "./templates";

function getVaultPath(): string {
  return process.env.OBSIDIAN_VAULT_PATH ?? "C:/Users/etomlinson/Documents/Obsidian Vault";
}

function agentDir(agentId: string): string {
  return path.join(getVaultPath(), "AgentNetwork", "Agents", agentId);
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").slice(0, 100);
}

export async function writeAgentProfile(agent: AgentData, config: AgentConfig): Promise<string> {
  const dir = agentDir(agent.id);
  await ensureDir(dir);
  const filePath = path.join(dir, "profile.md");
  await fs.writeFile(filePath, agentProfileTemplate(agent, config), "utf-8");
  return filePath;
}

export async function writeTrace(trace: Trace, evaluation: Evaluation): Promise<string> {
  const dir = path.join(getVaultPath(), "AgentNetwork", "Traces");
  await ensureDir(dir);
  const filename = sanitizeFilename(`${trace.id}.md`);
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, traceTemplate(trace, evaluation), "utf-8");
  return filePath;
}

export async function writeImprovement(result: RatchetResult): Promise<string> {
  const dir = path.join(agentDir(result.agentId), "improvements");
  await ensureDir(dir);
  const filename = sanitizeFilename(`${result.id}.md`);
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, improvementTemplate(result), "utf-8");

  const globalDir = path.join(getVaultPath(), "AgentNetwork", "Improvements");
  await ensureDir(globalDir);
  await fs.writeFile(path.join(globalDir, filename), improvementTemplate(result), "utf-8");

  return filePath;
}

export async function writeMetrics(agent: AgentData, results: RatchetResult[]): Promise<string> {
  const dir = agentDir(agent.id);
  await ensureDir(dir);
  const filePath = path.join(dir, "metrics.md");
  await fs.writeFile(filePath, metricsTemplate(agent, results), "utf-8");
  return filePath;
}

export async function writeTaskLog(
  agent: AgentData,
  taskId: string,
  content: string,
): Promise<string> {
  const dir = path.join(agentDir(agent.id), "tasks");
  await ensureDir(dir);
  const filePath = path.join(dir, `${sanitizeFilename(taskId)}.md`);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

export async function writeAllForRatchet(
  agent: AgentData,
  config: AgentConfig,
  trace: Trace,
  evaluation: Evaluation,
  result: RatchetResult,
  allResults: RatchetResult[],
): Promise<string[]> {
  const paths: string[] = [];

  try {
    paths.push(await writeAgentProfile(agent, config));
    paths.push(await writeTrace(trace, evaluation));

    if (result.improvements.length > 0) {
      paths.push(await writeImprovement(result));
    }

    paths.push(await writeMetrics(agent, allResults));
  } catch {
    // Vault writes are best-effort — don't crash the ratchet loop
  }

  return paths;
}
