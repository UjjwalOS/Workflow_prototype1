/*
 * =============================================
 * TASK RENDERING
 * =============================================
 *
 * All rendering functions for the new task system:
 * - Task Tab (list of tasks for CS and AO)
 * - Task Detail panel (inline, replaces tab content)
 * - Task cards in Overview tab
 * - Delegate modal content
 *
 * This file handles HOW things look.
 * For task ACTIONS (submit, approve, etc), see task-actions.js
 */

// ------------------------------------------
// TASK TAB (main entry point)
// ------------------------------------------
// Shows different views based on role:
// - CS: Per-AO summary cards, then drill into task list
// - AO: List of your assigned tasks
// - DTO/EA: Empty state or hidden

function renderTaskTab() {
    const container = document.getElementById('task-tab');
    if (!container) return;
    if (!state.caseInfo.id) { container.innerHTML = ''; return; }

    const role = state.currentRole;

    const roleConfig = ROLE_CONFIG[role] || {};
    const taskView = roleConfig.taskView || 'readonly';

    // No tasks exist yet
    if (state.tasks.length === 0) {
        let emptyMsg = 'Tasks will appear here when assigned to you.';
        if (role === 'cs') {
            emptyMsg = 'Use the Actions menu to delegate tasks to Action Officers.';
        } else if (taskView === 'readonly') {
            emptyMsg = 'Tasks will appear here when the Chief Secretary delegates work.';
        }
        container.innerHTML = `
            <div class="task-empty-state">
                <span class="material-icons-outlined" style="font-size:48px;color:var(--gray-300)">assignment</span>
                <p style="color:var(--gray-500);margin-top:12px;font-size:14px">No tasks delegated yet</p>
                <p style="color:var(--gray-400);font-size:12px;margin-top:4px">${emptyMsg}</p>
            </div>
        `;
        return;
    }

    if (role === 'cs') {
        container.innerHTML = renderCSTaskTab();
    } else if (isAORole(role)) {
        container.innerHTML = renderAOTaskTab();
    } else {
        // DTO and EA: same layout as CS, but read-only (no menus, no actions)
        container.innerHTML = renderReadonlyTaskTab();
    }

    // Update the task detail overlay (shown/hidden based on selectedTaskId)
    renderTaskDetailOverlay();
}

// ------------------------------------------
// TASK DETAIL OVERLAY
// ------------------------------------------
// Shows/hides the overlay that covers the entire details panel.
// Called from renderTaskTab() and from openTaskDetail/closeTaskDetail.

function renderTaskDetailOverlay() {
    const overlay = document.getElementById('task-detail-overlay');
    if (!overlay) return;

    if (state.selectedTaskId) {
        overlay.innerHTML = renderTaskDetail(state.selectedTaskId);
        overlay.classList.add('active');
        overlay.scrollTop = 0;
    } else {
        overlay.classList.remove('active');
    }
}

// ------------------------------------------
// CS TASK TAB
// ------------------------------------------
// Shows all tasks grouped by AO, with status icons

function renderCSTaskTab() {
    const assignedAOs = getAssignedAOs();
    const activeFilter = state.taskFilterAO;

    // Get filtered tasks
    const filteredTasks = activeFilter
        ? getTasksForAO(activeFilter)
        : state.tasks;

    let html = '';

    // Filter chips go directly at top (no header)

    // Filter chips — "All" + one per AO
    html += `<div class="task-filter-chips">`;
    html += `
        <button class="task-filter-chip ${!activeFilter ? 'active' : ''}"
                onclick="setTaskFilter(null)">
            All
        </button>
    `;
    assignedAOs.forEach(aoId => {
        const aoInfo = getAOInfo(aoId);
        if (!aoInfo) return;
        const isActive = activeFilter === aoId;
        html += `
            <button class="task-filter-chip ${isActive ? 'active' : ''}"
                    onclick="setTaskFilter('${aoId}')">
                <span class="task-filter-chip-avatar" style="background:${aoInfo.color}">${aoInfo.initials}</span>
                ${aoInfo.name}
            </button>
        `;
    });
    html += `</div>`;

    // Flat task list
    if (filteredTasks.length === 0) {
        const aoName = activeFilter ? (getAOInfo(activeFilter)?.name || 'this officer') : '';
        html += `
            <div class="task-empty-state">
                <span class="material-icons-outlined" style="font-size:40px;color:var(--gray-300)">assignment</span>
                <p style="color:var(--gray-500);margin-top:12px;font-size:13px">No tasks ${activeFilter ? `assigned to ${aoName}` : 'delegated yet'}</p>
            </div>
        `;
    } else {
        html += `<div class="task-list">`;
        filteredTasks.forEach(task => {
            html += renderTaskCard(task, 'cs');
        });
        html += `</div>`;
    }

    return html;
}

// Set the AO filter for the CS Task Tab
function setTaskFilter(aoId) {
    state.taskFilterAO = aoId;
    renderTaskTab();
}

// Navigate from Overview to Task tab with a specific AO filter
function filterTasksByAO(aoId) {
    state.taskFilterAO = aoId;
    switchTab('task');
}

// ------------------------------------------
// AO TASK TAB
// ------------------------------------------
// Shows tasks assigned to the current AO

function renderAOTaskTab() {
    const myTasks = getTasksForAO(state.currentRole);
    let html = '';

    // No header — task list starts directly

    if (myTasks.length === 0) {
        html += `
            <div class="task-empty-state">
                <span class="material-icons-outlined" style="font-size:48px;color:var(--gray-300)">task_alt</span>
                <p style="color:var(--gray-500);margin-top:12px">No tasks assigned to you</p>
            </div>
        `;
        return html;
    }

    html += `<div class="task-list">`;
    myTasks.forEach(task => {
        html += renderTaskCard(task, state.currentRole);
    });
    html += `</div>`;

    return html;
}

// ------------------------------------------
// READONLY TASK TAB (DTO, EA)
// ------------------------------------------
// Same layout as CS — filter chips + flat task list — but no menus or actions.

function renderReadonlyTaskTab() {
    const assignedAOs = getAssignedAOs();
    const activeFilter = state.taskFilterAO;

    const filteredTasks = activeFilter
        ? getTasksForAO(activeFilter)
        : state.tasks;

    let html = '';

    // "View only" banner
    html += `
        <div class="task-readonly-banner">
            <span class="material-icons-outlined" style="font-size:16px">visibility</span>
            View only — tasks are managed by CS and Action Officers
        </div>
    `;

    // Filter chips — same as CS view
    html += `<div class="task-filter-chips">`;
    html += `
        <button class="task-filter-chip ${!activeFilter ? 'active' : ''}"
                onclick="setTaskFilter(null)">
            All
        </button>
    `;
    assignedAOs.forEach(aoId => {
        const aoInfo = getAOInfo(aoId);
        if (!aoInfo) return;
        const isActive = activeFilter === aoId;
        html += `
            <button class="task-filter-chip ${isActive ? 'active' : ''}"
                    onclick="setTaskFilter('${aoId}')">
                <span class="task-filter-chip-avatar" style="background:${aoInfo.color}">${aoInfo.initials}</span>
                ${aoInfo.name}
            </button>
        `;
    });
    html += `</div>`;

    // Task list — same as CS but with 'readonly' viewRole
    if (filteredTasks.length === 0) {
        const aoName = activeFilter ? (getAOInfo(activeFilter)?.name || 'this officer') : '';
        html += `
            <div class="task-empty-state">
                <span class="material-icons-outlined" style="font-size:40px;color:var(--gray-300)">assignment</span>
                <p style="color:var(--gray-500);margin-top:12px;font-size:13px">No tasks ${activeFilter ? `assigned to ${aoName}` : 'delegated yet'}</p>
            </div>
        `;
    } else {
        html += `<div class="task-list">`;
        filteredTasks.forEach(task => {
            html += renderTaskCard(task, 'readonly');
        });
        html += `</div>`;
    }

    return html;
}

// ------------------------------------------
// TASK STATUS ICON (shared helper)
// ------------------------------------------
// Returns consistent MUI icon HTML for any task status.
// Used by all task card variants and detail views.

function getTaskStatusIcon(status, size) {
    size = size || 20;
    const cfg = TASK_STATUS_CONFIG[status] || TASK_STATUS_CONFIG.in_progress;
    return `<span class="material-icons-outlined" title="${cfg.label}" style="font-size:${size}px;color:${cfg.color}">${cfg.icon}</span>`;
}

