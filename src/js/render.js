/*
 * =============================================
 * RENDERING FUNCTIONS
 * =============================================
 *
 * These functions take the state and create HTML to display.
 * Each function handles one part of the UI.
 *
 * The main function is renderAll() which calls all the others.
 */

// ------------------------------------------
// MAIN RENDER FUNCTION
// ------------------------------------------
// Call this after any state change to update the entire UI

function renderAll() {
    renderRoles();
    renderQueue();
    renderQuickActions();
    renderDocTabs();
    renderDocContent();
    renderDetailsTab();
    renderEventLog();
    renderDocumentsTab();
    renderActionBar();
}

// ------------------------------------------
// ROLE SELECTOR (Left sidebar)
// ------------------------------------------
// Shows the role avatars for switching between different users

function renderRoles() {
    const container = document.getElementById('role-selector');
    container.innerHTML = Object.values(ROLES).map(role => {
        const isActive = state.currentRole === role.id;
        const hasCase = state.caseInfo.currentHolder === role.id && state.caseInfo.status === 'active';
        return `
            <div class="role-avatar-btn tooltip ${isActive ? 'active' : ''}"
                 style="background:${role.color}"
                 onclick="switchRole('${role.id}')"
                 data-tooltip="${role.name}">
                ${role.initials}
                ${hasCase ? '<span class="role-badge">1</span>' : ''}
            </div>
        `;
    }).join('');

    // Update current role display
    const currentRole = ROLES[state.currentRole];
    document.getElementById('current-role-info').innerHTML = `
        <div class="current-role-avatar" style="background:${currentRole.color}">${currentRole.initials}</div>
        <div>
            <div class="current-role-name">${currentRole.name}</div>
            <div class="current-role-title">${currentRole.title}</div>
        </div>
    `;
}

// ------------------------------------------
// QUEUE (Left sidebar - case list)
// ------------------------------------------
// Shows cases waiting for attention

function renderQueue() {
    const container = document.getElementById('document-queue');
    const isHolder = state.caseInfo.currentHolder === state.currentRole;
    const isClosed = state.caseInfo.status === 'closed';

    if (!isHolder || isClosed) {
        container.innerHTML = `
            <div class="queue-empty">
                <div class="queue-empty-icon">📭</div>
                <p>${isClosed ? 'Case closed' : 'No cases in queue'}</p>
            </div>
        `;
        return;
    }

    const from = state.caseInfo.previousHolder
        ? ROLES[state.caseInfo.previousHolder].name
        : 'System';

    container.innerHTML = `
        <div class="queue-item active">
            <div class="queue-priority ${state.caseInfo.priority}"></div>
            <div class="queue-content">
                <div class="queue-doc-title">${state.caseInfo.title}</div>
                <div class="queue-doc-meta">${state.caseInfo.id} • From: ${from}</div>
                <div class="queue-status">
                    <span class="material-icons-outlined" style="font-size:12px">schedule</span>
                    Due ${state.caseInfo.dueDate}
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------
// QUICK ACTIONS (Top of details panel)
// ------------------------------------------

function renderQuickActions() {
    const container = document.getElementById('quick-actions');
    const isHolder = state.caseInfo.currentHolder === state.currentRole;
    const isClosed = state.caseInfo.status === 'closed';

    if (!isHolder || isClosed) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--gray-50);border-radius:var(--radius-md);color:var(--gray-500);font-size:12px">
                <span class="material-icons-outlined" style="font-size:16px">visibility</span>
                Viewing mode • Actions available when assigned to you
            </div>
        `;
        return;
    }

    container.innerHTML = '';
}

// ------------------------------------------
// DOCUMENT TABS (In document viewer)
// ------------------------------------------

function renderDocTabs() {
    const container = document.getElementById('doc-tabs');
    const visibleDocs = getVisibleDocuments();
    container.innerHTML = visibleDocs.map(doc => `
        <button class="doc-tab ${doc.id === state.selectedDocId ? 'active' : ''}"
                onclick="selectDoc('${doc.id}')">
            ${doc.name.length > 25 ? doc.name.substring(0, 22) + '...' : doc.name}
        </button>
    `).join('');
}

// ------------------------------------------
// DOCUMENT CONTENT (Main viewer area)
// ------------------------------------------

