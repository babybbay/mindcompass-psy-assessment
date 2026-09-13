import type { Scale, Scores } from "./types";

export class StudyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function validateAnswers(scale: Scale, value: unknown, complete = false): asserts value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudyError(400, "答案格式无效。");
  const answers = value as Record<string, unknown>;
  const ids = new Set(scale.items.map(i => i.id));
  for (const [id, v] of Object.entries(answers)) {
    if (!ids.has(id) || !Number.isInteger(v) || !scale.options.some(o => o.value === v)) throw new StudyError(400, "请使用本量表的题目和有效选项。");
  }
  if (complete && Object.keys(answers).length !== scale.items.length) throw new StudyError(400, `还有 ${scale.items.length - Object.keys(answers).length} 题未作答，请补充后再提交。`);
}
export function scoreItem(value: number, reverse: boolean, min = 1, max = 5) {
  if (!Number.isInteger(value) || value < min || value > max) throw new StudyError(400, "无效选项。");
  return reverse ? min + max - value : value;
}
export function calculate(scale: Scale, answers: unknown): Scores {
  validateAnswers(scale, answers, true);
  const dimensions: Record<string, number> = {};
  for (const dimension of scale.dimensions) {
    const childIds = scale.dimensions.filter(d => d.parentId === dimension.id).map(d => d.id);
    const items = scale.items.filter(i => i.dimensionId === dimension.id || childIds.includes(i.dimensionId));
    if (!items.length) throw new Error("Dimension has no items");
    const sum = items.reduce((s, i) => s + scoreItem(answers[i.id], i.reverse, scale.scoring.min, scale.scoring.max), 0);
    dimensions[dimension.id] = scale.scoring.aggregation === "mean" ? sum / items.length : sum;
  }
  return { dimensions, total: scale.scoring.total === "sum" ? scale.items.reduce((s, i) => s + scoreItem(answers[i.id], i.reverse, scale.scoring.min, scale.scoring.max), 0) : null };
}
export function dimensionRange(scale: Scale, id: string) {
  const children = scale.dimensions.filter(d => d.parentId === id).map(d => d.id);
  const n = scale.items.filter(i => i.dimensionId === id || children.includes(i.dimensionId)).length;
  return scale.scoring.aggregation === "sum" ? [n * scale.scoring.min, n * scale.scoring.max] : [scale.scoring.min, scale.scoring.max];
}
export function validateConfig(scale: Scale) {
  const ids = new Set(scale.items.map(i => i.id));
  const dims = new Set(scale.dimensions.map(d => d.id));
  if (ids.size !== scale.items.length || dims.size !== scale.dimensions.length || !scale.source.permission || !scale.source.adaptation || !scale.versionDate) throw new Error("Incomplete or duplicate configuration");
  for (const d of scale.dimensions) if (!d.description || (d.parentId && !dims.has(d.parentId))) throw new Error("Invalid dimension");
  for (const i of scale.items) if (!dims.has(i.dimensionId) || !i.text || typeof i.reverse !== "boolean" || i.sourceId !== scale.source.id) throw new Error("Invalid item");
  calculate(scale, Object.fromEntries(scale.items.map(i => [i.id, scale.scoring.min])));
}
