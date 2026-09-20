import type { PersistenceStorage, StoredComparison } from './types';

function clone<T>(value: T): T {
	return structuredClone(value);
}

export type MemoryPersistenceStorageOptions = {
	initialRecords?: readonly StoredComparison[];
};

/** A small storage adapter for tests and non-browser callers. */
export class MemoryPersistenceStorage implements PersistenceStorage {
	private readonly records = new Map<string, StoredComparison>();
	private nextPutFailure: Error | undefined;

	constructor(options: MemoryPersistenceStorageOptions = {}) {
		for (const record of options.initialRecords ?? []) {
			this.records.set(record.bundleId, clone(record));
		}
	}

	failNextPut(error = new Error('simulated persistence failure')): void {
		this.nextPutFailure = error;
	}

	get(bundleId: string): Promise<StoredComparison | undefined> {
		const record = this.records.get(bundleId);
		return Promise.resolve(record ? clone(record) : undefined);
	}

	put(record: StoredComparison): Promise<void> {
		if (this.nextPutFailure) {
			const failure = this.nextPutFailure;
			this.nextPutFailure = undefined;
			throw failure;
		}
		this.records.set(record.bundleId, clone(record));
		return Promise.resolve();
	}

	list(): Promise<StoredComparison[]> {
		return Promise.resolve([...this.records.values()].map(clone));
	}
}

export type IndexedDbPersistenceStorageOptions = {
	dbName?: string;
	indexedDB?: IDBFactory;
};

const DEFAULT_DATABASE_NAME = 'roster-shapes-persistence-v1';
const STORE_NAME = 'comparisons';

function storageError(message: string, cause?: unknown): Error {
	const error = new Error(message);
	error.name = 'PersistenceStorageError';
	if (cause !== undefined) error.cause = cause;
	return error;
}

function requestError(request: { error: DOMException | null }): Error {
	return storageError('IndexedDB request failed', request.error ?? undefined);
}

/** IndexedDB is the runtime adapter; the repository remains independent of it. */
export class IndexedDbPersistenceStorage implements PersistenceStorage {
	private readonly factory: IDBFactory;
	private readonly dbName: string;
	private database: IDBDatabase | undefined;

	constructor(options: IndexedDbPersistenceStorageOptions = {}) {
		const factory = options.indexedDB ?? globalThis.indexedDB;
		if (!factory) throw storageError('IndexedDB is unavailable in this runtime');
		this.factory = factory;
		this.dbName = options.dbName ?? DEFAULT_DATABASE_NAME;
	}

	private async open(): Promise<IDBDatabase> {
		if (this.database) return this.database;

		this.database = await new Promise<IDBDatabase>((resolve, reject) => {
			const request = this.factory.open(this.dbName, 1);
			request.onupgradeneeded = () => {
				if (!request.result.objectStoreNames.contains(STORE_NAME)) {
					request.result.createObjectStore(STORE_NAME, { keyPath: 'bundleId' });
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(requestError(request));
			request.onblocked = () => reject(storageError('IndexedDB open was blocked'));
		});

		return this.database;
	}

	async get(bundleId: string): Promise<StoredComparison | undefined> {
		const database = await this.open();
		return new Promise<StoredComparison | undefined>((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, 'readonly');
			const request = transaction.objectStore(STORE_NAME).get(bundleId);
			request.onsuccess = () => resolve(request.result as StoredComparison | undefined);
			request.onerror = () => reject(requestError(request));
			transaction.onerror = () =>
				reject(storageError('IndexedDB read transaction failed', transaction.error));
			transaction.onabort = () => reject(storageError('IndexedDB read transaction was aborted'));
		});
	}

	async put(record: StoredComparison): Promise<void> {
		const database = await this.open();
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, 'readwrite');
			transaction.oncomplete = () => resolve();
			transaction.onerror = () =>
				reject(storageError('IndexedDB write transaction failed', transaction.error));
			transaction.onabort = () => reject(storageError('IndexedDB write transaction was aborted'));
			const request = transaction.objectStore(STORE_NAME).put(record);
			request.onerror = () => reject(requestError(request));
		});
	}

	async list(): Promise<StoredComparison[]> {
		const database = await this.open();
		return new Promise<StoredComparison[]>((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, 'readonly');
			const request = transaction.objectStore(STORE_NAME).getAll();
			request.onsuccess = () => resolve(request.result as StoredComparison[]);
			request.onerror = () => reject(requestError(request));
			transaction.onerror = () =>
				reject(storageError('IndexedDB list transaction failed', transaction.error));
			transaction.onabort = () => reject(storageError('IndexedDB list transaction was aborted'));
		});
	}
}
