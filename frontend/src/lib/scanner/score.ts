import { ruleCopy, type Impact } from "./rules";

/**
 * O risk score (0 a 100): um indicador estimado, nunca uma avaliação jurídica.
 *
 * Cada regra violada soma pontos pela gravidade do axe, multiplicados por 1,5 nas
 * categorias que mais aparecem em processos (texto alternativo, contraste, nomes de
 * botões e links, rótulos, teclado e foco, ARIA). A quantidade de ocorrências pesa
 * em escala logarítmica: 50 imagens sem alt pesam mais que uma, mas não 50 vezes mais.
 * O total vira 0 a 100 por uma curva que satura: lojas com muitos problemas graves
 * chegam perto de 100, e uma ou duas falhas leves ficam baixas.
 */

const IMPACT_POINTS: Record<Impact, number> = { critical: 10, serious: 7, moderate: 4, minor: 1 };
const LITIGATION_MULTIPLIER = 1.5;
const SATURATION = 70;

export interface RuleTotal {
  ruleId: string;
  help: string;
  impact: Impact;
  occurrences: number;
}

export function rulePoints({ ruleId, help, impact, occurrences }: RuleTotal): number {
  if (occurrences <= 0) return 0;
  const weight = IMPACT_POINTS[impact] * (ruleCopy(ruleId, help).litigation ? LITIGATION_MULTIPLIER : 1);
  return weight * (1 + Math.log2(occurrences));
}

export function riskScore(rules: RuleTotal[]): number {
  const raw = rules.reduce((sum, rule) => sum + rulePoints(rule), 0);
  return Math.min(100, Math.round(100 * (1 - Math.exp(-raw / SATURATION))));
}

export type RiskBand = "low" | "elevated" | "high";

export function riskBand(score: number): RiskBand {
  if (score >= 60) return "high";
  if (score >= 30) return "elevated";
  return "low";
}

export const RISK_LABEL: Record<RiskBand, string> = { low: "Lower", elevated: "Elevated", high: "High" };
