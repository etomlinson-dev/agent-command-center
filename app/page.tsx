"use client";

import dynamic from "next/dynamic";
import { ResourceBar } from "./components/ui/ResourceBar";
import { EventLog } from "./components/ui/EventLog";
import { Minimap } from "./components/ui/Minimap";
import { CommandPalette } from "./components/ui/CommandPalette";
import { ToastContainer } from "./components/ui/Toast";
import { AgentPanel } from "./components/ui/AgentPanel";
import { BuildingInterior } from "./components/ui/BuildingInterior";
import { CommandDock } from "./components/ui/CommandDock";
import { SkillTreePanel } from "./components/ui/SkillTree";
import { RatchetPanel } from "./components/ui/RatchetPanel";

const Scene = dynamic(
  () => import("./components/game/Scene").then((m) => m.Scene),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="relative w-full h-full">
      {/* 3D Scene */}
      <Scene />

      {/* UI Overlays */}
      <ResourceBar />
      <CommandDock />
      <EventLog />
      <Minimap />
      <CommandPalette />
      <ToastContainer />
      <AgentPanel />
      <BuildingInterior />
      <SkillTreePanel />
      <RatchetPanel />

      {/* Keyboard hint */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 text-[10px] text-[var(--ce-text-secondary)] opacity-50">
        Ctrl+K to search · Click agent to inspect · Scroll to zoom
      </div>
    </div>
  );
}
