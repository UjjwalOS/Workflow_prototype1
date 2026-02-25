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
    try { renderHeaderRoleSwitcher(); } catch(e) { console.error('renderHeaderRoleSwitcher:', e); }
    try { renderCaseTitle(); } catch(e) { console.error('renderCaseTitle:', e); }
    try { renderActionsDropdown(); } catch(e) { console.error('renderActionsDropdown:', e); }
    if (typeof renderCaseQueue === 'function') {
        try { renderCaseQueue(); } catch(e) { console.error('renderCaseQueue:', e); }
    }
    try { updateTaskTabVisibility(); } catch(e) { console.error('updateTaskTabVisibility:', e); }
    try { renderDocTabs(); } catch(e) { console.error('renderDocTabs:', e); }
    try { renderDocContent(); } catch(e) { console.error('renderDocContent:', e); }
    try { renderOverviewTab(); } catch(e) { console.error('renderOverviewTab:', e); }
    try { renderTaskTab(); } catch(e) { console.error('renderTaskTab:', e); }
    try { renderEventLog(); } catch(e) { console.error('renderEventLog:', e); }
    try { renderDocumentsTab(); } catch(e) { console.error('renderDocumentsTab:', e); }
    try { renderCommentsTab(); } catch(e) { console.error('renderCommentsTab:', e); }
    try { renderNotificationBadge(); } catch(e) { console.error('renderNotificationBadge:', e); }

    // Auto-save the current case to IndexedDB (debounced)
    if (typeof caseManager !== 'undefined') {
        caseManager.saveCurrent();
    }

    // Position the sliding tab indicator after render (no animation loop on initial paint)
    requestAnimationFrame(() => {
        if (typeof updateTabIndicator === 'function') updateTabIndicator(false);
    });
}

// ------------------------------------------
// HEADER - CASE TITLE (dynamic)
// ------------------------------------------
// Updates the header to show the current case title

function renderCaseTitle() {
    const titleEl = document.querySelector('.case-title');
    if (!titleEl) return;

    if (state.caseInfo.id) {
        titleEl.textContent = state.caseInfo.title || 'Untitled Case';
    } else {
        titleEl.textContent = 'IDMS v6';
    }
}

// ------------------------------------------
// HEADER - ROLE SWITCHER
// ------------------------------------------
// Renders the role switcher button and dropdown in the header

function renderHeaderRoleSwitcher() {
    const bar = document.getElementById('persona-bar');
    if (!bar) return;

    const isClosed = state.caseInfo.status === 'closed';

    // Build the list of roles to show:
    // Always show the 4 core roles, plus any extra AOs with delegated tasks
    const coreRoles = Object.values(ROLES);
    const assignedAOIds = getAssignedAOs();
    const extraAOs = assignedAOIds
        .filter(aoId => !ROLES[aoId])
        .map(aoId => getAOInfo(aoId))
        .filter(Boolean);

    const allRoles = [];
    coreRoles.forEach(role => {
        allRoles.push(role);
        if (role.id === 'ao') {
            extraAOs.forEach(ao => allRoles.push(ao));
        }
    });

    // Render avatar circles — one click to switch, always visible
    bar.innerHTML = allRoles.map(role => {
        const isActive = state.currentRole === role.id;
        const hasCase = state.caseInfo.currentHolder === role.id && !isClosed;
        return `
            <div class="persona-avatar-wrapper" title="${role.name} — ${role.roleTitle}">
                <div class="persona-avatar ${isActive ? 'active' : ''}"
                     style="background:${role.color}"
                     onclick="switchRole('${role.id}')">
                    ${role.initials}
                </div>
                ${hasCase ? '<span class="persona-holder-dot"></span>' : ''}
            </div>
        `;
    }).join('');
}

// ------------------------------------------
// HEADER - ACTIONS DROPDOWN
// ------------------------------------------
// Renders role-specific actions in the dropdown

