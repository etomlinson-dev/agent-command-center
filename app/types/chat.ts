export type ChatMessageRole =
  | "user"
  | "assistant"
  | "tool_use"
  | "tool_result"
  | "result"
  | "error";

export interface ChatMessage {
  id: string;
  agentId: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  toolName?: string;
  toolInput?: string;
}
