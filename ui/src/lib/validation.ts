import type { Stage } from "../types";

export function sumStages(stages: Stage[]): number {
  return stages.reduce((acc, s) => acc + s.amount, 0);
}

export function validateProposal(
  budget: number,
  stages: Stage[],
  collateral: number,
  collateralRequired: number
): string | null {
  if (budget <= 0) return "Budget must be positive.";
  if (stages.length < 1) return "Add at least one stage.";
  if (sumStages(stages) !== budget)
    return `Stages must sum exactly to the budget (currently ${sumStages(
      stages
    )} / ${budget}).`;
  if (collateral < collateralRequired)
    return `Collateral must be at least ${collateralRequired} NIGHT.`;
  return null;
}