function renderActionsDropdown() {
    const dropdown = document.getElementById('actions-dropdown');
    if (!dropdown) return;

    // No case loaded — hide actions
    if (!state.caseInfo.id) {
        dropdown.innerHTML = '';
        return;
    }

    const role = state.currentRole;
    const isHolder = state.caseInfo.currentHolder === role;
    const isClosed = state.caseInfo.status === 'closed';

    // AO is a special case: they're never the case holder anymore,
    // but they should still see task actions if they have assigned tasks.
    const aoHasTasks = isAORole(role) && state.tasks.some(t => t.assignee === role);

    if (isClosed || (!isHolder && !aoHasTasks)) {
        dropdown.innerHTML = `
            <div class="dropdown-item" style="color:var(--gray-400);cursor:default">
                No actions available
            </div>
        `;
        return;
    }

    let actions = [];
    const showApprovalInDropdown = UI_CONFIG.approvalButtons.showInDropdown && state.caseInfo.pendingAction === 'approve';

    if (role === 'dto') {
        actions = [
            { label: 'Forward Case', icon: 'send', action: 'openSendModal(\'dto-ea\'); closeAllDropdowns();' }
        ];
    } else if (role === 'ea') {
        actions = [
            { label: 'Forward Case', icon: 'send', action: 'openSendModal(\'ea-cs\'); closeAllDropdowns();' }
        ];
    } else if (role === 'cs') {
        // Add approve/reject at the top if approval is pending and dropdown option is enabled
        if (showApprovalInDropdown) {
            actions.push(
                { label: 'Approve Document', icon: 'check_circle', action: 'handleApprove(); closeAllDropdowns();', variant: 'success' },
                { label: 'Reject Document', icon: 'cancel', action: 'handleReject(); closeAllDropdowns();', variant: 'danger' },
                { isDivider: true }
            );
        }

        actions = actions.concat([
            { label: 'Delegate Case', icon: 'person_add', action: 'openDelegateModal(); closeAllDropdowns();' },
            { label: 'Close Case', icon: 'check_circle', action: 'openCloseModal(); closeAllDropdowns();' },
            { label: 'Discard Case', icon: 'cancel', action: 'openSendModal(\'cs-reject\'); closeAllDropdowns();' }
        ]);
    } else if (isAORole(role)) {
        // AO sees task-level actions (they're not the case holder, but they have tasks)
        const myTasks = state.tasks.filter(t => t.assignee === role);
        const hasSubmittableTasks = myTasks.some(t =>
            t.status === TASK_STATUS.IN_PROGRESS || t.status === TASK_STATUS.SENT_BACK
        );
        actions = [
            { label: 'Submit Work', icon: 'upload', action: 'openSendModal(\'ao-cs\'); closeAllDropdowns();', enabled: hasSubmittableTasks }
        ];
    }

    dropdown.innerHTML = actions.map(action => {
        if (action.isDivider) {
            return '<div class="dropdown-divider"></div>';
        }
        return `
            <div class="dropdown-item ${action.enabled === false ? 'disabled' : ''} ${action.variant ? 'dropdown-item-' + action.variant : ''}"
                 onclick="${action.enabled !== false ? action.action : 'return false;'}">
                <span class="material-icons-outlined" style="font-size:18px">${action.icon}</span>
                ${action.label}
            </div>
        `;
    }).join('');
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

    const fromInfo = state.caseInfo.previousHolder
        ? (getAOInfo(state.caseInfo.previousHolder) || ROLES[state.caseInfo.previousHolder])
        : null;
    const from = fromInfo ? fromInfo.name : 'System';

    container.innerHTML = `
        <div class="queue-item active">
            <div class="queue-priority ${state.caseInfo.priority}"></div>
            <div class="queue-content">
                <div class="queue-doc-title">${state.caseInfo.title}</div>
                <div class="queue-doc-meta">${state.caseInfo.id} • From: ${from}</div>
                ${(() => {
                    const qDl = getDeadlineIndicator(state.caseInfo.dueDateDisplay || state.caseInfo.dueDate, state.caseInfo.dueDateISO);
                    return `<div class="queue-status ${qDl.show ? qDl.cssClass : ''}" ${qDl.show ? `title="${qDl.tooltip}"` : ''}>
                        <span class="material-icons-outlined" style="font-size:12px">${qDl.show ? qDl.icon : 'schedule'}</span>
                        ${qDl.show && qDl.daysLeft < 0 ? qDl.tooltip : 'Due ' + state.caseInfo.dueDate}
                    </div>`;
                })()}
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
    // AO with tasks should not see "viewing mode"
    const aoHasWork = isAORole(state.currentRole) && state.tasks.some(t => t.assignee === state.currentRole);

    if (isClosed || (!isHolder && !aoHasWork)) {
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
    if (!state.caseInfo.id) { container.innerHTML = ''; return; }
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
    const docBody = container.parentElement; // .doc-body

    // Reset the full-bleed mode (used for PDFs/images)
    container.classList.remove('doc-page--full');
    docBody.style.overflow = '';  // restore default scrollbar

    // No case loaded — show empty state
    if (!state.caseInfo.id) {
        if (typeof renderMainEmptyState === 'function') {
            renderMainEmptyState();
        }
        return;
    }

    const doc = findDocument(state.selectedDocId);

    if (!doc) {
        // No document selected
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:60px">
                <span class="material-icons-outlined" style="font-size:48px;color:var(--gray-300);margin-bottom:12px">description</span>
                <p style="color:var(--gray-500);font-size:14px">Select a document to view</p>
            </div>
        `;
        return;
    }

    // If the doc has a real file in IndexedDB, render it
    if (doc.fileId && typeof caseManager !== 'undefined') {
        renderRealDocument(container, doc);
        return;
    }

    // Legacy path: HTML mock content
    if (doc.content) {
        container.innerHTML = doc.content;
        return;
    }

    // Document exists but has no content and no file
    const uploaderInfo = getAOInfo(doc.uploadedBy) || ROLES[doc.uploadedBy] || { name: 'Unknown' };
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:60px">
            <span class="material-icons-outlined" style="font-size:64px;color:var(--gray-300);margin-bottom:16px">description</span>
            <h2 style="font-size:20px;font-weight:600;color:var(--gray-900);margin-bottom:8px">${doc.name}</h2>
            <p style="color:var(--gray-500);margin-bottom:24px">${doc.size || ''} ${uploaderInfo.name ? '• Uploaded by ' + uploaderInfo.name : ''}</p>
        </div>
    `;
}

// Render a real file from IndexedDB (PDF, image, or download card)
async function renderRealDocument(container, doc) {
    const docBody = container.parentElement; // .doc-body

    // Show a loading indicator briefly
    container.classList.remove('doc-page--full');
    docBody.style.overflow = '';  // reset to default (auto)
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%">
            <span class="material-icons-outlined" style="font-size:24px;color:var(--gray-400)">hourglass_top</span>
        </div>
    `;

    const url = await caseManager.getFileUrl(doc.fileId);
    if (!url) {
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:60px">
                <span class="material-icons-outlined" style="font-size:48px;color:var(--danger);margin-bottom:12px">error_outline</span>
                <p style="color:var(--gray-600)">Failed to load file</p>
            </div>
        `;
        return;
    }

    if (doc.type === 'pdf') {
        // PDF: fill the entire viewer area (remove doc-page padding/max-width)
        // Hide outer scrollbar so only the PDF iframe's scrollbar shows
        container.classList.add('doc-page--full');
        docBody.style.overflow = 'hidden';
        container.innerHTML = `
            <iframe src="${url}" style="width:100%;height:100%;border:none;background:white" title="${doc.name}"></iframe>
        `;
    } else if (doc.type === 'image') {
        // Image: fill the viewer area, hide outer scrollbar
        container.classList.add('doc-page--full');
        docBody.style.overflow = 'hidden';
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:20px;background:var(--gray-100)">
                <img src="${url}" alt="${doc.name}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            </div>
        `;
    } else {
        // Word, Excel, etc. — show a download card
        const uploaderInfo = getAOInfo(doc.uploadedBy) || ROLES[doc.uploadedBy] || { name: 'Unknown' };
        const typeIcons = { excel: 'table_chart', word: 'description', pdf: 'picture_as_pdf' };
        const icon = typeIcons[doc.type] || 'insert_drive_file';

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:60px">
                <span class="material-icons-outlined" style="font-size:64px;color:var(--primary);margin-bottom:16px">${icon}</span>
                <h2 style="font-size:20px;font-weight:600;color:var(--gray-900);margin-bottom:8px">${doc.name}</h2>
                <p style="color:var(--gray-500);margin-bottom:24px">${doc.size} • Uploaded by ${uploaderInfo.name}</p>
                <button class="btn btn-primary" onclick="caseManager.downloadFile('${doc.fileId}')">
                    <span class="material-icons-outlined" style="font-size:18px">download</span>
                    Download to view
                </button>
            </div>
        `;
    }
}

// ------------------------------------------
// DETAILS TAB CONTENT
// ------------------------------------------
// The main details panel with status, tasks, comments, etc.

function renderOverviewTab() {
    const container = document.getElementById('overview-tab');
    if (!state.caseInfo.id) { container.innerHTML = ''; return; }
    const holderInfo = getAOInfo(state.caseInfo.currentHolder) || ROLES[state.caseInfo.currentHolder];
    const isMe = state.caseInfo.currentHolder === state.currentRole;
    const isClosed = state.caseInfo.status === 'closed';
    // For AO roles (ao2, ao3), fall back to the base 'ao' config
    const roleConfig = ROLE_CONFIG[state.currentRole] || (isAORole(state.currentRole) ? ROLE_CONFIG['ao'] : null);

    let html = '';

    // Viewing mode indicator for non-holders
    // AO with assigned tasks should NOT see this — they're actively working
    const aoHasWork = isAORole(state.currentRole) && state.tasks.some(t => t.assignee === state.currentRole);
    if (!isMe && !isClosed && !aoHasWork) {
        const currentRoleInfo = getAOInfo(state.currentRole) || ROLES[state.currentRole];
        html += `
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:linear-gradient(135deg,var(--gray-100) 0%,var(--gray-50) 100%);border:1px dashed var(--gray-300);border-radius:var(--radius-md);margin-bottom:12px;font-size:12px;color:var(--gray-600)">
                <span class="material-icons-outlined" style="font-size:16px;color:var(--gray-400)">visibility</span>
                <span>Viewing as <strong>${currentRoleInfo.roleTitle}</strong> • Case is with ${holderInfo.name}</span>
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
            <div class="holder-avatar" style="background:${holderInfo.color}">${holderInfo.initials}</div>
            <div style="flex:1">
                <div class="holder-label">Currently With</div>
                <div class="holder-name">${holderInfo.name}</div>
                <div class="holder-role">${holderInfo.roleTitle}</div>
            </div>
            ${isMe && !isClosed ? '<span class="holder-you-badge">YOU</span>' : ''}
            <span class="holder-hint">
                <span class="material-icons-outlined" style="font-size:14px">history</span>
                View history
            </span>
        </div>
    `;

    // Status Card
    // Deadline indicator (Linear-style 3-state: overdue/soon/normal)
    const caseDl = getDeadlineIndicator(state.caseInfo.dueDateDisplay, state.caseInfo.dueDateISO);
    const deadlineClass = caseDl.cssClass === 'deadline-overdue' ? 'danger'
                        : caseDl.cssClass === 'deadline-soon' ? 'warning'
                        : '';
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
                        ${deadlineClass === 'danger' ? `<span class="deadline-warning">${caseDl.tooltip}</span>` : ''}
                        ${deadlineClass === 'warning' ? `<span class="deadline-warning warning">${caseDl.tooltip}</span>` : ''}
                        <span class="material-icons-outlined edit-icon">edit</span>
                        <div class="due-date-picker" id="due-date-picker">
                            <input type="date" id="due-date-input" onchange="changeDueDate(this.value)">
                        </div>
                    </div>
                ` : `
                    <span class="status-value ${deadlineClass ? 'deadline-' + deadlineClass : ''}">
                        ${state.caseInfo.dueDateDisplay}
                        ${deadlineClass === 'danger' ? `<span class="deadline-warning">${caseDl.tooltip}</span>` : ''}
                        ${deadlineClass === 'warning' ? `<span class="deadline-warning warning">${caseDl.tooltip}</span>` : ''}
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

// ------------------------------------------
// TASK TAB VISIBILITY
// ------------------------------------------
// CS and AO always see the Task tab.
// DTO and EA only see it when tasks exist (tasks > 0).
// This avoids showing an empty "No tasks" state to roles
// that don't interact with tasks until work has been delegated.

function updateTaskTabVisibility() {
    const taskTabBtn = document.querySelector('.panel-tab[data-tab="task"]');
    if (!taskTabBtn) return;

    const role = state.currentRole;
    const hasTasks = state.tasks && state.tasks.length > 0;

    // CS and AO always see the Task tab
    if (role === 'cs' || isAORole(role)) {
        taskTabBtn.style.display = '';
        return;
    }

    // DTO and EA: only show when tasks exist
    if (hasTasks) {
        taskTabBtn.style.display = '';
    } else {
        taskTabBtn.style.display = 'none';
        // If they were on the task tab, switch to overview
        if (state.activeTab === 'task') {
            switchTab('overview');
        }
    }
}

// Make functions globally available
window.renderAll = renderAll;
window.renderHeaderRoleSwitcher = renderHeaderRoleSwitcher;
window.renderActionsDropdown = renderActionsDropdown;
window.renderQueue = renderQueue;
window.renderDocTabs = renderDocTabs;
window.renderDocContent = renderDocContent;
window.renderOverviewTab = renderOverviewTab;
window.updateTaskTabVisibility = updateTaskTabVisibility;
