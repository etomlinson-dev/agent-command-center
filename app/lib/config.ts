export type BackendMode = "claude-code" | "api-key";

interface AppConfig {
  backendMode: BackendMode;
  anthropicApiKey: string | null;
}

const config: AppConfig = {
  backendMode: "claude-code",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
};

type ConfigListener = (config: AppConfig) => void;
const listeners = new Set<ConfigListener>();

export function getConfig(): Readonly<AppConfig> {
  return { ...config };
}

export function getBackendMode(): BackendMode {
  return config.backendMode;
}

export function setBackendMode(mode: BackendMode): void {
  config.backendMode = mode;
  notify();
}

export function setApiKey(key: string | null): void {
  config.anthropicApiKey = key;
  notify();
}

export function hasApiKey(): boolean {
  return !!config.anthropicApiKey;
}

export function getApiKey(): string {
  if (!config.anthropicApiKey) {
    throw new Error("Anthropic API key not configured");
  }
  return config.anthropicApiKey;
}

export function onConfigChange(cb: ConfigListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  for (const cb of listeners) {
    try { cb({ ...config }); } catch { listeners.delete(cb); }
  }
}
