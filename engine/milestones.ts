
import { GrowthPhase, Milestone, MilestoneStatus } from "../types";

/**
 * REGRAS DO MÉTODO:
 * - locked: ainda não pode executar
 * - in-progress: já liberado e em execução
 * - completed: concluído
 *
 * Unlock: um milestone locked vira in-progress quando:
 *  - está na fase atual do cliente
 *  - e (se tiver dependsOn) todas dependências estão completed
 */
export function unlockEligibleMilestones(
  milestones: Milestone[],
  clientId: string,
  currentPhase: GrowthPhase
): Milestone[] {
  return milestones.map((m) => {
    if (m.clientId !== clientId) return m;
    if (m.phase !== currentPhase) return m;
    if (m.status !== "locked") return m;

    const deps = m.dependsOn ?? [];
    const depsCompleted = deps.every((depId) => {
      const dep = milestones.find((x) => x.clientId === clientId && x.id === depId);
      return dep?.status === "completed";
    });

    return depsCompleted ? { ...m, status: "in-progress" } : m;
  });
}

export function computePhaseProgress(
  milestones: Milestone[],
  clientId: string,
  phase: GrowthPhase
): number {
  const phaseMs = milestones.filter((m) => m.clientId === clientId && m.phase === phase);
  if (phaseMs.length === 0) return 0;

  const totalWeight = phaseMs.reduce((sum, m) => sum + (m.weight ?? 1), 0);
  const doneWeight = phaseMs
    .filter((m) => m.status === "completed")
    .reduce((sum, m) => sum + (m.weight ?? 1), 0);

  return Math.round((doneWeight / totalWeight) * 100);
}

export function computeUpgradeReadiness(
  milestones: Milestone[],
  clientId: string,
  phase: GrowthPhase
): number {
  return computePhaseProgress(milestones, clientId, phase);
}

// Fix: Added missing getPhaseCompletionStats export to satisfy import in Roadmap.tsx
export function getPhaseCompletionStats(
  milestones: Milestone[],
  clientId: string,
  phase: GrowthPhase
) {
  const phaseMs = milestones.filter((m) => m.clientId === clientId && m.phase === phase);
  return {
    total: phaseMs.length,
    completed: phaseMs.filter((m) => m.status === "completed").length,
    inProgress: phaseMs.filter((m) => m.status === "in-progress").length,
    locked: phaseMs.filter((m) => m.status === "locked").length,
  };
}

export function getNextMilestone(
  milestones: Milestone[],
  clientId: string,
  phase: GrowthPhase
): Milestone | undefined {
  const inProgress = milestones.find(
    (m) => m.clientId === clientId && m.phase === phase && m.status === "in-progress"
  );
  if (inProgress) return inProgress;

  const locked = milestones.filter(
    (m) => m.clientId === clientId && m.phase === phase && m.status === "locked"
  );

  for (const m of locked) {
    const deps = m.dependsOn ?? [];
    const depsCompleted = deps.every((depId) => {
      const dep = milestones.find((x) => x.clientId === clientId && x.id === depId);
      return dep?.status === "completed";
    });
    if (depsCompleted) return m;
  }

  return locked[0];
}
