import type { Bundle, BundleValidationIssue, CalculationResult } from '../contracts';

export const PERSISTENCE_VERSION = '1.0' as const;
export const PERSISTENCE_KIND = 'roster-shapes-comparison' as const;

export type PersistedRevision = {
	storedRevision: number;
	savedAt: string;
	bundle: Bundle;
	inputDigest: string;
	calculationVersions: string[];
};

export type StoredComparison = {
	persistenceVersion: typeof PERSISTENCE_VERSION;
	kind: typeof PERSISTENCE_KIND;
	bundleId: string;
	currentStoredRevision: number;
	revisions: PersistedRevision[];
};

export type ReplayRequest = {
	bundle: Bundle;
	cachedResult: CalculationResult;
	calculationVersion: string;
	scenarioId: string;
	scenarioRevision: number;
};

export type ReplayCallback = (
	request: ReplayRequest
) => CalculationResult | null | undefined | Promise<CalculationResult | null | undefined>;

export type ReplayOptions = {
	/** Versions that can be replayed by the callback currently in use. */
	supportedCalculationVersions?: Iterable<string>;
	replay?: ReplayCallback;
};

export type ReplayEntry = {
	scenarioId: string;
	calculationVersion: string;
	status: 'verified' | 'mismatch' | 'unavailable' | 'not-checked';
	issue?: BundleValidationIssue;
};

export type ReplayReport = {
	status: 'verified' | 'replay-mismatch' | 'historical' | 'unevaluated' | 'not-checked';
	entries: ReplayEntry[];
	issues: BundleValidationIssue[];
};

export type LoadedComparison = {
	record: StoredComparison;
	current: PersistedRevision;
	validationIssues: BundleValidationIssue[];
	replay: ReplayReport;
};

export type SaveResult = LoadedComparison & {
	status: 'saved' | 'updated';
};

export type ImportSuccess = LoadedComparison & {
	status: 'imported' | 'unchanged' | 'replaced-as-new-revision';
};

export type ImportConflict = {
	status: 'conflict';
	reason: 'duplicate-bundle-id';
	bundleId: string;
	existing: StoredComparison;
	incoming: StoredComparison;
};

export type ImportResult = ImportSuccess | ImportConflict;

export interface PersistenceStorage {
	get(bundleId: string): Promise<StoredComparison | undefined>;
	put(record: StoredComparison): Promise<void>;
	list(): Promise<StoredComparison[]>;
}

export type PersistenceRepositoryOptions = ReplayOptions & {
	clock?: () => string;
};
