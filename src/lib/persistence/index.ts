export {
	createMemoryPersistenceRepository,
	createPersistenceRepository,
	PersistenceImportError,
	PersistenceRepository,
	PersistenceRevisionConflictError,
	PersistenceStorageError,
	type ImportOptions,
	type PersistenceRepositoryFactoryOptions
} from './repository';
export { IndexedDbPersistenceStorage, MemoryPersistenceStorage } from './storage';
export {
	PERSISTENCE_KIND,
	PERSISTENCE_VERSION,
	type ImportConflict,
	type ImportResult,
	type LoadedComparison,
	type PersistedRevision,
	type PersistenceRepositoryOptions,
	type PersistenceStorage,
	type ReplayCallback,
	type ReplayEntry,
	type ReplayOptions,
	type ReplayReport,
	type SaveResult,
	type StoredComparison
} from './types';
