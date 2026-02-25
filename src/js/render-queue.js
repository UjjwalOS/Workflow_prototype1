/*
 * =============================================
 * RENDER QUEUE - Multi-Case Sidebar
 * =============================================
 *
 * Renders the left sidebar showing all cases in the user's queue.
 * Cases are filtered by the current role — you only see cases
 * assigned to you (or cases where you have tasks, for AOs).
 */

// ------------------------------------------
// MAIN QUEUE RENDER
// ------------------------------------------
// Called by renderAll() to update the sidebar

async function renderCaseQueue() {
    const container = document.getElementById('case-queue');
    if (!container) return; // Sidebar not in DOM yet

    // Get all cases from storage
    let cases = [];
    if (typeof caseManager !== 'undefined') {
        cases = await caseManager.getCaseList();
    }

    const currentRole = state.currentRole;
    const activeCaseId = typeof caseManager !== 'undefined' ? caseManager.getActiveCaseId() : null;

    // Filter: show cases where currentHolder matches the role,
    // OR for AO roles, show cases where they have assigned tasks
    const myCases = cases.filter(c => {
        if (c.currentHolder === currentRole) return true;
        if (isAORole(currentRole) && c.assignedAOs.includes(currentRole)) return true;
        return false;
    });

    // Also show "all other cases" for visibility
    const otherCases = cases.filter(c => !myCases.includes(c));

    // Build the HTML
    let html = '';

    // Register button (DTO only)
    if (currentRole === 'dto') {
        html += `
            <button class="queue-register-btn" onclick="openRegisterCaseModal()">
                <span class="material-icons-outlined" style="font-size:18px">add</span>
                Register Case
            </button>
        `;
    }

    // My Queue section
    html += `<div class="queue-section-title">My Queue (${myCases.length})</div>`;

    if (myCases.length === 0) {
        html += `
            <div class="queue-empty">
                <div class="queue-empty-icon">
                    <span class="material-icons-outlined" style="font-size:32px;color:var(--gray-300)">inbox</span>
                </div>
                <p>No cases in your queue</p>
            </div>
        `;
    } else {
        html += myCases.map(c => _renderQueueCard(c, activeCaseId)).join('');
    }

    // Other cases section (if any)
    if (otherCases.length > 0) {
        html += `<div class="queue-section-title" style="margin-top:16px">Other Cases (${otherCases.length})</div>`;
        html += otherCases.map(c => _renderQueueCard(c, activeCaseId)).join('');
    }

    container.innerHTML = html;
}

// ------------------------------------------
// EMPTY STATE (no cases exist at all)
// ------------------------------------------
// Shows a full-page empty state when the app has no data

function renderMainEmptyState() {
    const docContent = document.getElementById('doc-page-content');
    if (!docContent) return;

    const isDTO = state.currentRole === 'dto';

    docContent.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:60px">
            <span class="material-icons-outlined" style="font-size:64px;color:var(--gray-300);margin-bottom:16px">folder_open</span>
            <h2 style="font-size:20px;font-weight:600;color:var(--gray-700);margin-bottom:8px">No case selected</h2>
            <p style="color:var(--gray-500);font-size:14px;max-width:300px;margin-bottom:24px">
                ${isDTO
                    ? 'Register your first case to get started with the workflow.'
                    : 'Switch to DTO role to register a new case, or wait for cases to be assigned to you.'}
            </p>
            ${isDTO ? `
                <button class="btn btn-primary" onclick="openRegisterCaseModal()">
                    <span class="material-icons-outlined" style="font-size:18px">add</span>
                    Register Case
                </button>
            ` : ''}
        </div>
    `;
}

// ------------------------------------------
// HELPER: Render a single queue card
// ------------------------------------------

function _renderQueueCard(caseData, activeCaseId) {
    const isActive = caseData.id === activeCaseId;
    const isClosed = caseData.status === 'closed';

    // Get "from" info
    const fromInfo = caseData.previousHolder
        ? (getAOInfo(caseData.previousHolder) || ROLES[caseData.previousHolder])
        : null;
    const from = fromInfo ? fromInfo.name : 'System';

    return `
        <div class="queue-item ${isActive ? 'active' : ''} ${isClosed ? 'closed' : ''}"
             onclick="caseManager.switchCase('${caseData.id}')">
            <div class="queue-priority ${caseData.priority}"></div>
            <div class="queue-content">
                <div class="queue-doc-title">${caseData.title}</div>
                <div class="queue-doc-meta">${caseData.id} • From: ${from}</div>
                ${caseData.dueDate && caseData.dueDate !== 'Not set' ? (() => {
                    const qDl = getDeadlineIndicator(caseData.dueDateDisplay || caseData.dueDate, caseData.dueDateISO);
                    return `<div class="queue-status ${qDl.show ? qDl.cssClass : ''}" ${qDl.show ? `title="${qDl.tooltip}"` : ''}>
                        <span class="material-icons-outlined" style="font-size:12px">${qDl.show ? qDl.icon : 'schedule'}</span>
                        ${qDl.show && qDl.daysLeft < 0 ? qDl.tooltip : 'Due ' + caseData.dueDate}
                    </div>`;
                })() : ''}
            </div>
        </div>
    `;
}

// Make functions globally available
window.renderCaseQueue = renderCaseQueue;
window.renderMainEmptyState = renderMainEmptyState;
