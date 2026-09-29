import type { ParamMatcher } from '@sveltejs/kit';

// D-50: the supplementary diagrams under a decision. Keep in step with
// DIAGRAMS in src/lib/app/decision.ts; `snapshots` stays its own route.
export const match = ((param: string): param is 'case' | 'engine' | 'interactions' | 'slots' =>
	['case', 'engine', 'interactions', 'slots'].includes(param)) satisfies ParamMatcher;
