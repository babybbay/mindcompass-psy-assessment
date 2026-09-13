import { bfi2 } from "./bfi2";
import { tripm } from "./tripm";
import { love, ai, risk, teamwork } from "./exploratory";
import { legacy } from "./legacy";
export const scales = [bfi2, love, tripm, ai, risk, teamwork];
export const allScales = [...scales, legacy];
export function getScale(id: string, version?: string) { return allScales.find(s => s.id === id && (!version || s.version === version)); }
