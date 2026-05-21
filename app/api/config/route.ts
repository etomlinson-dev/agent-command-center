import { NextResponse } from "next/server";
import { getConfig, setBackendMode, setApiKey, type BackendMode } from "@/app/lib/config";

export async function GET() {
  const config = getConfig();
  return NextResponse.json({
    backendMode: config.backendMode,
    hasApiKey: !!config.anthropicApiKey,
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.backendMode) {
    const mode = body.backendMode as string;
    if (mode !== "claude-code" && mode !== "api-key") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    setBackendMode(mode as BackendMode);
  }

  if (body.apiKey !== undefined) {
    setApiKey(body.apiKey || null);
  }

  const config = getConfig();
  return NextResponse.json({
    backendMode: config.backendMode,
    hasApiKey: !!config.anthropicApiKey,
  });
}
