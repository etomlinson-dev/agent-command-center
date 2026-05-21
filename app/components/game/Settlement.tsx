"use client";

import { useGameStore } from "@/app/lib/game/state";
import { Building } from "./Building";
import { AgentSprite } from "./AgentSprite";
import { PlanPreview } from "./PlanPreview";
import { HandoffArcs } from "./HandoffArc";
import { AgentWander } from "./AgentWander";
import { FloatingXPLayer } from "./FloatingXP";
import { EvolutionEffects } from "./EvolutionEffect";

export function Settlement() {
  const buildings = useGameStore((s) => s.buildings);
  const agents = useGameStore((s) => s.agents);

  return (
    <group>
      {buildings.map((b) => (
        <Building key={b.id} building={b} />
      ))}
      {agents.map((a) => (
        <AgentSprite key={a.id} agent={a} />
      ))}
      <PlanPreview />
      <HandoffArcs />
      <AgentWander />
      <FloatingXPLayer />
      <EvolutionEffects />
    </group>
  );
}