// ------------------------------------------
// TASK CARD (v2 — unified for all roles)
// ------------------------------------------
// Used in Task Tab (CS & AO) and AO Overview.
// CS: icon + title + three-dot menu + assignee avatar
// AO: icon + title + status badge (no menu)

function renderTaskCard(task, viewRole) {
    const aoInfo = getAOInfo(task.assignee);
    const isCS = viewRole === 'cs';
    const isReadonly = viewRole === 'readonly';
    const isCancelled = task.status === 'cancelled';

    // Right element: CS/readonly sees assignee avatar; AO sees status badge
    let rightElement = '';
    if ((isCS || isReadonly) && aoInfo) {
        rightElement = `<span class="task-card-v2-assignee" style="background:${aoInfo.color}" title="${aoInfo.name}">${aoInfo.initials}</span>`;
    } else if (!isCS && !isReadonly) {
        const statusConfig = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.in_progress;
        const label = (viewRole === 'cs' && statusConfig.labelCS) ? statusConfig.labelCS : statusConfig.label;
        rightElement = `<span class="task-card-v2-badge" style="background:${statusConfig.bgColor};color:${statusConfig.color}">${label}</span>`;
    }

    // Three-dot menu: only for CS, and not for cancelled tasks (readonly has no menu)
    let menuHtml = '';
    if (isCS && !isCancelled) {
        const isMenuOpen = state.openTaskMenuId === task.id;
        menuHtml = `
            <div class="task-card-v2-menu-wrapper">
                <button class="task-card-v2-menu" onclick="event.stopPropagation(); toggleTaskMenu('${task.id}')" title="More options">
                    <span class="material-icons-outlined">more_vert</span>
                </button>
                ${isMenuOpen ? renderTaskMenuDropdown(task) : ''}
            </div>
        `;
    }

    // Deadline indicator (Linear-style: icon-only on cards)
    const dl = getDeadlineIndicator(task.deadline, task.deadlineISO);
    const deadlineIconHtml = dl.show
        ? `<span class="material-icons-outlined task-deadline-icon ${dl.cssClass}" title="${dl.tooltip}" style="font-size:16px">${dl.icon}</span>`
        : '';

    return `
        <div class="task-card-v2 ${isCancelled ? 'cancelled' : ''}" onclick="openTaskDetail('${task.id}')">
            <div class="task-card-v2-top">
                <div class="task-card-v2-icon">${getTaskStatusIcon(task.status)}</div>
                <div class="task-card-v2-body">
                    <div class="task-card-v2-title ${isCancelled ? 'cancelled' : task.status === 'completed' ? 'completed' : ''}">${task.title}</div>
                </div>
                ${menuHtml}
            </div>
            <div class="task-card-v2-bottom">
                <span class="task-card-v2-detail">See detail <span class="material-icons-outlined" style="font-size:14px">chevron_right</span></span>
                <div style="display:flex;align-items:center;gap:8px">
                    ${deadlineIconHtml}
                    ${rightElement}
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------
// TASK MENU DROPDOWN (CS only)
// ------------------------------------------
// Context-sensitive menu items based on task status.
// | Status       | Options                      |
// |--------------|------------------------------|
// | Open         | Edit, Reassign, Cancel       |
// | In Progress  | Edit, Cancel                 |
// | Submitted    | Edit, Cancel                 |
// | Completed    | Reopen, Reassign             |
// | Sent Back    | Edit, Cancel                 |

function renderTaskMenuDropdown(task) {
    const items = getTaskMenuItems(task);
    if (items.length === 0) return '';

    return `
        <div class="task-menu-dropdown" onclick="event.stopPropagation()">
            ${items.map(item => `
                <button class="task-menu-item ${item.danger ? 'danger' : ''}"
                        onclick="event.stopPropagation(); closeTaskMenu(); ${item.action}">
                    <span class="material-icons-outlined">${item.icon}</span>
                    ${item.label}
                </button>
            `).join('')}
        </div>
    `;
}

function getTaskMenuItems(task) {
    const items = [];

    switch (task.status) {
        case 'in_progress':
            items.push({ icon: 'edit', label: 'Edit Task', action: `openEditTaskModal('${task.id}')` });
            items.push({ icon: 'cancel', label: 'Cancel Task', action: `openCancelTaskModal('${task.id}')`, danger: true });
            break;

        case 'submitted':
            items.push({ icon: 'edit', label: 'Edit Task', action: `openEditTaskModal('${task.id}')` });
            items.push({ icon: 'cancel', label: 'Cancel Task', action: `openCancelTaskModal('${task.id}')`, danger: true });
            break;

        case 'completed':
            items.push({ icon: 'replay', label: 'Reopen Task', action: `reopenTask('${task.id}')` });
            break;

        case 'sent_back':
            items.push({ icon: 'edit', label: 'Edit Task', action: `openEditTaskModal('${task.id}')` });
            items.push({ icon: 'cancel', label: 'Cancel Task', action: `openCancelTaskModal('${task.id}')`, danger: true });
            break;

        case 'cancelled':
            // No menu options — cancelled tasks are final
            break;
    }
    return items;
}

// Toggle task card dropdown menu
function toggleTaskMenu(taskId) {
    if (state.openTaskMenuId === taskId) {
        state.openTaskMenuId = null;
    } else {
        state.openTaskMenuId = taskId;
    }
    renderTaskTab();
}

function closeTaskMenu() {
    state.openTaskMenuId = null;
    // Don't re-render here — the action handler will trigger its own render
}

// ------------------------------------------
// TASK DETAIL THREE-DOT MENU (CS only)
// ------------------------------------------
// Reuses getTaskMenuItems() — same actions as the card menu,
// but rendered inside the task detail header.

function toggleTaskDetailMenu(taskId) {
    if (state.openTaskDetailMenuId === taskId) {
        state.openTaskDetailMenuId = null;
    } else {
        state.openTaskDetailMenuId = taskId;
    }
    renderTaskDetailOverlay();
}

function closeTaskDetailMenu() {
    state.openTaskDetailMenuId = null;
}

function renderTaskDetailMenuDropdown(task) {
    const items = getTaskMenuItems(task);
    if (items.length === 0) return '';

    return `
        <div class="task-detail-menu-dropdown">
            ${items.map(item => `
                <button class="task-menu-item ${item.danger ? 'danger' : ''}"
                        onclick="closeTaskDetailMenu(); ${item.action}">
                    <span class="material-icons-outlined">${item.icon}</span>
                    ${item.label}
                </button>
            `).join('')}
        </div>
    `;
}

// ------------------------------------------
// STATUS PILLS
// ------------------------------------------
// Small colored pills showing count of each status

function renderStatusPills(counts) {
    let pills = '';
    if (counts.in_progress > 0) {
        pills += `<span class="status-pill" style="background:#eff6ff;color:#2563eb" title="In Progress"><span class="material-icons-outlined" style="font-size:14px">play_circle</span>${counts.in_progress}</span>`;
    }
    if (counts.submitted > 0) {
        pills += `<span class="status-pill" style="background:#fffbeb;color:#f59e0b" title="Pending Review"><span class="material-icons-outlined" style="font-size:14px">pending</span>${counts.submitted}</span>`;
    }
    if (counts.sent_back > 0) {
        pills += `<span class="status-pill" style="background:#fffbeb;color:#d97706" title="Needs Revision"><span class="material-icons-outlined" style="font-size:14px">edit_note</span>${counts.sent_back}</span>`;
    }
    if (counts.completed > 0) {
        pills += `<span class="status-pill" style="background:#f0fdf4;color:#16a34a" title="Approved"><span class="material-icons-outlined" style="font-size:14px">check_circle</span>${counts.completed}</span>`;
    }
    return pills;
}

// ------------------------------------------
// TASK DETAIL PANEL
// ------------------------------------------
// Shows full detail of a single task.
// This replaces the tab content when a task is selected.
// Has an X button to go back to the task list.

function renderTaskDetail(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        state.selectedTaskId = null;
        return '<div class="task-empty-state"><p>Task not found</p></div>';
    }

    const role = state.currentRole;
    const statusConfig = TASK_STATUS_CONFIG[task.status];

    // Priority display colors
    const priorityColors = {
        high: '#dc2626',
        medium: '#f59e0b',
        low: '#6b7280'
    };

    let html = '';

    // Header — close button + title + three-dot menu (CS only, hidden for cancelled tasks)
    const showDetailMenu = role === 'cs' && task.status !== 'cancelled';
    const detailMenuOpen = state.openTaskDetailMenuId === task.id;
    html += `
        <div class="task-detail-header">
            <button class="task-detail-back" onclick="closeTaskDetail()">
                <span class="material-icons-outlined">close</span>
            </button>
            <h3 class="task-detail-title">Task Detail</h3>
            ${showDetailMenu ? `
                <div class="task-detail-menu-wrapper">
                    <button class="task-detail-menu-btn" onclick="toggleTaskDetailMenu('${task.id}')" title="More options">
                        <span class="material-icons-outlined">more_vert</span>
                    </button>
                    ${detailMenuOpen ? renderTaskDetailMenuDropdown(task) : ''}
                </div>
            ` : ''}
        </div>
    `;

    // Body
    html += `<div class="task-detail-body">`;

    const isCancelled = task.status === 'cancelled';
    const aoInfo = getAOInfo(task.assignee);

    // 1. Task description card — strikethrough if cancelled
    html += `
        <div class="td-description-card ${isCancelled ? 'td-description-cancelled' : ''}">
            ${task.title}${task.description ? '. ' + task.description : ''}
        </div>
    `;

    if (isCancelled) {
        // Cancelled view: simplified meta — just Status + Assigned to
        html += `<div class="td-meta-grid td-meta-grid--cancelled">`;
        html += `
            <div class="td-meta-cell">
                <span class="td-meta-label">Status</span>
                <div class="td-meta-value">
                    <span class="material-icons-outlined" style="font-size:16px;color:${statusConfig.color}">${statusConfig.icon}</span>
                    <span style="color:${statusConfig.color}">${statusConfig.label}</span>
                </div>
            </div>
            <div class="td-meta-cell">
                <span class="td-meta-label">Assigned to</span>
                <div class="td-meta-value">
                    <div class="td-assignee-avatar" style="background:${aoInfo ? aoInfo.color : '#6b7280'}">${aoInfo ? aoInfo.initials : '?'}</div>
                    <span>${aoInfo ? aoInfo.name : 'Unknown'}</span>
                </div>
            </div>
        `;
        html += `</div>`;

        // Show the full activity thread even for cancelled tasks.
        // This preserves all prior submissions, documents, and history
        // so nothing the AO did gets hidden — just frozen in read-only state.
        // (renderActivityThread already handles 'cancelled' history entries)
        const activityHTML = renderActivityThread(task, role, false);
        if (activityHTML) {
            html += activityHTML;
        }

    } else {
        // Normal (non-cancelled) view: full 2x2 meta grid

        // 2. Meta grid — 2x2 with dividers (Priority, Due Date, Status, Assigned to)
        html += `<div class="td-meta-grid">`;

        // Row 1: Priority + Due Date
        html += `
            <div class="td-meta-cell">
                <span class="td-meta-label">Priority</span>
                <div class="td-meta-value">
                    ${task.priority ? `
                        <span class="td-priority-dot" style="background:${priorityColors[task.priority] || '#6b7280'}"></span>
                        <span class="td-priority-text" style="color:${priorityColors[task.priority] || '#6b7280'}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                    ` : `<span style="color:var(--gray-400)">Not set</span>`}
                </div>
            </div>
            <div class="td-meta-cell">
                <span class="td-meta-label">Due Date</span>
                <div class="td-meta-value">
                    ${(() => {
                        const dl = getDeadlineIndicator(task.deadline, task.deadlineISO);
                        return dl.show ? `
                            <span class="task-deadline-pair ${dl.cssClass}" title="${dl.tooltip}">
                                <span class="material-icons-outlined" style="font-size:16px">${dl.icon}</span>
                                <span>${task.deadline}</span>
                            </span>
                        ` : `<span style="color:var(--gray-400)">No deadline</span>`;
                    })()}
                </div>
            </div>
        `;

        // Row 2: Status + Assigned to
        html += `
            <div class="td-meta-cell">
                <span class="td-meta-label">Status</span>
                <div class="td-meta-value">
                    <span class="material-icons-outlined" style="font-size:16px;color:${statusConfig.color}">${statusConfig.icon}</span>
                    <span>${(!isAORole(role) && statusConfig.labelCS) ? statusConfig.labelCS : statusConfig.label}</span>
                </div>
            </div>
            <div class="td-meta-cell">
                <span class="td-meta-label">Assigned to</span>
                <div class="td-meta-value">
                    <div class="td-assignee-avatar" style="background:${aoInfo ? aoInfo.color : '#6b7280'}">${aoInfo ? aoInfo.initials : '?'}</div>
                    <span>${aoInfo ? aoInfo.name : 'Unknown'}</span>
                </div>
            </div>
        `;

        html += `</div>`; // close td-meta-grid

        // 3. Activity Thread — flat timeline of submissions, CS responses, and instructions
        const hasSubmissions = task.submissions && task.submissions.length > 0;
        const hasInstructions = task.instructions && task.instructions.trim();
        const hasHistory = task.history && task.history.length > 0;

        if (hasSubmissions || hasInstructions || hasHistory) {
            html += renderActivityThread(task, role, false);
        }
    }

    html += `</div>`; // close task-detail-body

    // 6. Action button (role-specific) — OUTSIDE task-detail-body
    //    so it can stick to the bottom of the overlay as a fixed footer
    html += renderTaskDetailActions(task, role);

    return html;
}

// ------------------------------------------
// ACTIVITY THREAD
// ------------------------------------------
// Helper: Render comment text with "Show more" if it's long.
// Uses CSS line-clamp (3 lines). If text exceeds ~120 chars,
// we add the clamped class + a toggle link.
function renderClampedText(text) {
    const CHAR_THRESHOLD = 120;
    if (text.length > CHAR_THRESHOLD) {
        return `
            <div class="td-activity-text-wrap td-activity-clamped">
                <p class="td-activity-text">${text}</p>
                <button class="td-activity-show-more" onclick="toggleClampedText(this)">Show more</button>
            </div>
        `;
    }
    return `<p class="td-activity-text">${text}</p>`;
}

// Toggle expand/collapse on a clamped comment
function toggleClampedText(btn) {
    const wrap = btn.closest('.td-activity-text-wrap');
    const isClamped = wrap.classList.contains('td-activity-clamped');
    wrap.classList.toggle('td-activity-clamped');
    btn.textContent = isClamped ? 'Show less' : 'Show more';
}

// Flat timeline showing AO submissions and CS responses
// as separate blocks, newest first. No nesting.
//
// Design rationale (for design crit):
// - Avatars replace colored dots — the timeline is about PEOPLE, not status colors.
//   Every entry anchors to a person, making the thread feel like a conversation.
// - Actions are inline narrative text ("requested a revision") instead of badges.
//   This makes the timeline scannable as a story. The subtle color on the action
//   text preserves quick visual scanning (amber = revision, green = approved)
//   without adding a loud decorative badge that competes for attention.
// - Timestamps use real relative formatting so the timeline has temporal depth.

// Helper: find who was the ORIGINAL assignee before any reassignments.
// Walks the history to find the first reassignment and extracts the "from" person.
// Falls back to task.assignee if no reassignment history exists.
function getOriginalAssigneeId(task) {
    if (!task.history) return task.assignee;
    const firstReassign = task.history.find(h => h.type === 'reassigned');
    if (!firstReassign) return task.assignee;

    // If we stored fromId (newer entries), use it directly
    if (firstReassign.fromId) return firstReassign.fromId;

    // Otherwise, extract name from detail string "from X to Y" and look up by name
    if (firstReassign.detail) {
        const match = firstReassign.detail.match(/^from (.+?) to /);
        if (match) {
            const fromName = match[1];
            const ao = ACTION_OFFICERS.find(a => a.name === fromName);
            if (ao) return ao.id;
        }
    }
    return task.assignee;
}

function renderActivityThread(task, role, skipLatest) {
    const csInfo = ROLES['cs'];
    const submissions = task.submissions || [];
    const history = task.history || [];
    const hasInstructions = task.instructions && task.instructions.trim();

    // Backfill submittedBy on old submissions that don't have it.
    // Walk reassignment history to find who was assigned BEFORE the first reassignment.
    if (submissions.some(s => !s.submittedBy)) {
        const originalAssignee = getOriginalAssigneeId(task);
        submissions.forEach(sub => {
            if (!sub.submittedBy) sub.submittedBy = originalAssignee;
        });
    }

    // If skipLatest is true, we skip the most recent submission
    // (it's already shown in the CS Review Card above)
    const startIndex = skipLatest ? submissions.length - 2 : submissions.length - 1;

    // Nothing to show if no submissions, no instructions, and no history
    if (startIndex < 0 && !hasInstructions && history.length === 0) return '';

    let html = '';

    // Wrap label + thread in a single section container
    // so parent gap applies once (matching Attached Files pattern)
    html += `<div class="td-section">`;
    html += `<div class="td-activity-label">Updates</div>`;

    html += `<div class="td-activity-thread">`;

    // Build unified timeline array so all entries sort by timestamp (newest first).
    // Previously, history and submissions were two separate groups — edits from 40m ago
    // would appear above an approval from "Just now" because groups never interleaved.
    const timelineItems = [];

    // Add history entries (cancel, edit, reassign, reopen)
    for (let i = 0; i < history.length; i++) {
        timelineItems.push({
            type: 'history',
            entry: history[i],
            sortTimestamp: new Date(history[i].timestamp).getTime() || 0
        });
    }

    // Add submission entries (each is a pair: CS feedback + AO submission).
    // Sort by the most recent timestamp within the pair (feedbackAt if present, else submittedAt).
    for (let i = 0; i <= startIndex; i++) {
        const sub = submissions[i];
        const feedbackTime = sub.feedbackAt ? new Date(sub.feedbackAt).getTime() : 0;
        const submittedTime = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        timelineItems.push({
            type: 'submission',
            submission: sub,
            sortTimestamp: Math.max(feedbackTime, submittedTime) || 0
        });
    }

    // Sort descending — newest first
    timelineItems.sort((a, b) => b.sortTimestamp - a.sortTimestamp);

    // Render all timeline items in unified sorted order
    for (const item of timelineItems) {
        if (item.type === 'history') {
            html += renderHistoryEntry(item.entry, role, csInfo);
        } else if (item.type === 'submission') {
            html += renderSubmissionBlock(item.submission, task, role, csInfo);
        }
    }

    // Instructions entry — appears as the oldest (bottom) entry in the timeline
    // Uses the same avatar + action text style as other entries for consistency
    if (hasInstructions) {
        const csDisplayName = role === 'cs' ? 'You' : csInfo.name;
        html += `
            <div class="td-activity-entry td-activity-cs">
                <div class="td-activity-avatar" style="background:${csInfo.color}">${csInfo.initials}</div>
                <div class="td-activity-author">
                    <span class="td-activity-name">${csDisplayName}</span>
                    <span class="td-activity-action">added instructions</span>
                    <span class="td-activity-time">${formatRelativeTime(task.createdAt)}</span>
                </div>
                ${renderClampedText(task.instructions)}
            </div>
        `;
    }

    html += `</div>`; // close td-activity-thread
    html += `</div>`; // close td-section wrapper

    return html;
}

// ------------------------------------------
// SUBMISSION BLOCK RENDERER
// ------------------------------------------
// Renders a single submission unit: CS feedback (if any) ABOVE the AO submission.
// The pair always stays together as one logical unit in the timeline.

function renderSubmissionBlock(sub, task, role, csInfo) {
    let html = '';

    // CS feedback block (renders ABOVE the AO submission it responds to)
    if (sub.feedback) {
        const csDisplayName = role === 'cs' ? 'You' : csInfo.name;
        const actionText = sub.status === 'sent_back'
            ? 'requested a revision'
            : sub.status === 'approved' ? 'approved this' : '';
        const actionClass = sub.status === 'sent_back'
            ? 'td-action--revision'
            : sub.status === 'approved' ? 'td-action--approved' : '';

        html += `
            <div class="td-activity-entry td-activity-cs">
                <div class="td-activity-avatar" style="background:${csInfo.color}">${csInfo.initials}</div>
                <div class="td-activity-author">
                    <span class="td-activity-name">${csDisplayName}</span>
                    ${actionText ? `<span class="td-activity-action ${actionClass}">${actionText}</span>` : ''}
                    <span class="td-activity-time">${formatRelativeTime(sub.feedbackAt)}</span>
                </div>
                ${sub.feedback && sub.feedback.trim() ? renderClampedText(sub.feedback) : ''}
            </div>
        `;
    }

    // AO submission block — use the actual submitter, not current assignee
    const submitter = getAOInfo(sub.submittedBy || task.assignee);
    const isMySubmission = (role === (sub.submittedBy || task.assignee));
    const aoDisplayName = isMySubmission ? 'You' : (submitter ? submitter.name : 'Action Officer');
    const aoColor = submitter ? submitter.color : '#6b7280';
    const aoInitials = submitter ? submitter.initials : '?';

    html += `
        <div class="td-activity-entry td-activity-ao">
            <div class="td-activity-avatar" style="background:${aoColor}">${aoInitials}</div>
            <div class="td-activity-author">
                <span class="td-activity-name">${aoDisplayName}</span>
                <span class="td-activity-action td-action--submitted">submitted</span>
                <span class="td-activity-time">${formatRelativeTime(sub.submittedAt)}</span>
            </div>
            ${sub.comment ? renderClampedText(sub.comment) : ''}
    `;

    // Documents attached in this submission
    if (sub.documents && sub.documents.length > 0) {
        html += `<div class="td-activity-docs">`;
        sub.documents.forEach(docId => {
            const doc = findDocument(docId);
            if (doc) {
                const fileColor = getDocTypeColor(doc);
                html += `
                    <div class="td-activity-doc" onclick="selectDoc('${doc.id}')">
                        <div class="td-activity-doc-icon" style="background:${fileColor}15;border-color:${fileColor}30">
                            <span class="material-icons-outlined" style="font-size:16px;color:${fileColor}">${getDocIcon(doc)}</span>
                        </div>
                        <div class="td-activity-doc-info">
                            <span class="td-activity-doc-name">${doc.name}</span>
                            ${doc.size ? `<span class="td-activity-doc-size">${doc.size}</span>` : ''}
                        </div>
                    </div>
                `;
            }
        });
        html += `</div>`;
    }

    html += `</div>`; // close AO submission block
    return html;
}

// ------------------------------------------
// HISTORY ENTRY RENDERER
// ------------------------------------------
// Renders a single task history event (cancel, edit, reassign, reopen)
// in the same avatar + action text style as submissions.

function renderHistoryEntry(entry, role, csInfo) {
    const csDisplayName = role === 'cs' ? 'You' : csInfo.name;

    // Config for each history type
    const config = {
        cancelled: {
            action: 'cancelled this task',
            actionClass: 'td-action--cancelled'
        },
        edited: {
            action: 'updated this task',
            actionClass: ''
        },
        reassigned: {
            action: `reassigned ${entry.detail || ''}`,
            actionClass: 'td-action--reassigned'
        },
        reopened: {
            action: 'reopened this task',
            actionClass: 'td-action--reopened'
        }
    };

    const cfg = config[entry.type] || config.edited;

    // Build detail content below the action line
    let detailHtml = '';

    // Cancellation shows the reason
    if (entry.type === 'cancelled' && entry.detail) {
        detailHtml = renderClampedText(entry.detail);
    }

    // Edits show what specifically changed
    if (entry.type === 'edited' && entry.changes && entry.changes.length > 0) {
        const fieldLabels = { title: 'Task', priority: 'Priority', deadline: 'Due date' };
        detailHtml = `<div class="td-history-changes">`;
        entry.changes.forEach(c => {
            const label = fieldLabels[c.field] || c.field;
            detailHtml += `
                <div class="td-history-change">
                    <span class="td-history-field">${label}:</span>
                    <span class="td-history-old">${c.from}</span>
                    <span class="material-icons-outlined" style="font-size:14px;color:var(--gray-400)">arrow_forward</span>
                    <span class="td-history-new">${c.to}</span>
                </div>
            `;
        });
        detailHtml += `</div>`;
    }

    return `
        <div class="td-activity-entry td-activity-cs td-activity-history">
            <div class="td-activity-avatar" style="background:${csInfo.color}">${csInfo.initials}</div>
            <div class="td-activity-author">
                <span class="td-activity-name">${csDisplayName}</span>
                <span class="td-activity-action ${cfg.actionClass}">${cfg.action}</span>
                <span class="td-activity-time">${formatRelativeTime(entry.timestamp)}</span>
            </div>
            ${detailHtml}
        </div>
    `;
}

// ------------------------------------------
// RELATIVE TIME FORMATTER
// ------------------------------------------
// Converts raw timestamp strings into believable relative times.
// Since our prototype uses hardcoded "Just now" strings everywhere,
// this function fakes temporal depth based on the entry's position.
// When real Date objects are stored, it does proper relative formatting.

// Track call count per render cycle to stagger timestamps
let _relativeTimeCounter = 0;
let _relativeTimeRenderCycle = 0;

function formatRelativeTime(rawTimestamp) {
    if (!rawTimestamp) return '';

    // If it's already a Date or ISO string, do real relative formatting
    if (rawTimestamp instanceof Date || (typeof rawTimestamp === 'string' && rawTimestamp.includes('T'))) {
        const date = rawTimestamp instanceof Date ? rawTimestamp : new Date(rawTimestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // For hardcoded "Just now" strings: stagger them to look realistic
    // Each call in a render cycle gets a progressively older timestamp
    if (rawTimestamp === 'Just now') {
        const currentCycle = Date.now();
        // Reset counter if this is a new render cycle (>100ms gap)
        if (currentCycle - _relativeTimeRenderCycle > 100) {
            _relativeTimeCounter = 0;
            _relativeTimeRenderCycle = currentCycle;
        }
        const idx = _relativeTimeCounter++;
        const staggeredTimes = [
            'Just now', '12m ago', '2h ago', 'Yesterday', '2d ago', 'Feb 18', 'Feb 15'
        ];
        return staggeredTimes[Math.min(idx, staggeredTimes.length - 1)];
    }

    // Return as-is if it's already a readable string like "2 days ago"
    return rawTimestamp;
}

// ------------------------------------------
// FILE TYPE COLOR HELPER
// ------------------------------------------
// Returns a semantic color for each document type.
// Used for the left-border accent on document cards in the timeline.

function getDocTypeColor(doc) {
    if (!doc || !doc.type) return '#6b7280';
    switch (doc.type) {
        case 'pdf': return '#dc2626';         // Red for PDF
        case 'word':
        case 'doc':
        case 'docx': return '#2563eb';        // Blue for Word
        case 'excel':
        case 'xls':
        case 'xlsx': return '#16a34a';        // Green for Excel
        case 'image':
        case 'png':
        case 'jpg': return '#8b5cf6';         // Purple for images
        default: return '#6b7280';            // Gray fallback
    }
}

// ------------------------------------------
// CS REVIEW CARD
// ------------------------------------------
// When CS opens a submitted task, this card shows the AO's latest
// submission (comment + attached docs) prominently so CS can review it
// without digging through history.

function renderCSReviewCard(task) {
    const latestSub = task.submissions[task.submissions.length - 1];
    if (!latestSub) return '';

    const aoInfo = getAOInfo(task.assignee);
    const aoName = aoInfo ? aoInfo.name : 'Action Officer';

    let html = `
        <div class="td-section">
            <div class="td-section-header">
                <span class="td-section-label">${aoName}'s Submission</span>
            </div>
            <div class="td-review-card">
    `;

    // AO's comment
    if (latestSub.comment) {
        html += `<p class="td-review-comment">${latestSub.comment}</p>`;
    }

    // Attached documents
    if (latestSub.documents && latestSub.documents.length > 0) {
        html += `<div class="td-review-docs">`;
        latestSub.documents.forEach(docId => {
            const doc = findDocument(docId);
            if (doc) {
                html += `
                    <div class="td-activity-doc" onclick="selectDoc('${doc.id}')">
                        <span class="material-icons-outlined" style="font-size:18px;color:var(--gray-500)">${getDocIcon(doc)}</span>
                        <span class="td-activity-doc-name">${doc.name}</span>
                    </div>
                `;
            }
        });
        html += `</div>`;
    }

    // If there's no comment and no docs, show a minimal note
    if (!latestSub.comment && (!latestSub.documents || latestSub.documents.length === 0)) {
        html += `<p style="color:var(--gray-400);font-size:13px;font-style:italic">Submitted without comment or documents</p>`;
    }

    // Previous CS feedback (if this is a resubmission after send-back)
    // Show as a small quoted block so CS remembers what they said last time
    if (task.submissions.length > 1) {
        const previousSub = task.submissions[task.submissions.length - 2];
        if (previousSub.feedback) {
            html += `
                <div class="td-review-prev-feedback">
                    <span class="material-icons-outlined" style="font-size:14px;color:var(--gray-400)">format_quote</span>
                    <div>
                        <span class="td-review-prev-label">Your previous feedback</span>
                        <p class="td-review-prev-text">${previousSub.feedback}</p>
                    </div>
                </div>
            `;
        }
    }

    html += `</div></div>`;

    return html;
}

// Helper: count total visual entries (each submission = 1 AO entry + optionally 1 CS entry)
function countActivityEntries(submissions) {
    let count = 0;
    submissions.forEach(sub => {
        count++; // AO submission
        if (sub.feedback) count++; // CS response
    });
    return count;
}

// Helper: Get pending docs (attached but not submitted) for a task
function getPendingDocs(task) {
    if (!task.pendingDocs || task.pendingDocs.length === 0) return [];
    return task.pendingDocs.map(docId => {
        return state.drafts.find(d => d.id === docId) || findDocument(docId);
    }).filter(Boolean);
}

// Helper: Get an appropriate icon for a document based on its type
function getDocIcon(doc) {
    if (!doc || !doc.type) return 'description';
    switch (doc.type) {
        case 'pdf': return 'picture_as_pdf';
        case 'word':
        case 'doc':
        case 'docx': return 'description';
        case 'excel':
        case 'xls':
        case 'xlsx': return 'table_chart';
        case 'image':
        case 'png':
        case 'jpg': return 'image';
        default: return 'description';
    }
}

// Helper: Get the latest CS feedback from a task's submissions
function getLatestCSFeedback(task) {
    if (!task.submissions || task.submissions.length === 0) return null;
    for (let i = task.submissions.length - 1; i >= 0; i--) {
        if (task.submissions[i].feedback) {
            return task.submissions[i].feedback;
        }
    }
    return null;
}

// Helper: Collect all documents for a task with their status.
// docStatus can be: "new" (attached, not submitted), "submitted" (under review), "approved"
function getTaskSubmissionDocs(task) {
    const docs = [];
    const seenIds = new Set();

    // 1. Pending docs (attached but not yet submitted) — "New"
    if (task.pendingDocs && task.pendingDocs.length > 0) {
        task.pendingDocs.forEach(docId => {
            if (seenIds.has(docId)) return;
            seenIds.add(docId);
            const doc = state.drafts.find(d => d.id === docId) || findDocument(docId);
            if (doc) {
                docs.push({
                    ...doc,
                    date: doc.uploadedAt || 'Just now',
                    docStatus: 'new'
                });
            }
        });
    }

    // 2. Submitted docs — show status based on the submission they belong to
    if (task.submissions) {
        // Newest submissions first
        const reversed = [...task.submissions].reverse();
        reversed.forEach((sub) => {
            if (sub.documents && sub.documents.length > 0) {
                // Determine the badge for docs in this submission
                let status = 'submitted';  // default: under review
                if (sub.status === 'approved') status = 'approved';
                if (sub.status === 'sent_back') status = 'sent_back';

                sub.documents.forEach(docId => {
                    if (seenIds.has(docId)) return;
                    seenIds.add(docId);
                    const doc = state.drafts.find(d => d.id === docId) || findDocument(docId);
                    if (doc) {
                        docs.push({
                            ...doc,
                            date: sub.submittedAt,
                            docStatus: status
                        });
                    }
                });
            }
        });
    }

    return docs;
}

// Helper: Render the right badge for a document based on its status
function renderDocBadge(docStatus) {
    switch (docStatus) {
        case 'new':
            return `<span class="td-doc-badge td-doc-badge--new">New</span>`;
        case 'submitted':
            return `<span class="td-doc-badge td-doc-badge--submitted">Submitted</span>`;
        case 'approved':
            return `<span class="td-doc-badge td-doc-badge--approved">Approved</span>`;
        case 'sent_back':
            return `<span class="td-doc-badge td-doc-badge--sent-back">Update</span>`;
        default:
            return '';
    }
}

// ------------------------------------------
// SUBMISSION ENTRY
// ------------------------------------------
// A single submission in the task detail history

function renderSubmissionEntry(sub, task, isLatest, viewRole) {
    const aoInfo = getAOInfo(task.assignee);

    let html = `<div class="submission-entry ${isLatest ? 'latest' : ''}">`;

    // Submission header
    html += `
        <div class="submission-header">
            <div class="submission-avatar" style="background:${aoInfo ? aoInfo.color : '#6b7280'}">${aoInfo ? aoInfo.initials : '?'}</div>
            <div class="submission-info">
                <span class="submission-author">${aoInfo ? aoInfo.name : 'Unknown'}</span>
                <span class="submission-time">${sub.submittedAt}</span>
            </div>
            ${sub.status === 'approved' ? `<span class="submission-badge approved"><span class="material-icons-outlined" style="font-size:14px">check_circle</span>Approved</span>` : ''}
            ${sub.status === 'sent_back' ? `<span class="submission-badge sent-back"><span class="material-icons-outlined" style="font-size:14px">edit_note</span>Revision Requested</span>` : ''}
        </div>
    `;

    // Submission comment
    if (sub.comment) {
        html += `<div class="submission-comment">${sub.comment}</div>`;
    }

    // Attached documents
    if (sub.documents && sub.documents.length > 0) {
        html += `<div class="submission-docs">`;
        sub.documents.forEach(docId => {
            const doc = findDocument(docId);
            if (doc) {
                html += `
                    <div class="submission-doc" onclick="selectDoc('${doc.id}')">
                        <span class="material-icons-outlined" style="font-size:16px;color:var(--gray-500)">description</span>
                        <span class="submission-doc-name">${doc.name}</span>
                    </div>
                `;
            }
        });
        html += `</div>`;
    }

    // CS Feedback (if sent back)
    if (sub.feedback) {
        html += `
            <div class="submission-feedback">
                <div class="submission-feedback-header">
                    <div class="submission-avatar small" style="background:${ROLES.cs.color}">${ROLES.cs.initials}</div>
                    <span style="font-weight:500;font-size:12px">${ROLES.cs.name}</span>
                    <span style="color:var(--gray-400);font-size:11px">${sub.feedbackAt || ''}</span>
                </div>
                <div class="submission-feedback-text">${sub.feedback}</div>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

// ------------------------------------------
// TASK DETAIL ACTION BUTTONS
// ------------------------------------------
// What buttons appear at the bottom of task detail

function renderTaskDetailActions(task, role) {
    // Cancelled tasks show a dark "Task Cancelled" bar for everyone
    if (task.status === 'cancelled') {
        return `
            <div class="task-detail-actions">
                <div class="task-cancelled-bar">
                    <span>Task Cancelled</span>
                    <button class="task-cancelled-bar-close" onclick="closeTaskDetail()">
                        <span class="material-icons-outlined" style="font-size:18px">close</span>
                    </button>
                </div>
            </div>
        `;
    }

    let html = '<div class="task-detail-actions">';

    const isAssignedAO = (role === task.assignee);

    if (isAssignedAO) {
        // AO actions — only for the assigned AO
        if (task.status === 'in_progress') {
            // Two-line button: primary label + subtitle hint
            html += `
                <button class="btn btn-primary task-detail-action-btn task-action-btn-rich" onclick="openTaskSubmitModal('${task.id}')">
                    <span class="task-action-btn-main">
                        <span class="material-icons-outlined" style="font-size:18px">check_circle</span>
                        Complete Task
                    </span>
                    <span class="task-action-btn-sub">Add a note or attach documents</span>
                </button>
            `;
        } else if (task.status === 'sent_back') {
            html += `
                <button class="btn btn-primary task-detail-action-btn task-action-btn-rich" onclick="openTaskSubmitModal('${task.id}')">
                    <span class="task-action-btn-main">
                        <span class="material-icons-outlined" style="font-size:18px">refresh</span>
                        Resubmit for Review
                    </span>
                    <span class="task-action-btn-sub">Add a note or attach documents</span>
                </button>
            `;
        } else if (task.status === 'submitted') {
            html += `
                <div class="task-detail-waiting">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--warning)">hourglass_empty</span>
                    <span>Waiting for Chief Secretary's review</span>
                </div>
            `;
        } else if (task.status === 'completed') {
            html += `
                <div class="task-detail-waiting" style="background:var(--success-light)">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--success)">check_circle</span>
                    <span style="color:var(--success)">This task has been approved</span>
                </div>
            `;
        }
    } else if (role === 'cs') {
        // CS actions
        if (task.status === 'submitted') {
            html += `
                <div style="display:flex;gap:10px;width:100%">
                    <button class="btn btn-success task-detail-action-btn" style="flex:1;white-space:nowrap" onclick="openTaskApproveModal('${task.id}')">
                        <span class="material-icons-outlined" style="font-size:18px">check_circle</span>
                        Approve
                    </button>
                    <button class="btn task-detail-action-btn" style="flex:1;background:#d97706;color:white;border:none;white-space:nowrap" onclick="openTaskSendBackModal('${task.id}')">
                        <span class="material-icons-outlined" style="font-size:18px">edit_note</span>
                        Request Revision
                    </button>
                </div>
            `;
        } else if (task.status === 'completed') {
            html += `
                <div class="task-detail-waiting" style="background:var(--success-light)">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--success)">check_circle</span>
                    <span style="color:var(--success)">You approved this task</span>
                </div>
            `;
        } else if (task.status === 'in_progress') {
            html += `
                <div class="task-detail-waiting">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--gray-400)">pending</span>
                    <span>Waiting for ${getAOInfo(task.assignee)?.name || 'Action Officer'} to submit</span>
                </div>
            `;
        } else if (task.status === 'sent_back') {
            html += `
                <div class="task-detail-waiting" style="background:var(--warning-light)">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--warning)">edit_note</span>
                    <span style="color:#92400e">Revision requested — waiting for ${getAOInfo(task.assignee)?.name || 'Action Officer'}</span>
                </div>
            `;
        }
    } else {
        // Read-only roles (DTO, EA) — neutral status messages, no action buttons
        const aoName = getAOInfo(task.assignee)?.name || 'Action Officer';
        if (task.status === 'in_progress') {
            html += `
                <div class="task-detail-waiting">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--gray-400)">pending</span>
                    <span>Waiting for ${aoName} to submit</span>
                </div>
            `;
        } else if (task.status === 'submitted') {
            html += `
                <div class="task-detail-waiting" style="background:var(--warning-light)">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--warning)">hourglass_empty</span>
                    <span style="color:#92400e">Pending review by Chief Secretary</span>
                </div>
            `;
        } else if (task.status === 'completed') {
            html += `
                <div class="task-detail-waiting" style="background:var(--success-light)">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--success)">check_circle</span>
                    <span style="color:var(--success)">This task has been approved</span>
                </div>
            `;
        } else if (task.status === 'sent_back') {
            html += `
                <div class="task-detail-waiting" style="background:var(--warning-light)">
                    <span class="material-icons-outlined" style="font-size:20px;color:var(--warning)">edit_note</span>
                    <span style="color:#92400e">Revision requested — waiting for ${aoName}</span>
                </div>
            `;
        }
    }

    html += '</div>';
    return html;
}

// ------------------------------------------
// AO OVERVIEW TASKS SECTION
// ------------------------------------------
// Shows in the Overview tab for AO — task cards with status icons

function renderAOTasksOverview() {
    const myTasks = getTasksForAO(state.currentRole);
    if (myTasks.length === 0) return '';

    const counts = getTaskStatusCounts(state.currentRole);
    const tasksExpanded = state.sectionStates.actionItems;

    return `
        <div class="section-card ${tasksExpanded ? 'expanded' : ''}" id="tasks-section">
            <div class="section-header" onclick="toggleSection('actionItems')">
                <div class="section-title">
                    <span class="material-icons-outlined" style="font-size:18px">checklist</span>
                    Your Tasks
                    <span class="section-count">${myTasks.length}</span>
                </div>
                <span class="material-icons-outlined section-toggle">expand_more</span>
            </div>
            <div class="section-content">
                <div class="section-body">
                    ${myTasks.slice(0, 3).map(task => renderTaskCard(task, state.currentRole)).join('')}
                    ${myTasks.length > 3 ? `
                        <div class="see-all-link" onclick="event.stopPropagation(); switchTab('task')">
                            <span class="material-icons-outlined" style="font-size:16px">open_in_new</span>
                            View all ${myTasks.length} tasks
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------
// CS OVERVIEW TASKS SECTION
// ------------------------------------------
// Shows in the Overview tab for CS — per-AO summary cards

function renderCSTasksOverview() {
    if (state.tasks.length === 0) return '';

    const assignedAOs = getAssignedAOs();
    const tasksExpanded = state.sectionStates.actionItems;

    let aoCardsHtml = '';
    assignedAOs.forEach(aoId => {
        const aoInfo = getAOInfo(aoId);
        if (!aoInfo) return;

        const counts = getTaskStatusCounts(aoId);
        const aoTasks = getTasksForAO(aoId);

        aoCardsHtml += `
            <div class="cs-ao-summary-card" onclick="filterTasksByAO('${aoId}')">
                <div class="cs-ao-summary-left">
                    <div class="cs-ao-summary-avatar" style="background:${aoInfo.color}">${aoInfo.initials}</div>
                    <div class="cs-ao-summary-info">
                        <div class="cs-ao-summary-name">${aoInfo.name}</div>
                        <div class="cs-ao-summary-role">${aoInfo.roleTitle || aoInfo.fullTitle}</div>
                    </div>
                </div>
                <div class="cs-ao-summary-right">
                    <div class="task-status-pills">
                        ${renderStatusPills(counts)}
                    </div>
                    <span class="material-icons-outlined" style="font-size:18px;color:var(--gray-400)">chevron_right</span>
                </div>
            </div>
        `;
    });

    return `
        <div class="section-card ${tasksExpanded ? 'expanded' : ''}" id="tasks-section">
            <div class="section-header" onclick="toggleSection('actionItems')">
                <div class="section-title">
                    <span class="material-icons-outlined" style="font-size:18px">people</span>
                    Delegated Tasks
                    <span class="section-count">${state.tasks.length}</span>
                </div>
                <span class="material-icons-outlined section-toggle">expand_more</span>
            </div>
            <div class="section-content">
                <div class="section-body">
                    ${aoCardsHtml}
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------
// DELEGATE MODAL CONTENT
// ------------------------------------------
// Renders the new card-based delegate modal body

function renderDelegateModal() {
    const body = document.getElementById('delegate-modal-body');
    if (!body) return;

    const tasks = state.delegateModal.tasks;

    let html = '';

    // Section label + Add Task button
    html += `
        <div class="delegate-section-header">
            <span class="delegate-section-label">Assign Task</span>
            <button class="delegate-add-btn" onclick="addDelegateTask()">
                <span class="material-icons-outlined" style="font-size:16px">add</span>
                Add Task
            </button>
        </div>
    `;

    // Task cards or empty state
    if (tasks.length === 0) {
        html += `
            <div class="delegate-empty" onclick="addDelegateTask()">
                <span class="material-icons-outlined" style="font-size:24px;color:var(--gray-300)">add_task</span>
                <p>Click "+ Add Task" to create a task</p>
            </div>
        `;
    } else {
        tasks.forEach((task, idx) => {
            html += renderDelegateTaskCard(task, idx);
        });

        // Removed: dashed add-more button (use "+ Add Task" in header instead)
    }

    // Note: Shared comments textarea removed.
    // Instructions are now per-task via the "+ Add note" field on each card.

    body.innerHTML = html;
}

// ------------------------------------------
// DELEGATE TASK CARD (in modal)
// ------------------------------------------

function renderDelegateTaskCard(task, idx) {
    // Get assignee info for color
    const assignee = ACTION_OFFICERS.find(ao => ao.id === task.assignee) || ACTION_OFFICERS[0];
    const borderColor = assignee.color;

    // Priority display
    const priorityLabels = { high: 'High', medium: 'Medium', low: 'Low' };
    const priorityColors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--gray-400)' };
    const priorityLabel = priorityLabels[task.priority] || 'Medium';
    const priorityColor = priorityColors[task.priority] || 'var(--warning)';

    // Deadline display + indicator
    // In the delegate modal, task.deadline is the raw ISO string (e.g. "2025-12-15")
    const deadlineDisplay = task.deadline
        ? new Date(task.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        : 'Set deadline';
    const dlChip = task.deadline
        ? getDeadlineIndicator(deadlineDisplay, task.deadline)
        : { show: false, cssClass: '', icon: 'calendar_today', tooltip: '' };

    // Per-task note (expandable)
    const hasNote = task.note && task.note.trim();
    const noteExpanded = task._noteExpanded || hasNote;

    return `
        <div class="delegate-task-card" style="border-left-color: ${borderColor}">
            <div class="delegate-task-top">
                <textarea class="delegate-task-input" rows="1"
                    placeholder="Describe this task..."
                    oninput="updateDelegateTask(${idx}, 'title', this.value); this.style.height='auto'; this.style.height=this.scrollHeight+'px';"
                >${task.title || ''}</textarea>
                <button class="delegate-more-btn" onclick="toggleDelegateMore(${idx}, event)" title="More options">
                    <span class="material-icons-outlined">more_vert</span>
                </button>
                <div class="delegate-dropdown delegate-more-dropdown" id="delegate-more-${idx}">
                    <div class="delegate-dropdown-item danger" onclick="removeDelegateTask(${idx})">
                        <span class="material-icons-outlined" style="font-size:16px">delete_outline</span>
                        Delete task
                    </div>
                </div>
            </div>
            ${noteExpanded ? `
                <textarea class="delegate-note-input" rows="2"
                    placeholder="Add instructions for this task..."
                    oninput="updateDelegateTask(${idx}, 'note', this.value); this.style.height='auto'; this.style.height=this.scrollHeight+'px';"
                >${task.note || ''}</textarea>
            ` : `
                <button class="delegate-add-note-btn" onclick="expandDelegateNote(${idx})">
                    <span class="material-icons-outlined" style="font-size:14px">add</span>
                    Add note
                </button>
            `}
            <div class="delegate-chips-row">
                <div class="delegate-chips-left">
                    <button class="delegate-chip" onclick="toggleDelegatePriority(${idx}, event)">
                        <span class="delegate-priority-dot" style="background:${priorityColor}"></span>
                        ${priorityLabel}
                        <span class="material-icons-outlined" style="font-size:14px">arrow_drop_down</span>
                    </button>
                    <div class="delegate-dropdown delegate-priority-dropdown" id="delegate-priority-${idx}">
                        ${['high', 'medium', 'low'].map(p => `
                            <div class="delegate-dropdown-item ${task.priority === p ? 'active' : ''}"
                                 onclick="updateDelegateTask(${idx}, 'priority', '${p}'); closeDelegateDropdowns(); renderDelegateModal();">
                                <span class="delegate-priority-dot" style="background:${priorityColors[p]}"></span>
                                ${priorityLabels[p]}
                            </div>
                        `).join('')}
                    </div>
                    <button class="delegate-chip ${dlChip.show ? dlChip.cssClass : ''}" onclick="openDelegateDeadline(${idx}, event)"
                        ${dlChip.show ? `title="${dlChip.tooltip}"` : ''}>
                        <span class="material-icons-outlined" style="font-size:14px">${dlChip.show ? dlChip.icon : 'calendar_today'}</span>
                        ${deadlineDisplay}
                    </button>
                    <input type="date" class="delegate-date-hidden" id="delegate-date-${idx}"
                           value="${task.deadline || ''}"
                           onchange="updateDelegateTask(${idx}, 'deadline', this.value); renderDelegateModal();">
                </div>
                <div class="delegate-assignee-wrap">
                    <button class="delegate-assignee-avatar" style="background:${assignee.color}"
                            onclick="toggleDelegateAssignee(${idx}, event)" title="${assignee.name}">
                        ${assignee.initials}
                    </button>
                    <div class="delegate-dropdown delegate-assignee-dropdown" id="delegate-assignee-${idx}">
                        ${ACTION_OFFICERS.map(ao => `
                            <div class="delegate-dropdown-item ${task.assignee === ao.id ? 'active' : ''}"
                                 onclick="updateDelegateTask(${idx}, 'assignee', '${ao.id}'); closeDelegateDropdowns(); renderDelegateModal();">
                                <span class="delegate-ao-avatar" style="background:${ao.color}">${ao.initials}</span>
                                <span>${ao.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------
// TASK SUBMIT MODAL CONTENT (AO)
// ------------------------------------------
// Enhanced: file upload is now inline in this modal.
// No separate "Attach Files" section needed in the task detail.
// One modal, one action moment — comment + upload + submit.

// Tracks files added in the current submit modal session
let _submitModalFiles = [];

function renderTaskSubmitModal(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;

    const body = document.getElementById('task-submit-modal-body');
    const isResubmit = task.status === 'sent_back';

    // Update modal title and footer button based on resubmit state
    const titleEl = document.getElementById('task-submit-modal-title');
    const submitBtn = document.getElementById('task-submit-btn');
    const hintEl = document.querySelector('.task-submit-hint');
    if (titleEl) titleEl.textContent = isResubmit ? 'Resubmit for Review' : 'Complete Task';
    if (submitBtn) {
        submitBtn.innerHTML = isResubmit
            ? '<span class="material-icons-outlined" style="font-size:18px">refresh</span> Resubmit for Review'
            : '<span class="material-icons-outlined" style="font-size:18px">check_circle</span> Complete Task';
    }
    if (hintEl) {
        hintEl.textContent = isResubmit
            ? 'Please explain what changed in this revision.'
            : 'Nothing to add? Just hit complete.';
        hintEl.style.color = isResubmit ? 'var(--warning)' : '';
    }

    // Reset modal-session files
    _submitModalFiles = [];

    // Also include any pre-staged pending docs (from earlier sessions)
    const alreadySubmittedIds = new Set();
    if (task.submissions) {
        task.submissions.forEach(sub => {
            if (sub.documents) sub.documents.forEach(id => alreadySubmittedIds.add(id));
        });
    }
    const pendingDocIds = task.pendingDocs || [];
    const preStagedDrafts = pendingDocIds
        .filter(id => !alreadySubmittedIds.has(id))
        .map(id => state.drafts.find(d => d.id === id))
        .filter(Boolean);

    // Pre-load any previously staged files into the modal list
    preStagedDrafts.forEach(doc => {
        _submitModalFiles.push({ id: doc.id, name: doc.name, type: doc.type, existing: true });
    });

    let html = '';

    // Task reference
    html += `
        <div style="padding:12px;background:var(--gray-50);border-radius:var(--radius-md);margin-bottom:16px">
            <div style="font-size:12px;color:var(--gray-500);margin-bottom:4px">Task</div>
            <div style="font-size:14px;font-weight:500;color:var(--gray-800)">${task.title}</div>
        </div>
    `;

    // Note field
    html += `
        <div class="form-group">
            <label class="form-label">
                <span class="material-icons-outlined" style="font-size:16px;vertical-align:-3px;margin-right:4px;color:var(--gray-400)">chat_bubble_outline</span>
                Note${isResubmit ? ' (required)' : ' (optional)'}
            </label>
            <textarea class="form-textarea" id="task-submit-comment" placeholder="${isResubmit ? 'Explain what you changed...' : 'Add any notes for the reviewer...'}" rows="3"></textarea>
        </div>
    `;

    // Attachments — inline upload area + file list
    html += `
        <div class="form-group">
            <label class="form-label">
                <span class="material-icons-outlined" style="font-size:16px;vertical-align:-3px;margin-right:4px;color:var(--gray-400)">attach_file</span>
                Attachments (optional)
            </label>
            <div id="submit-modal-file-list"></div>
            <div class="submit-upload-area" onclick="document.getElementById('submit-modal-file-input').click()">
                <span class="material-icons-outlined" style="font-size:24px;color:var(--gray-400)">cloud_upload</span>
                <span style="font-size:13px;color:var(--gray-500)">Click to upload or drag & drop</span>
                <span style="font-size:11px;color:var(--gray-400)">PDF, DOC, XLS, images</span>
                <input type="file" id="submit-modal-file-input" style="display:none"
                    onchange="handleSubmitModalFileSelect(this)"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
            </div>
        </div>
    `;

    body.innerHTML = html;

    // Render any pre-staged files
    if (_submitModalFiles.length > 0) {
        renderSubmitModalFileList();
    }
}

// When user picks a file in the submit modal
function handleSubmitModalFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    // Determine file type from extension
    const ext = file.name.split('.').pop().toLowerCase();
    let type = 'pdf';
    if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'excel';
    else if (['doc', 'docx'].includes(ext)) type = 'word';
    else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) type = 'image';

    // Create a draft doc and add to state
    const newDoc = {
        id: 'draft_' + Date.now(),
        name: file.name,
        type: type,
        size: formatFileSize(file.size),
        uploadedBy: state.currentRole,
        uploadedAt: 'Just now',
        content: file  // keep reference for real upload
    };

    state.drafts.push(newDoc);

    // Track on task pending docs
    const task = getTaskById(state.selectedTaskId);
    if (task) {
        if (!task.pendingDocs) task.pendingDocs = [];
        task.pendingDocs.push(newDoc.id);
    }

    // Add to modal file list
    _submitModalFiles.push({ id: newDoc.id, name: newDoc.name, type: newDoc.type, size: newDoc.size, existing: false });

    // Re-render file list
    renderSubmitModalFileList();

    // Reset input so same file can be re-selected
    input.value = '';
}

// Render the file list inside the submit modal
function renderSubmitModalFileList() {
    const container = document.getElementById('submit-modal-file-list');
    if (!container) return;

    if (_submitModalFiles.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = _submitModalFiles.map((f, idx) => {
        const fileColor = getDocTypeColor(f);
        return `
            <div class="submit-modal-file-card">
                <div class="submit-modal-file-icon" style="background:${fileColor}15">
                    <span class="material-icons-outlined" style="font-size:16px;color:${fileColor}">${getDocIcon(f)}</span>
                </div>
                <div class="submit-modal-file-info">
                    <span class="submit-modal-file-name">${f.name}</span>
                    ${f.size ? `<span class="submit-modal-file-size">${f.size}</span>` : ''}
                </div>
                <button class="submit-modal-file-remove" onclick="removeSubmitModalFile(${idx})" title="Remove">
                    <span class="material-icons-outlined" style="font-size:16px">close</span>
                </button>
            </div>
        `;
    }).join('');
}

// Remove a file from the submit modal list
function removeSubmitModalFile(idx) {
    const removed = _submitModalFiles.splice(idx, 1)[0];
    if (removed) {
        // Remove from task pendingDocs and drafts
        const task = getTaskById(state.selectedTaskId);
        if (task && task.pendingDocs) {
            task.pendingDocs = task.pendingDocs.filter(id => id !== removed.id);
        }
        state.drafts = state.drafts.filter(d => d.id !== removed.id);
    }
    renderSubmitModalFileList();
}

// Helper: format bytes into human-readable size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Make all functions globally available
window.renderTaskTab = renderTaskTab;
window.renderTaskDetailOverlay = renderTaskDetailOverlay;
window.renderCSTaskTab = renderCSTaskTab;
window.getTaskStatusIcon = getTaskStatusIcon;
window.setTaskFilter = setTaskFilter;
window.toggleTaskMenu = toggleTaskMenu;
window.closeTaskMenu = closeTaskMenu;
window.renderTaskMenuDropdown = renderTaskMenuDropdown;
window.getTaskMenuItems = getTaskMenuItems;
window.toggleTaskDetailMenu = toggleTaskDetailMenu;
window.closeTaskDetailMenu = closeTaskDetailMenu;
window.renderTaskDetailMenuDropdown = renderTaskDetailMenuDropdown;
window.filterTasksByAO = filterTasksByAO;
window.renderAOTaskTab = renderAOTaskTab;
window.renderTaskCard = renderTaskCard;
window.renderStatusPills = renderStatusPills;
window.renderTaskDetail = renderTaskDetail;
window.renderActivityThread = renderActivityThread;
window.renderCSReviewCard = renderCSReviewCard;
window.renderSubmissionEntry = renderSubmissionEntry;
window.renderSubmissionBlock = renderSubmissionBlock;
window.renderTaskDetailActions = renderTaskDetailActions;
window.renderAOTasksOverview = renderAOTasksOverview;
window.renderCSTasksOverview = renderCSTasksOverview;
window.renderDelegateModal = renderDelegateModal;
window.renderDelegateTaskCard = renderDelegateTaskCard;
window.renderTaskSubmitModal = renderTaskSubmitModal;
window.handleSubmitModalFileSelect = handleSubmitModalFileSelect;
window.renderSubmitModalFileList = renderSubmitModalFileList;
window.removeSubmitModalFile = removeSubmitModalFile;
window.formatFileSize = formatFileSize;
window.getPendingDocs = getPendingDocs;
window.getDocIcon = getDocIcon;
window.getDocTypeColor = getDocTypeColor;
window.renderClampedText = renderClampedText;
window.toggleClampedText = toggleClampedText;
window.formatRelativeTime = formatRelativeTime;
