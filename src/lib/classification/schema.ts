// The response contract for the Jev provider, validated before anything reads
// it (SPEC §7: "define a versioned schema and validate every provider
// response"). The shapes follow docs.typesafe.ai/api, reviewed 2026-09-25; a
// response that does not match is reported as invalid rather than repaired,
// because a repaired probability is not the model's answer.
import { z } from 'zod';
import { EVIDENCE_QUESTION, PROFILE_QUESTION, type JevSystemOneRequest } from './prompt';
import { isProfileLabel, type ProfileLabel } from './rubric';

export const RESPONSE_CONTRACT_VERSION = 'jev-response-v1';

const probability = z.number().min(0).max(1);

const choiceAnswerSchema = z.object({
	type: z.literal('choice'),
	choice: z.string().min(1),
	probabilities: z.record(z.string(), probability),
	confidence: probability
});

const noulAnswerSchema = z.object({
	type: z.literal('noul'),
	noul: probability
});

const answerSchema = z.union([choiceAnswerSchema, noulAnswerSchema]);

const responseSchema = z.object({
	model: z.string().min(1),
	answers: z.record(z.string(), answerSchema),
	usage: z.object({
		input_tokens: z.number().int().nonnegative(),
		output_tokens: z.number().int().nonnegative()
	})
});

export type JevChoiceAnswer = z.infer<typeof choiceAnswerSchema>;
export type JevNoulAnswer = z.infer<typeof noulAnswerSchema>;
export type JevResponse = z.infer<typeof responseSchema>;

export interface JevIssue {
	code: string;
	/** RFC 6901 JSON Pointer into the response body. */
	path: string;
	message: string;
}

export type JevResponseValidation =
	{ success: true; data: JevResponse } | { success: false; issues: JevIssue[] };

/** RFC 6901 pointer into the response body, matching the contract's issue paths. */
function pointer(issue: z.core.$ZodIssue): string {
	if (issue.code === 'invalid_union') return '';
	const segments =
		issue.code === 'unrecognized_keys'
			? issue.keys.map((key) => String(key))
			: issue.path.map((segment) => String(segment));
	return segments.length ? `/${segments.join('/')}` : '';
}

const SUM_TOLERANCE = 0.01;

/**
 * Validate one response against the questions that were actually asked: the
 * answer keys must match, each answer's type must match its question, a Choice
 * must name one of the options the rubric offered with a full distribution, and
 * the distribution must add up. Unknown extra answers are ignored, so a
 * provider adding a field does not invalidate an otherwise usable answer.
 */
export function validateJevResponse(
	input: unknown,
	request: JevSystemOneRequest
): JevResponseValidation {
	const parsed = responseSchema.safeParse(input);
	if (!parsed.success) {
		return {
			success: false,
			issues: parsed.error.issues.map((issue) => ({
				code: 'INVALID_RESPONSE',
				path: pointer(issue),
				message: issue.message
			}))
		};
	}
	const { data } = parsed;
	const issues: JevIssue[] = [];
	for (const [key, question] of Object.entries(request.questions)) {
		const answer = data.answers[key];
		if (!answer) {
			issues.push({
				code: 'MISSING_ANSWER',
				path: `/answers/${key}`,
				message: `the provider returned no answer for question '${key}'`
			});
			continue;
		}
		if (answer.type !== question.type) {
			issues.push({
				code: 'ANSWER_TYPE_MISMATCH',
				path: `/answers/${key}/type`,
				message: `expected a '${question.type}' answer for question '${key}'`
			});
			continue;
		}
		if (question.type !== 'choice' || answer.type !== 'choice') continue;
		const options = Object.keys(question.criteria ?? {});
		if (!options.includes(answer.choice)) {
			issues.push({
				code: 'UNKNOWN_CHOICE',
				path: `/answers/${key}/choice`,
				message: `'${answer.choice}' is not one of the rubric's options`
			});
		}
		for (const option of options) {
			if (!(option in answer.probabilities)) {
				issues.push({
					code: 'MISSING_PROBABILITY',
					path: `/answers/${key}/probabilities/${option}`,
					message: `the distribution has no probability for rubric option '${option}'`
				});
			}
		}
		const sum = options.reduce((total, option) => total + (answer.probabilities[option] ?? 0), 0);
		if (options.length > 0 && Math.abs(sum - 1) > SUM_TOLERANCE) {
			issues.push({
				code: 'PROBABILITIES_NOT_NORMALIZED',
				path: `/answers/${key}/probabilities`,
				message: `the distribution sums to ${sum.toFixed(4)}, not 1`
			});
		}
	}
	if (issues.length > 0) return { success: false, issues };
	return { success: true, data };
}

/** The validated profile answer for one player, when both questions are present. */
export function readProfileAnswers(response: JevResponse): {
	choice: ProfileLabel;
	probabilities: Record<string, number>;
	confidence: number;
	evidenceSufficient: number;
} | null {
	const profile = response.answers[PROFILE_QUESTION];
	const evidence = response.answers[EVIDENCE_QUESTION];
	if (!profile || profile.type !== 'choice' || !evidence || evidence.type !== 'noul') return null;
	if (!isProfileLabel(profile.choice)) return null;
	return {
		choice: profile.choice,
		probabilities: profile.probabilities,
		confidence: profile.confidence,
		evidenceSufficient: evidence.noul
	};
}
