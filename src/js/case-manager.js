/*
 * =============================================
 * CASE MANAGER - Case Lifecycle Orchestrator
 * =============================================
 *
 * This is the bridge between storage (IndexedDB) and the app
 * (state + rendering). It handles:
 * - Creating new cases
 * - Switching between cases
 * - Auto-saving the current case
 * - Managing file uploads and blob URLs
 *
 * The key idea: window.state always holds ONE case at a time.
 * When you switch cases, this module saves the current one,
 * loads the new one into window.state, and re-renders.
 */

const caseManager = (() => {

    // App-level state (not per-case)
    let appMeta = {
        nextCaseNumber: 1,
        currentRole: 'dto',
        activeCaseId: null
    };

    // Cache of blob URLs for file viewing (cleaned up on case switch)
    const blobUrlCache = {};

    // Debounce timer for auto-save
    let saveTimer = null;
    const SAVE_DEBOUNCE_MS = 300;

    // ------------------------------------------
    // INITIALIZATION
    // ------------------------------------------
    // Called once when the app starts. Opens the database,
    // loads app metadata, and restores the last active case.

    async function init() {
        try {
            // Open the database
            await storage.init();

            // Load app-level metadata (or use defaults)
            appMeta = await storage.getAppMeta();

            // Restore the last used role
            if (appMeta.currentRole) {
                state.currentRole = appMeta.currentRole;
            }

            // Try to restore the last active case
            if (appMeta.activeCaseId) {
                const caseState = await storage.loadCase(appMeta.activeCaseId);
                if (caseState) {
                    // Load the saved case into window.state
                    _loadStateFromSnapshot(caseState);
                    renderAll();
                    if (typeof renderAskAITab === 'function') renderAskAITab();
                    console.log(`Restored case: ${appMeta.activeCaseId}`);
                    return;
                }
            }

            // No active case — show empty state
            // Reset to blank state so the UI shows the empty queue
            state = getInitialState();
            state.currentRole = appMeta.currentRole || 'dto';
            state.caseInfo.id = null; // Signal: no case loaded
            window.state = state;
            renderAll();
            if (typeof renderAskAITab === 'function') renderAskAITab();
            console.log('No active case — showing empty state');

        } catch (err) {
            console.error('Failed to initialize case manager:', err);
            // Fall back to the default in-memory state
            try { renderAll(); } catch(e) { console.error('renderAll fallback failed:', e); }
            try { if (typeof renderAskAITab === 'function') renderAskAITab(); } catch(e) { /* ignore */ }
        }
    }

    // ------------------------------------------
    // CASE CREATION
    // ------------------------------------------
    // Creates a new case with the given info and files.
    // Returns the new case ID.

    async function createCase({ title, priority, dueDate, notes, files }) {
        // Generate a unique case ID: CASE-2026-0001
        const caseId = generateCaseId();

        // Create a fresh state from the template
        const newState = getInitialState();
        newState.currentRole = state.currentRole; // Keep current role

        // Populate case info
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        newState.caseInfo = {
            id: caseId,
            title: title,
            status: 'active',
            priority: priority || 'medium',
            dueDate: dueDate ? _formatDate(dueDate) : 'Not set',
            dueDateDisplay: dueDate ? _formatDateLong(dueDate) : 'Not set',
            dueDateISO: dueDate || '',
            createdAt: dateStr,
            currentHolder: 'dto',       // New cases start with DTO
            previousHolder: null,
            pendingAction: 'triage',
            pendingFrom: 'dto'
        };

        // Process uploaded files into documents
        newState.documents = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const { fileId, docRecord } = await attachFile(file, 'dto');
                newState.documents.push(docRecord);
            }
            // Select the first document
            newState.selectedDocId = newState.documents[0].id;
        }

        // Add creation event
        newState.events = [{
            id: Date.now(),
            type: 'created',
            actor: 'dto',
            note: notes || `Case registered: ${title}`,
            timestamp: new Date().toISOString()
        }];

        // Save to storage
        await storage.saveCase(caseId, newState);

        // Increment the case number counter
        appMeta.nextCaseNumber++;
        appMeta.activeCaseId = caseId;
        await storage.setAppMeta(appMeta);

        // Load the new case into the app
        _loadStateFromSnapshot(newState);
        renderAll();

        return caseId;
    }

    // ------------------------------------------
    // CASE SWITCHING
    // ------------------------------------------
    // Save current case, load a different one, re-render.

    async function switchCase(caseId) {
        if (caseId === appMeta.activeCaseId) return; // Already active

        // Save current case first (if one is active)
        await saveCurrentNow();

        // Clean up blob URLs from the previous case
        revokeAllFileUrls();

        // Load the new case
        const caseState = await storage.loadCase(caseId);
        if (!caseState) {
            console.error(`Case not found: ${caseId}`);
            return;
        }

        // Update app metadata
        appMeta.activeCaseId = caseId;
        await storage.setAppMeta(appMeta);

        // Load into window.state
        _loadStateFromSnapshot(caseState);
        renderAll();

        console.log(`Switched to case: ${caseId}`);
    }

    // ------------------------------------------
    // AUTO-SAVE (Debounced)
    // ------------------------------------------
    // Called by renderAll() after every state change.
    // Debounced to avoid excessive writes.

    function saveCurrent() {
        if (!appMeta.activeCaseId) return;
        if (!state.caseInfo.id) return;

        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            await saveCurrentNow();
        }, SAVE_DEBOUNCE_MS);
    }

    // Immediate save (used before switching cases or on beforeunload)
    async function saveCurrentNow() {
        if (!appMeta.activeCaseId || !state.caseInfo.id) return;
        try {
            const snapshot = _createSnapshot();
            await storage.saveCase(appMeta.activeCaseId, snapshot);
        } catch (err) {
            console.error('Failed to save case:', err);
        }
    }

    // ------------------------------------------
    // CASE LIST
    // ------------------------------------------
    // Returns summary info for all cases, used by the queue renderer.

    async function getCaseList() {
        const allRecords = await storage.listCases();
        return allRecords.map(record => ({
            id: record.state.caseInfo.id,
            title: record.state.caseInfo.title,
            status: record.state.caseInfo.status,
            priority: record.state.caseInfo.priority,
            dueDate: record.state.caseInfo.dueDate,
            currentHolder: record.state.caseInfo.currentHolder,
            previousHolder: record.state.caseInfo.previousHolder,
            createdAt: record.state.caseInfo.createdAt,
            // For AO queue: check if role has tasks in this case
            assignedAOs: (record.state.tasks || []).map(t => t.assignee)
        }));
    }

    // ------------------------------------------
    // DELETE CASE
    // ------------------------------------------

    async function deleteCurrentCase() {
        if (!appMeta.activeCaseId) return;

        // Delete associated files
        const docs = [...state.documents, ...state.drafts];
        for (const doc of docs) {
            if (doc.fileId) {
                await storage.deleteFile(doc.fileId);
            }
        }

        await storage.deleteCase(appMeta.activeCaseId);
        appMeta.activeCaseId = null;
        await storage.setAppMeta(appMeta);

        // Reset to empty state
        state = getInitialState();
        state.currentRole = appMeta.currentRole || 'dto';
        state.caseInfo.id = null;
        window.state = state;
        renderAll();
    }

    // ------------------------------------------
    // FILE HANDLING
    // ------------------------------------------
    // Store a real file (from <input type="file">) and return
    // a document record ready to add to state.

    async function attachFile(file, uploadedBy) {
        const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        // Store the actual blob in IndexedDB
        await storage.saveFile(fileId, file, {
            name: file.name,
            type: file.type,
            size: file.size
        });

        // Determine the simple type category
        const ext = file.name.split('.').pop().toLowerCase();
        let docType = 'pdf';
        if (['xls', 'xlsx', 'csv'].includes(ext)) docType = 'excel';
        else if (['doc', 'docx'].includes(ext)) docType = 'word';
        else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) docType = 'image';

        // Format file size
        const sizeStr = file.size > 1024 * 1024
            ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
            : (file.size / 1024).toFixed(0) + ' KB';

        const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const docRecord = {
            id: docId,
            name: file.name,
            type: docType,
            size: sizeStr,
            fileId: fileId,          // Reference to the blob in IndexedDB
            content: null,           // No HTML mock content — we use the real file
            uploadedBy: uploadedBy || state.currentRole,
            uploadedAt: dateStr,
            status: 'original',
            viewedBy: [uploadedBy || state.currentRole]
        };

        return { fileId, docRecord };
    }

    // Get a blob URL for viewing a file (creates one if not cached)
    async function getFileUrl(fileId) {
        // Return cached URL if available
        if (blobUrlCache[fileId]) return blobUrlCache[fileId];

        const fileRecord = await storage.getFile(fileId);
        if (!fileRecord || !fileRecord.blob) return null;

        const url = URL.createObjectURL(fileRecord.blob);
        blobUrlCache[fileId] = url;
        return url;
    }

    // Revoke a single blob URL
    function revokeFileUrl(fileId) {
        if (blobUrlCache[fileId]) {
            URL.revokeObjectURL(blobUrlCache[fileId]);
            delete blobUrlCache[fileId];
        }
    }

    // Revoke ALL blob URLs (called on case switch)
    function revokeAllFileUrls() {
        for (const fileId in blobUrlCache) {
            URL.revokeObjectURL(blobUrlCache[fileId]);
        }
        // Clear the cache
        for (const key in blobUrlCache) {
            delete blobUrlCache[key];
        }
    }

    // Download a file from IndexedDB
    async function downloadFile(fileId) {
        const fileRecord = await storage.getFile(fileId);
        if (!fileRecord || !fileRecord.blob) return;

        const url = URL.createObjectURL(fileRecord.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileRecord.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ------------------------------------------
    // UID GENERATION
    // ------------------------------------------

    function generateCaseId() {
        const year = new Date().getFullYear();
        const num = String(appMeta.nextCaseNumber).padStart(4, '0');
        return `CASE-${year}-${num}`;
    }

    // ------------------------------------------
    // ROLE PERSISTENCE
    // ------------------------------------------
    // Called when the user switches roles so we can remember it

    async function persistRole(roleId) {
        appMeta.currentRole = roleId;
        await storage.setAppMeta(appMeta);
    }

    // ------------------------------------------
    // RESET ALL
    // ------------------------------------------
    // Clears everything and starts fresh

    async function resetAll() {
        revokeAllFileUrls();
        await storage.clearAll();
        appMeta = { key: 'appMeta', nextCaseNumber: 1, currentRole: 'dto', activeCaseId: null };

        state = getInitialState();
        state.caseInfo.id = null;
        window.state = state;
        renderAll();
    }

    // ------------------------------------------
    // INTERNAL HELPERS
    // ------------------------------------------

    // Load a case state snapshot into window.state
    function _loadStateFromSnapshot(snapshot) {
        // Preserve the current role (it's app-level, not per-case)
        const currentRole = appMeta.currentRole || state.currentRole;

        // Replace the entire state object
        state = { ...snapshot };
        state.currentRole = currentRole;

        // Update the global reference
        window.state = state;
    }

    // Create a serializable snapshot of the current state
    // (strips anything that can't be saved to IndexedDB)
    function _createSnapshot() {
        const snapshot = { ...state };
        // Don't save the currentRole in the case — it's app-level
        delete snapshot.currentRole;
        return snapshot;
    }

    // Format a date string (ISO -> "Dec 1, 2025")
    function _formatDate(isoStr) {
        const d = new Date(isoStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Format a date string (ISO -> "Monday, December 1, 2025")
    function _formatDateLong(isoStr) {
        const d = new Date(isoStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    // Get the active case ID
    function getActiveCaseId() {
        return appMeta.activeCaseId;
    }

    // Get app meta (for use by other modules)
    function getAppMeta() {
        return appMeta;
    }

    // ------------------------------------------
    // PUBLIC API
    // ------------------------------------------

    return {
        init,
        createCase,
        switchCase,
        saveCurrent,
        saveCurrentNow,
        getCaseList,
        deleteCurrentCase,
        attachFile,
        getFileUrl,
        revokeFileUrl,
        revokeAllFileUrls,
        downloadFile,
        generateCaseId,
        persistRole,
        resetAll,
        getActiveCaseId,
        getAppMeta
    };
})();