function renderDocContent() {
    const container = document.getElementById('doc-page-content');
    const doc = findDocument(state.selectedDocId);

    if (doc && doc.content) {
        container.innerHTML = doc.content;
    } else if (doc) {
        // Document exists but has no preview content
        const docTypeIcons = { pdf: '📄', excel: '📊', word: '📝' };
        const uploader = ROLES[doc.uploadedBy];
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:60px">
                <div style="font-size:72px;margin-bottom:24px">${docTypeIcons[doc.type] || '📄'}</div>
                <h2 style="font-size:24px;font-weight:600;color:var(--gray-900);margin-bottom:8px">${doc.name}</h2>
                <p style="color:var(--gray-500);margin-bottom:24px">${doc.size} • Uploaded by ${uploader.name}</p>
                <div style="background:var(--gray-100);border-radius:12px;padding:24px 32px;max-width:400px">
                    <p style="color:var(--gray-600);font-size:14px">
                        This document is available for download. Click the download button above to view the full content.
                    </p>
                </div>
            </div>
        `;
    }
}

// ------------------------------------------
// DETAILS TAB CONTENT
// ------------------------------------------
// The main details panel with status, tasks, comments, etc.

function renderDetailsTab() {
    const container = document.getElementById('details-tab');
    const holder = ROLES[state.caseInfo.currentHolder];
    const isMe = state.caseInfo.currentHolder === state.currentRole;
    const isClosed = state.caseInfo.status === 'closed';
    const roleConfig = ROLE_CONFIG[state.currentRole];

    let html = '';

    // Viewing mode indicator for non-holders
    if (!isMe && !isClosed) {
        html += `
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:linear-gradient(135deg,var(--gray-100) 0%,var(--gray-50) 100%);border:1px dashed var(--gray-300);border-radius:var(--radius-md);margin-bottom:12px;font-size:12px;color:var(--gray-600)">
                <span class="material-icons-outlined" style="font-size:16px;color:var(--gray-400)">visibility</span>
                <span>Viewing as <strong>${ROLES[state.currentRole].title}</strong> • Case is with ${holder.name}</span>
            </div>
        `;
    }

    // Status banners
    if (isClosed) {
        html += `
            <div class="banner-closed">
                <span class="material-icons-outlined">verified</span>
                <h3>Case Closed</h3>
                <p>This case has been completed.</p>
            </div>
        `;
    } else if (state.caseInfo.pendingAction && isMe) {
        html += renderPendingBanner();
    }

    // Currently With card
    html += `
        <div class="current-holder" onclick="goToEventLog()">
            <div class="holder-avatar" style="background:${holder.color}">${holder.initials}</div>
            <div style="flex:1">
                <div class="holder-label">Currently With</div>
                <div class="holder-name">${holder.name}</div>
                <div class="holder-role">${holder.title}</div>
            </div>
            ${isMe && !isClosed ? '<span class="holder-you-badge">YOU</span>' : ''}
            <span class="holder-hint">
                <span class="material-icons-outlined" style="font-size:14px">history</span>
                View history
            </span>
        </div>
    `;

    // Status Card
    const daysRemaining = getDaysRemaining(state.caseInfo.dueDate);
    const deadlineClass = daysRemaining <= 1 ? 'danger' : daysRemaining <= 3 ? 'warning' : '';
    const canChangePriority = state.currentRole === 'cs' && isMe && !isClosed;
    // EA and CS can change due date when they are the current holder
    const canChangeDueDate = (state.currentRole === 'cs' || state.currentRole === 'ea') && isMe && !isClosed;

    html += `
        <div class="status-card">
            <div class="status-row">
                <span class="status-label">Priority</span>
                ${canChangePriority ? `
                    <div class="priority-dropdown" onclick="togglePriorityDropdown(event)">
                        <span class="priority-badge ${state.caseInfo.priority}">
                            <span class="priority-dot"></span>
                            ${state.caseInfo.priority.charAt(0).toUpperCase() + state.caseInfo.priority.slice(1)}
                            <span class="material-icons-outlined" style="font-size:14px;margin-left:4px">expand_more</span>
                        </span>
                        <div class="priority-options" id="priority-options">
                            <div class="priority-option ${state.caseInfo.priority === 'high' ? 'active' : ''}" onclick="changePriority('high')">
                                <span class="priority-badge high"><span class="priority-dot"></span>High</span>
                            </div>
                            <div class="priority-option ${state.caseInfo.priority === 'medium' ? 'active' : ''}" onclick="changePriority('medium')">
                                <span class="priority-badge medium"><span class="priority-dot"></span>Medium</span>
                            </div>
                            <div class="priority-option ${state.caseInfo.priority === 'low' ? 'active' : ''}" onclick="changePriority('low')">
                                <span class="priority-badge low"><span class="priority-dot"></span>Low</span>
                            </div>
                        </div>
                    </div>
                ` : `
                    <span class="priority-badge ${state.caseInfo.priority}">
                        <span class="priority-dot"></span>
                        ${state.caseInfo.priority.charAt(0).toUpperCase() + state.caseInfo.priority.slice(1)}
                    </span>
                `}
            </div>
            <div class="status-row">
                <span class="status-label">Due Date</span>
                ${canChangeDueDate ? `
                    <div class="due-date-editable" onclick="toggleDueDatePicker(event)">
                        <span class="status-value ${deadlineClass ? 'deadline-' + deadlineClass : ''}">
                            ${state.caseInfo.dueDateDisplay}
                        </span>
                        ${deadlineClass === 'danger' ? '<span class="deadline-warning">⚠ Due Today!</span>' : ''}
                        ${deadlineClass === 'warning' ? '<span class="deadline-warning warning">⏰ ' + daysRemaining + ' days left</span>' : ''}
                        <span class="material-icons-outlined edit-icon">edit</span>
                        <div class="due-date-picker" id="due-date-picker">
                            <input type="date" id="due-date-input" onchange="changeDueDate(this.value)">
                        </div>
                    </div>
                ` : `
                    <span class="status-value ${deadlineClass ? 'deadline-' + deadlineClass : ''}">
                        ${state.caseInfo.dueDateDisplay}
                        ${deadlineClass === 'danger' ? '<span class="deadline-warning">⚠ Due Today!</span>' : ''}
                        ${deadlineClass === 'warning' ? '<span class="deadline-warning warning">⏰ ' + daysRemaining + ' days left</span>' : ''}
                    </span>
                `}
            </div>
            <div class="status-row">
                <span class="status-label">Created</span>
                <span class="status-value">${state.caseInfo.createdAt}</span>
            </div>
        </div>
    `;

    // AI Summary
    html += renderAISummary();

    // Comments Section
    html += renderCommentsSection();

    // Action Items Section
    html += renderActionItemsSection();

    // Documents Section
    html += renderDocumentsSection();

    container.innerHTML = html;
}

// Make functions globally available
window.renderAll = renderAll;
window.renderRoles = renderRoles;
window.renderQueue = renderQueue;
window.renderQuickActions = renderQuickActions;
window.renderDocTabs = renderDocTabs;
window.renderDocContent = renderDocContent;
window.renderDetailsTab = renderDetailsTab;
