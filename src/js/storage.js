/*
 * =============================================
 * STORAGE - IndexedDB Wrapper
 * =============================================
 *
 * Handles all browser database operations.
 * Uses IndexedDB to store:
 * - Case state snapshots (documents, tasks, events, etc.)
 * - File blobs (actual PDFs, Word docs, etc.)
 * - App metadata (next case number, current role, active case)
 *
 * Why IndexedDB? localStorage has a 5-10MB limit and can't store
 * binary files. IndexedDB can handle hundreds of MBs.
 */

const storage = (() => {
    const DB_NAME = 'idms-v6';
    const DB_VERSION = 1;
    let db = null;

    // ------------------------------------------
    // DATABASE SETUP
    // ------------------------------------------

    // Open (or create) the database. Must be called once on app start.
    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            // Called when the database is first created or version changes
            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Store for case state snapshots (keyed by case ID like "CASE-2026-0001")
                if (!database.objectStoreNames.contains('cases')) {
                    database.createObjectStore('cases', { keyPath: 'id' });
                }

                // Store for actual file blobs (keyed by file ID)
                if (!database.objectStoreNames.contains('files')) {
                    database.createObjectStore('files', { keyPath: 'id' });
                }

                // Store for app-level metadata (single record)
                if (!database.objectStoreNames.contains('meta')) {
                    database.createObjectStore('meta', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ------------------------------------------
    // HELPER: Run a transaction
    // ------------------------------------------
    // Wraps IndexedDB's verbose transaction API into a simple promise

    function _tx(storeName, mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const result = callback(store);

            // If callback returns an IDBRequest, resolve with its result
            if (result && result.onsuccess !== undefined) {
                result.onsuccess = () => resolve(result.result);
                result.onerror = () => reject(result.error);
            } else {
                transaction.oncomplete = () => resolve(result);
                transaction.onerror = () => reject(transaction.error);
            }
        });
    }

    // ------------------------------------------
    // CASE OPERATIONS
    // ------------------------------------------

    // Save a case state snapshot
    async function saveCase(caseId, stateSnapshot) {
        // Create a clean copy with the case ID as the key
        const record = { id: caseId, state: stateSnapshot, savedAt: Date.now() };
        return _tx('cases', 'readwrite', store => store.put(record));
    }

    // Load a case state snapshot (returns the state object, or null)
    async function loadCase(caseId) {
        const record = await _tx('cases', 'readonly', store => store.get(caseId));
        return record ? record.state : null;
    }

    // Delete a case
    async function deleteCase(caseId) {
        return _tx('cases', 'readwrite', store => store.delete(caseId));
    }

    // List all cases (returns array of { id, title, status, priority, currentHolder, ... })
    async function listCases() {
        return _tx('cases', 'readonly', store => store.getAll());
    }

    // ------------------------------------------
    // FILE OPERATIONS
    // ------------------------------------------

    // Store a file blob with metadata
    async function saveFile(fileId, blob, metadata) {
        const record = {
            id: fileId,
            blob: blob,
            name: metadata.name,
            type: metadata.type,
            size: metadata.size,
            savedAt: Date.now()
        };
        return _tx('files', 'readwrite', store => store.put(record));
    }

    // Get a file (returns { blob, name, type, size } or null)
    async function getFile(fileId) {
        const record = await _tx('files', 'readonly', store => store.get(fileId));
        return record || null;
    }

    // Delete a file
    async function deleteFile(fileId) {
        return _tx('files', 'readwrite', store => store.delete(fileId));
    }

    // ------------------------------------------
    // APP METADATA
    // ------------------------------------------
    // Single record that tracks app-level settings

    async function getAppMeta() {
        const record = await _tx('meta', 'readonly', store => store.get('appMeta'));
        return record || {
            key: 'appMeta',
            nextCaseNumber: 1,
            currentRole: 'dto',
            activeCaseId: null
        };
    }

    async function setAppMeta(updates) {
        const current = await getAppMeta();
        const updated = { ...current, ...updates, key: 'appMeta' };
        return _tx('meta', 'readwrite', store => store.put(updated));
    }

    // ------------------------------------------
    // DANGER ZONE
    // ------------------------------------------

    // Clear everything (for reset)
    async function clearAll() {
        await _tx('cases', 'readwrite', store => store.clear());
        await _tx('files', 'readwrite', store => store.clear());
        await _tx('meta', 'readwrite', store => store.clear());
        console.log('All storage cleared');
    }

    // ------------------------------------------
    // PUBLIC API
    // ------------------------------------------

    return {
        init,
        saveCase,
        loadCase,
        deleteCase,
        listCases,
        saveFile,
        getFile,
        deleteFile,
        getAppMeta,
        setAppMeta,
        clearAll
    };
})();
