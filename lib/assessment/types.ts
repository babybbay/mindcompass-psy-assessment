export type Dimension = { id: string; name: string; description: string; parentId?: string };
export type Item = { id: string; text: string; originalText?: string; dimensionId: string; reverse: boolean; sourceId: string };
export type Scale = {
  id: string; version: string; versionDate: string; name: string;
  category: "personality" | "attitudes" | "legacy"; purpose: string; minutes: string;
  language: string; exploratory: boolean; instructions: string; limitations: string;
  source: { id: string; citation: string; url: string; permission: string; adaptation: string };
  options: { value: number; label: string }[];
  scoring: { min: number; max: number; aggregation: "mean" | "sum"; total: "sum" | null; missing: "reject"; thresholds: null };
  dimensions: Dimension[]; items: Item[];
};
export type Scores = { dimensions: Record<string, number>; total: number | null };
export const likert5 = ["非常不同意", "不同意", "不确定", "同意", "非常同意"].map((label, i) => ({ value: i + 1, label }));
export const defaultScoring = { min: 1, max: 5, aggregation: "mean", total: null, missing: "reject", thresholds: null } as const;
export const generalLimit = "仅供教育与研究探索，不构成临床、医学或心理诊断，不能替代专业意见。不提供常模、百分位或正常/异常判断。结果受作答情境、自我报告与题目理解影响。";
