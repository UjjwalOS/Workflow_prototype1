/*
 * =============================================
 * TASK ACTION HANDLERS
 * =============================================
 *
 * Functions that handle user actions on tasks:
 * - Opening/closing task detail
 * - Delegate modal interactions
 * - AO: Submit task for review
 * - CS: Approve / Send Back
 * - Task status transitions
 *
 * This file handles WHAT happens.
 * For how things LOOK, see render-tasks.js
 */

// ------------------------------------------
// TASK DETAIL NAVIGATION
// ------------------------------------------

// Open the task detail overlay (covers entire details panel)
function openTaskDetail(taskId) {
    state.selectedTaskId = taskId;

    // If we're not on the task tab, switch to it (which renders list + overlay)
    if (state.activeTab !== 'task') {
        switchTab('task');
    } else {
        // Just show the overlay — no need to re-render the task list
        renderTaskDetailOverlay();
    }
}

// Close the task detail overlay (reveals task list underneath)
function closeTaskDetail() {
    state.selectedTaskId = null;
    renderTaskDetailOverlay();
}

// ------------------------------------------
// DELEGATE MODAL (CS assigns tasks to AOs)
// ------------------------------------------

// Pre-written realistic task descriptions for demo presentations.
// Each "Add Task" click auto-fills the next one so you don't have to type.
const DEMO_DELEGATE_TASKS = [
    'Review and verify budget allocation figures for all departments',
    'Prepare a summary memo with key findings and recommendations',
    'Cross-check proposed expenditures against existing policy guidelines',
    'Coordinate with the Finance Department for updated revenue projections',
    'Draft a response letter addressing the concerns raised in the proposal',
    'Compile supporting documents and annexures for cabinet submission',
    'Verify compliance with the Public Finance Management Act',
    'Schedule and coordinate a briefing session with department heads',
];

// Tracks which demo task to use next (resets when modal opens)
let _demoTaskIdx = 0;

// Open the delegate modal with one pre-filled task card
function openDelegateModal() {
    _demoTaskIdx = 0;
    const firstTask = DEMO_DELEGATE_TASKS[_demoTaskIdx++];
    state.delegateModal.tasks = [{
        title: firstTask,
        assignee: ACTION_OFFICERS[0].id,
        priority: 'medium',
        deadline: '',
        note: '',
        _noteExpanded: false
    }];
    openModal('delegate-modal');
    renderDelegateModal();
}

// Add a new task card with the next demo description pre-filled
function addDelegateTask() {
    const demoTitle = DEMO_DELEGATE_TASKS[_demoTaskIdx % DEMO_DELEGATE_TASKS.length];
    _demoTaskIdx++;
    state.delegateModal.tasks.push({
        title: demoTitle,
        assignee: ACTION_OFFICERS[0].id,  // Default to first AO
        priority: 'medium',
        deadline: '',
        note: '',              // Per-task instructions (CS writes here)
        _noteExpanded: false   // UI state: is the note textarea visible?
    });
    renderDelegateModal();
}

// Update a field on a delegate task card
function updateDelegateTask(idx, field, value) {
    if (state.delegateModal.tasks[idx]) {
        state.delegateModal.tasks[idx][field] = value;
    }
}

// Remove a task card from the delegate modal
function removeDelegateTask(idx) {
    state.delegateModal.tasks.splice(idx, 1);
    renderDelegateModal();
}

// Submit the delegate modal — create tasks and assign them
function submitDelegate() {
    const tasks = state.delegateModal.tasks;

    // Validation: need at least one task with a title
    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.length === 0) {
        showToast('Please add at least one task with a description', 'error');
        return;
    }

    // Create task objects in state
    validTasks.forEach(taskDraft => {
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: taskDraft.title.trim(),
            description: '',
            instructions: (taskDraft.note || '').trim(),  // Per-task note from delegate modal
            status: TASK_STATUS.IN_PROGRESS,  // Start as in_progress
            assignee: taskDraft.assignee,
            priority: taskDraft.priority,
            deadline: taskDraft.deadline ? formatDateForDisplay(taskDraft.deadline) : '',
            deadlineISO: taskDraft.deadline || '',  // Keep ISO string for deadline calculations
            createdAt: new Date().toISOString(),
            createdBy: 'cs',
            submissions: [],
            pendingDocs: []
        };
        state.tasks.push(newTask);
    });

    // Also populate legacy actionItems for backward compatibility
    state.actionItems = state.tasks.filter(t => t.assignee === 'ao').map(t => ({
        id: t.id,
        title: t.title,
        completed: t.status === 'completed'
    }));
    state.taskAssignment.assignedBy = 'cs';
    state.taskAssignment.assignedAt = new Date().toISOString();

    // CS stays the case holder — delegation only creates tasks for AOs.
    // The case never leaves CS. All back-and-forth happens at the TASK level.
    state.caseInfo.pendingAction = 'delegation';
    state.caseInfo.pendingFrom = 'cs';

    // Add event — list all unique AO IDs who got tasks
    const assigneeIds = [...new Set(validTasks.map(t => t.assignee))];
    const assigneeNames = assigneeIds.map(id => {
        const ao = getAOInfo(id);
        return ao ? ao.name : 'AO';
    }).join(', ');

    // Collect any real instructions the user typed on the task cards
    const taskInstructions = validTasks
        .filter(t => t.note && t.note.trim())
        .map(t => t.note.trim());

    state.events.unshift({
        id: Date.now(),
        type: 'delegated',
        actor: 'cs',
        // Use actual assignee: single AO id if one, or array if multiple
        target: assigneeIds.length === 1 ? assigneeIds[0] : null,
        targets: assigneeIds.length > 1 ? assigneeIds : null,
        // Only show instructions if the user actually wrote something
        note: taskInstructions.length > 0 ? taskInstructions.join(' · ') : null,
        timestamp: new Date().toISOString()
    });

    // Notify each AO who got assigned a task
    validTasks.forEach(taskDraft => {
        addNotification({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            type: 'task_assigned',
            icon: 'assignment_ind',
            iconColor: '#2563eb',
            title: `Task assigned: ${taskDraft.title.trim()}`,
            subtitle: `Workflow: ${state.caseInfo.title || 'Untitled'} · by ${ROLES.cs.name}`,
            targetRole: taskDraft.assignee,
            taskId: state.tasks.find(t => t.title === taskDraft.title.trim())?.id || null,
            timestamp: new Date().toISOString(),
            read: false
        });
    });

    // Close modal and re-render
    closeModal('delegate-modal');
    renderAll();

    showToast(`${validTasks.length} task${validTasks.length > 1 ? 's' : ''} delegated to ${assigneeNames}`, 'success');
}

// ------------------------------------------
// AO: SUBMIT TASK FOR REVIEW
// ------------------------------------------

function openTaskSubmitModal(taskId, focusTarget) {
    state.selectedTaskId = taskId;
    openModal('task-submit-modal');
    renderTaskSubmitModal(taskId);

    // Focus the right section based on which shortcut was clicked
    if (focusTarget === 'comment') {
        setTimeout(() => {
            document.getElementById('task-submit-comment')?.focus();
        }, 100);
    } else if (focusTarget === 'attach') {
        setTimeout(() => {
            document.getElementById('submit-modal-file-input')?.click();
        }, 100);
    }
}

function submitTaskForReview() {
    const task = getTaskById(state.selectedTaskId);
    if (!task) return;

    const comment = document.getElementById('task-submit-comment')?.value.trim() || '';

    // Gather doc IDs from the modal's file list (_submitModalFiles lives in render-tasks.js)
    const docIds = (typeof _submitModalFiles !== 'undefined' ? _submitModalFiles : []).map(f => f.id);

    // Create a submission record on the task
    // submittedBy tracks WHO submitted — important after reassignment
    const submission = {
        id: 'sub_' + Date.now(),
        submittedBy: state.currentRole,
        submittedAt: new Date().toISOString(),
        comment: comment,
        documents: [...docIds],
        feedback: null,
        feedbackAt: null,
        status: 'pending'  // Will be 'approved' or 'sent_back' after CS reviews
    };

    task.submissions.push(submission);
    task.status = TASK_STATUS.SUBMITTED;

    // Remove submitted docs from pendingDocs (they're now officially submitted)
    if (task.pendingDocs && docIds.length > 0) {
        task.pendingDocs = task.pendingDocs.filter(id => !docIds.includes(id));
    }

    // Also handle document submission (move drafts to submissions like old system)
    if (docIds.length > 0) {
        const selectedDrafts = state.drafts.filter(d => docIds.includes(d.id));
        if (selectedDrafts.length > 0) {
            const existingRounds = state.submissions.filter(s => s.submittedBy === state.currentRole).length;
            const newSubmission = {
                id: 'sub_' + Date.now(),
                round: existingRounds + 1,
                submittedBy: state.currentRole,
                submittedTo: 'cs',
                submittedAt: new Date().toISOString(),
                inResponseTo: task.submissions.length <= 1 ? 'Initial delegation' : 'Revision request',
                status: 'under-review',
                documents: selectedDrafts.map(d => ({
                    id: d.id, name: d.name, type: d.type, size: d.size,
                    uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt, content: d.content
                })),
                viewedBy: []
            };
            state.submissions.push(newSubmission);
        }
    }

    // Case stays with CS — only the TASK status changes to 'submitted'.
    // No case holder transfer needed.

    // Add event
    state.events.unshift({
        id: Date.now(),
        type: 'submitted',
        actor: state.currentRole,
        target: 'cs',
        note: `Submitted task "${task.title}" for review`,
        timestamp: new Date().toISOString()
    });

    // Update legacy actionItems
    syncLegacyActionItems();

    // Notify CS that a task was submitted for review
    const aoInfo = getAOInfo(task.assignee);
    addNotification({
        id: 'notif-' + Date.now(),
        type: 'task_submitted',
        icon: 'assignment_turned_in',
        iconColor: '#2563eb',
        title: `Task submitted: ${task.title}`,
        subtitle: `Workflow: ${state.caseInfo.title || 'Untitled'} · by ${aoInfo ? aoInfo.name : 'Action Officer'}`,
        targetRole: 'cs',
        taskId: task.id,
        timestamp: new Date().toISOString(),
        read: false
    });

    // Close modal and re-render
    closeModal('task-submit-modal');
    renderAll();

    showToast('Task submitted for review', 'success');
}

// ------------------------------------------
// CS: APPROVE TASK
// ------------------------------------------

function openTaskApproveModal(taskId) {
    state.selectedTaskId = taskId;
    openModal('task-approve-modal');
}

function confirmTaskApprove() {
    const task = getTaskById(state.selectedTaskId);
    if (!task) return;

    const comment = document.getElementById('task-approve-comment')?.value.trim() || '';

    // Update task status
    task.status = TASK_STATUS.COMPLETED;

    // Mark the latest submission as approved and save CS feedback
    // so the approval entry shows in the History timeline.
    // If CS left a comment, it shows as feedback text.
    // If no comment, we store a space marker so the entry still renders.
    if (task.submissions.length > 0) {
        const latestSub = task.submissions[task.submissions.length - 1];
        latestSub.status = 'approved';
        latestSub.feedback = comment || ' ';
        latestSub.feedbackAt = new Date().toISOString();
    }

    // Case always stays with CS — no holder change needed.

    // Add event
    state.events.unshift({
        id: Date.now(),
        type: 'task_approved',
        actor: 'cs',
        note: `Approved task "${task.title}"${comment ? ': ' + comment : ''}`,
        timestamp: new Date().toISOString()
    });

    // Update legacy actionItems
    syncLegacyActionItems();

    // Notify the assigned AO that their task was approved
    addNotification({
        id: 'notif-' + Date.now(),
        type: 'task_approved',
        icon: 'check_circle',
        iconColor: '#16a34a',
        title: `Task approved: ${task.title}`,
        subtitle: `Workflow: ${state.caseInfo.title || 'Untitled'} · by ${ROLES.cs.name}`,
        targetRole: task.assignee,
        taskId: task.id,
        timestamp: new Date().toISOString(),
        read: false
    });

    // Clear comment field
    document.getElementById('task-approve-comment').value = '';

    // Close modal and re-render
    closeModal('task-approve-modal');
    renderAll();

    showToast(`Task approved successfully`, 'success');
}

// ------------------------------------------
// CS: SEND BACK TASK
// ------------------------------------------

function openTaskSendBackModal(taskId) {
    state.selectedTaskId = taskId;
    openModal('task-sendback-modal');
}

function confirmTaskSendBack() {
    const task = getTaskById(state.selectedTaskId);
    if (!task) return;

    const reason = document.getElementById('task-sendback-reason')?.value.trim() || '';
    if (!reason) {
        showToast('Please describe what needs to be revised', 'error');
        return;
    }

    // Update task status
    task.status = TASK_STATUS.SENT_BACK;

    // Add feedback to the latest submission
    if (task.submissions.length > 0) {
        const latestSub = task.submissions[task.submissions.length - 1];
        latestSub.status = 'sent_back';
        latestSub.feedback = reason;
        latestSub.feedbackAt = new Date().toISOString();
    }

    // Case stays with CS — only the TASK status changes to 'sent_back'.
    // AO will see their task status changed, but case holder doesn't move.

    // Add event
    state.events.unshift({
        id: Date.now(),
        type: 'returned',
        actor: 'cs',
        target: task.assignee,
        note: `"${task.title}": ${reason}`,
        timestamp: new Date().toISOString()
    });

    // Notify the assigned AO that their task needs revision
    addNotification({
        id: 'notif-' + Date.now(),
        type: 'task_sent_back',
        icon: 'reply',
        iconColor: '#f59e0b',
        title: `Revision requested: ${task.title}`,
        subtitle: `Workflow: ${state.caseInfo.title || 'Untitled'} · by ${ROLES.cs.name}`,
        targetRole: task.assignee,
        taskId: task.id,
        timestamp: new Date().toISOString(),
        read: false
    });

    // Update legacy actionItems
    syncLegacyActionItems();

    // Clear reason field
    document.getElementById('task-sendback-reason').value = '';

    // Close modal and re-render
    closeModal('task-sendback-modal');
    renderAll();

    const aoInfo = getAOInfo(task.assignee);
    showToast(`Revision requested from ${aoInfo ? aoInfo.name : 'Action Officer'}`, 'success');
}

// ------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------

// Format an ISO date string to a readable display format
function formatDateForDisplay(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Sync the new task system with the legacy actionItems array
// (so old code that reads actionItems still works)
function syncLegacyActionItems() {
    state.actionItems = state.tasks
        .filter(t => t.assignee === 'ao')
        .map(t => ({
            id: t.id,
            title: t.title,
            completed: t.status === 'completed'
        }));
}

// ------------------------------------------
// DELEGATE MODAL — INLINE DROPDOWN TOGGLES
// ------------------------------------------
// These handle the small popup pickers inside delegate task cards

// Close all open delegate dropdowns
function closeDelegateDropdowns() {
    document.querySelectorAll('.delegate-dropdown.open').forEach(el => {
        el.classList.remove('open');
    });
}

// Toggle the priority picker dropdown
function toggleDelegatePriority(idx, event) {
    event.stopPropagation();
    const dropdown = document.getElementById('delegate-priority-' + idx);
    const isOpen = dropdown.classList.contains('open');
    closeDelegateDropdowns();
    if (!isOpen) dropdown.classList.add('open');
}

// Toggle the assignee picker dropdown
function toggleDelegateAssignee(idx, event) {
    event.stopPropagation();
    const dropdown = document.getElementById('delegate-assignee-' + idx);
    const isOpen = dropdown.classList.contains('open');
    closeDelegateDropdowns();
    if (!isOpen) dropdown.classList.add('open');
}

// Toggle the three-dot "more" menu
function toggleDelegateMore(idx, event) {
    event.stopPropagation();
    const dropdown = document.getElementById('delegate-more-' + idx);
    const isOpen = dropdown.classList.contains('open');
    closeDelegateDropdowns();
    if (!isOpen) dropdown.classList.add('open');
}

// Open the hidden native date picker
function openDelegateDeadline(idx, event) {
    event.stopPropagation();
    closeDelegateDropdowns();
    const dateInput = document.getElementById('delegate-date-' + idx);
    if (dateInput) {
        dateInput.showPicker();
    }
}

// Close dropdowns when clicking anywhere
document.addEventListener('click', function(e) {
    // Close delegate dropdowns
    if (!e.target.closest('.delegate-dropdown') && !e.target.closest('.delegate-chip') &&
        !e.target.closest('.delegate-more-btn') && !e.target.closest('.delegate-assignee-avatar')) {
        closeDelegateDropdowns();
    }

    // Close task card three-dot menu when clicking outside
    if (state.openTaskMenuId && !e.target.closest('.task-card-v2-menu-wrapper')) {
        state.openTaskMenuId = null;
        renderTaskTab();
    }
});

// ------------------------------------------
// ATTACH DOCUMENT TO TASK (separate from Submit)
// ------------------------------------------
// Opens a modal that lets the AO upload/attach a document
// to a task WITHOUT submitting the task for review.

function openTaskAttachModal(taskId) {
    state.selectedTaskId = taskId;
    openModal('task-attach-modal');
    renderTaskAttachModal(taskId);
}

function renderTaskAttachModal(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;

    const body = document.getElementById('task-attach-modal-body');

    let html = '';

    // Simulated file upload area
    html += `
        <div class="form-group">
            <label class="form-label">Document Name</label>
            <input type="text" class="form-input" id="task-attach-name" placeholder="e.g. Budget_2025.pdf" />
        </div>
        <div class="form-group">
            <label class="form-label">Upload File</label>
            <div class="file-upload-area" id="task-attach-drop" onclick="document.getElementById('task-attach-file-input').click()">
                <span class="material-icons-outlined" style="font-size:32px;color:var(--gray-400)">cloud_upload</span>
                <p style="margin:8px 0 0;font-size:13px;color:var(--gray-500)">Click to browse or drag and drop</p>
                <p style="margin:4px 0 0;font-size:11px;color:var(--gray-400)">PDF, DOC, DOCX, XLS (max 10MB)</p>
                <input type="file" id="task-attach-file-input" style="display:none" onchange="handleTaskFileSelect(this)" accept=".pdf,.doc,.docx,.xls,.xlsx" />
            </div>
            <div id="task-attach-file-name" style="display:none;margin-top:8px;padding:8px 12px;background:var(--gray-50);border-radius:var(--radius-sm);font-size:13px;color:var(--gray-700)"></div>
        </div>
    `;

    body.innerHTML = html;
}

// When user picks a file, show the file name and auto-fill the doc name
function handleTaskFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const nameDisplay = document.getElementById('task-attach-file-name');
    const nameInput = document.getElementById('task-attach-name');

    nameDisplay.style.display = 'block';
    nameDisplay.innerHTML = `
        <span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;color:var(--success);margin-right:4px">check_circle</span>
        ${file.name}
    `;

    // Auto-fill the document name if empty
    if (!nameInput.value.trim()) {
        nameInput.value = file.name;
    }
}

async function attachDocumentToTask() {
    const task = getTaskById(state.selectedTaskId);
    if (!task) return;

    const nameInput = document.getElementById('task-attach-name');
    const fileInput = document.getElementById('task-attach-file-input');
    const docName = nameInput?.value.trim();

    if (!docName) {
        showToast('Please enter a document name', 'warning');
        return;
    }

    let newDoc;
    const file = fileInput?.files[0];

    if (file && typeof caseManager !== 'undefined') {
        // Real file upload path
        const result = await caseManager.attachFile(file, state.currentRole);
        result.docRecord.id = 'draft_' + Date.now();
        result.docRecord.status = 'draft';
        result.docRecord.name = docName;
        newDoc = result.docRecord;
    } else {
        // Fallback: create a record without a real file
        const ext = docName.split('.').pop().toLowerCase();
        let type = 'pdf';
        if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'excel';
        else if (['doc', 'docx'].includes(ext)) type = 'word';

        newDoc = {
            id: 'draft_' + Date.now(),
            name: docName,
            type: type,
            size: '—',
            uploadedBy: state.currentRole,
            uploadedAt: new Date().toISOString(),
            content: null
        };
    }

    // Add to the global drafts array
    state.drafts.push(newDoc);

    // Track this doc as pending on the task (not yet submitted)
    if (!task.pendingDocs) task.pendingDocs = [];
    task.pendingDocs.push(newDoc.id);

    // Ensure task is in_progress when AO starts working
    task.status = TASK_STATUS.IN_PROGRESS;

    closeModal('task-attach-modal');
    renderAll();
    showToast('Document attached to task', 'success');
}

// ------------------------------------------
// EXPAND NOTE IN DELEGATE CARD
// ------------------------------------------
// Toggles the per-task note textarea open in the delegate modal

function expandDelegateNote(idx) {
    if (state.delegateModal.tasks[idx]) {
        state.delegateModal.tasks[idx]._noteExpanded = true;
        renderDelegateModal();
        // Focus the note input after render
        setTimeout(() => {
            const noteInputs = document.querySelectorAll('.delegate-note-input');
            if (noteInputs[idx]) noteInputs[idx].focus();
        }, 50);
    }
}

// ------------------------------------------
// REMOVE PENDING DOC FROM TASK
// ------------------------------------------
// Removes a doc from task.pendingDocs (AO detaches before submitting)

function removePendingDoc(taskId, docId) {
    const task = getTaskById(taskId);
    if (!task || !task.pendingDocs) return;

    // Remove from task's pending list
    task.pendingDocs = task.pendingDocs.filter(id => id !== docId);

    // Also remove from drafts if it was only attached to this task
    state.drafts = state.drafts.filter(d => d.id !== docId);

    renderAll();
    showToast('Document removed', 'info');
}

// ------------------------------------------
// CANCEL TASK (CS only)
// ------------------------------------------
// Opens modal with warning + mandatory comment.
// Stores the task ID so confirmCancelTask knows what to cancel.

let _cancelTaskId = null;

function openCancelTaskModal(taskId) {
    _cancelTaskId = taskId;
    state.openTaskMenuId = null;
    state.openTaskDetailMenuId = null;
    renderTaskTab();
    const task = getTaskById(taskId);
    if (!task) return;

    const body = document.getElementById('cancel-task-modal-body');
    const aoInfo = getAOInfo(task.assignee);
    const aoName = aoInfo ? aoInfo.name : 'the Action Officer';

    // Show a contextual warning depending on the task's current state.
    // If the AO already submitted work, CS should know they're discarding it.
    // If the AO is mid-work, CS should know they're interrupting active effort.
    let warningHTML = '';
    if (task.status === 'submitted') {
        warningHTML = `
            <div class="cancel-warning cancel-warning--submitted">
                <span class="material-icons-outlined">warning</span>
                <p>${aoName} has already submitted work on this task. Cancelling will discard their submission.</p>
            </div>
        `;
    } else if (task.status === 'in_progress') {
        warningHTML = `
            <div class="cancel-warning cancel-warning--progress">
                <span class="material-icons-outlined">info</span>
                <p>${aoName} is currently working on this task.</p>
            </div>
        `;
    } else if (task.status === 'sent_back') {
        warningHTML = `
            <div class="cancel-warning cancel-warning--progress">
                <span class="material-icons-outlined">info</span>
                <p>${aoName} is revising this task based on your feedback.</p>
            </div>
        `;
    }

    body.innerHTML = `
        ${warningHTML}
        <div class="form-group">
            <label class="form-label">Reason for cancellation</label>
            <textarea id="cancel-task-reason" class="form-textarea" placeholder="Why is this task being cancelled?" rows="4"></textarea>
        </div>
    `;

    openModal('cancel-task-modal');
}

function confirmCancelTask() {
    const reason = document.getElementById('cancel-task-reason').value.trim();

    const task = getTaskById(_cancelTaskId);
    if (!task) return;

    // Reason is always required when cancelling a task.
    if (!reason) {
        showToast('Please provide a reason for cancellation', 'error');
        document.getElementById('cancel-task-reason').style.borderColor = '#ef4444';
        document.getElementById('cancel-task-reason').focus();
        return;
    }

    // Update task status
    task.status = 'cancelled';
    task.cancelledAt = new Date().toISOString();
    task.cancelledBy = 'cs';
    task.cancelReason = reason || '';

    // Record in task history (shows in Updates thread)
    if (!task.history) task.history = [];
    task.history.push({
        type: 'cancelled',
        actor: 'cs',
        timestamp: new Date().toISOString(),
        detail: reason || ''
    });

    // Log event in the activity timeline
    state.events.unshift({
        id: 'evt-' + Date.now(),
        type: 'task_cancelled',
        actor: 'cs',
        target: task.assignee,
        timestamp: new Date().toISOString(),
        note: `"${task.title}"${reason ? ' — ' + reason : ''}`
    });

    // Add notification for the assigned AO
    addNotification({
        id: 'notif-' + Date.now(),
        type: 'task_cancelled',
        icon: 'cancel',
        iconColor: '#ef4444',
        title: `Task cancelled: ${task.title}`,
        subtitle: reason
            ? `"${reason.length > 60 ? reason.slice(0, 60) + '…' : reason}" · by ${ROLES.cs.name}`
            : `Workflow: ${state.caseInfo.title || 'Untitled'} · by ${ROLES.cs.name}`,
        targetRole: task.assignee,
        taskId: task.id,
        timestamp: new Date().toISOString(),
        read: false
    });

    // Sync legacy action items
    syncLegacyActionItems();

    closeModal('cancel-task-modal');
    _cancelTaskId = null;
    renderAll();

    // Show dark snackbar at the bottom
    showSnackbar('Task Cancelled');
}

// ------------------------------------------
// EDIT TASK (CS only)
// ------------------------------------------
// Opens modal to edit title, priority, deadline, and assignee.
// 'focusField' can be 'reassign' to auto-focus the assignee dropdown.

let _editTaskId = null;
let _editTaskOriginalAssignee = null;

function openEditTaskModal(taskId) {
    _editTaskId = taskId;
    state.openTaskMenuId = null;
    renderTaskTab();
    const task = getTaskById(taskId);
    if (!task) return;

    // Store original assignee so we can detect changes in real-time
    _editTaskOriginalAssignee = task.assignee;

    document.getElementById('edit-task-modal-title').textContent = 'Edit Task';

    // Build priority options
    const priorities = ['low', 'medium', 'high'];
    const priorityOptions = priorities.map(p => {
        const selected = p === (task.priority || 'medium') ? 'selected' : '';
        const label = p.charAt(0).toUpperCase() + p.slice(1);
        return `<option value="${p}" ${selected}>${label}</option>`;
    }).join('');

    // Get assignee info for the dropdown
    const aoInfo = getAOInfo(task.assignee);

    // Build assignee options
    const assigneeOptions = ACTION_OFFICERS.map(ao => `
        <div class="edit-assignee-option ${ao.id === task.assignee ? 'active' : ''}" onclick="selectEditAssignee('${ao.id}')">
            <div class="edit-assignee-avatar" style="background:${ao.color}">${ao.initials}</div>
            <span>${ao.name}</span>
        </div>
    `).join('');

    const body = document.getElementById('edit-task-modal-body');
    body.innerHTML = `
        <div id="edit-task-reassign-warning" style="display:none"></div>
        <div class="form-group">
            <label class="form-label">Task Title</label>
            <input type="text" id="edit-task-title" class="form-input" value="${task.title.replace(/"/g, '&quot;')}" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
                <label class="form-label">Priority</label>
                <select id="edit-task-priority" class="form-select">${priorityOptions}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Deadline</label>
                <input type="date" id="edit-task-deadline" class="form-input" value="${task.deadlineISO || ''}" />
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Assigned to</label>
            <div class="edit-assignee-selector" id="edit-assignee-selector">
                <button type="button" class="edit-assignee-trigger" onclick="toggleEditAssigneeDropdown(event)">
                    <div class="edit-assignee-avatar" style="background:${aoInfo ? aoInfo.color : '#6b7280'}">${aoInfo ? aoInfo.initials : '?'}</div>
                    <span class="edit-assignee-name">${aoInfo ? aoInfo.name : 'Unknown'}</span>
                    <span class="material-icons-outlined edit-assignee-arrow">expand_more</span>
                </button>
                <div class="edit-assignee-dropdown" id="edit-assignee-dropdown">
                    ${assigneeOptions}
                </div>
            </div>
            <input type="hidden" id="edit-task-assignee" value="${task.assignee}" />
        </div>
    `;

    openModal('edit-task-modal');
}

// Toggle the assignee dropdown in the Edit Task modal
function toggleEditAssigneeDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('edit-assignee-dropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

// Select an AO from the assignee dropdown
function selectEditAssignee(aoId) {
    const aoInfo = getAOInfo(aoId);
    if (!aoInfo) return;

    // Update hidden input
    document.getElementById('edit-task-assignee').value = aoId;

    // Update trigger button display
    const trigger = document.querySelector('.edit-assignee-trigger');
    const avatar = trigger.querySelector('.edit-assignee-avatar');
    const name = trigger.querySelector('.edit-assignee-name');
    avatar.style.background = aoInfo.color;
    avatar.textContent = aoInfo.initials;
    name.textContent = aoInfo.name;

    // Update active state in dropdown
    document.querySelectorAll('.edit-assignee-option').forEach(opt => opt.classList.remove('active'));
    const selected = [...document.querySelectorAll('.edit-assignee-option')].find(
        opt => opt.querySelector('span').textContent === aoInfo.name
    );
    if (selected) selected.classList.add('active');

    // Close dropdown
    document.getElementById('edit-assignee-dropdown').classList.remove('open');

    // Show/hide reassign warning if this task has a pending submission
    updateReassignWarning(aoId);
}

// Show a warning in the Edit Task modal when CS is about to reassign
// a task that has a pending submission from the original AO.
// This prevents accidental loss of submitted work.
function updateReassignWarning(newAoId) {
    const warningEl = document.getElementById('edit-task-reassign-warning');
    const saveBtn = document.querySelector('#edit-task-modal .modal-footer .btn-primary');
    if (!warningEl || !saveBtn) return;

    const task = getTaskById(_editTaskId);
    if (!task) return;

    // Show warning if:
    // 1. The assignee actually changed from the original
    // 2. The task has a notable status (submitted = strong, sent_back = soft)
    const isReassigning = newAoId !== _editTaskOriginalAssignee;
    const isSubmitted = task.status === TASK_STATUS.SUBMITTED;
    const isSentBack = task.status === TASK_STATUS.SENT_BACK;

    const oldAOInfo = getAOInfo(_editTaskOriginalAssignee);
    const oldName = oldAOInfo ? oldAOInfo.name : 'the Action Officer';
    const newName = (getAOInfo(newAoId) || {}).name || 'the new Action Officer';

    if (isReassigning && isSubmitted) {
        // Amber warning — AO already submitted finished work
        warningEl.style.display = 'block';
        warningEl.innerHTML = `
            <div class="cancel-warning cancel-warning--submitted">
                <span class="material-icons-outlined">warning</span>
                <p><strong>${oldName}</strong> has already submitted work on this task.
                Reassigning will reset status to <strong>In Progress</strong> for ${newName}.
                ${oldName}'s submission stays in task history.</p>
            </div>
        `;
        saveBtn.innerHTML = `
            <span class="material-icons-outlined" style="font-size:18px">swap_horiz</span>
            Reassign & Reset
        `;
    } else if (isReassigning && isSentBack) {
        // Blue info — AO is mid-revision, no new submission yet
        warningEl.style.display = 'block';
        warningEl.innerHTML = `
            <div class="cancel-warning cancel-warning--progress">
                <span class="material-icons-outlined">info</span>
                <p><strong>${oldName}</strong> is currently revising this task based on your feedback.</p>
            </div>
        `;
        saveBtn.innerHTML = `
            <span class="material-icons-outlined" style="font-size:18px">swap_horiz</span>
            Reassign
        `;
    } else {
        // No warning needed — hide it and restore normal button
        warningEl.style.display = 'none';
        warningEl.innerHTML = '';
        saveBtn.innerHTML = `
            <span class="material-icons-outlined" style="font-size:18px">check</span>
            Save Changes
        `;
    }
}

function confirmEditTask() {
    const task = getTaskById(_editTaskId);
    if (!task) return;

    const newTitle = document.getElementById('edit-task-title').value.trim();
    const newPriority = document.getElementById('edit-task-priority').value;
    const newDeadline = document.getElementById('edit-task-deadline').value;
    const newAssignee = document.getElementById('edit-task-assignee').value;

    if (!newTitle) {
        document.getElementById('edit-task-title').style.borderColor = '#ef4444';
        showToast('Task title cannot be empty', 'error');
        return;
    }

    // Capture what changed BEFORE applying (for history)
    const changes = [];
    if (newTitle !== task.title) changes.push({ field: 'title', from: task.title, to: newTitle });
    if (newPriority !== task.priority) changes.push({ field: 'priority', from: task.priority, to: newPriority });
    // Deadline: detect add, change, OR clear (empty string = removed)
    const oldDeadlineISO = task.deadlineISO || '';
    if (newDeadline !== oldDeadlineISO) {
        changes.push({ field: 'deadline', from: task.deadline || 'None', to: newDeadline ? formatDateForDisplay(newDeadline) : 'None' });
    }

    const isReassigned = newAssignee !== task.assignee;
    const oldAssignee = task.assignee;

    // Nothing changed? Just close silently — no toast, no re-render
    if (changes.length === 0 && !isReassigned) {
        closeModal('edit-task-modal');
        _editTaskId = null;
        return;
    }

    // Apply changes
    task.title = newTitle;
    task.priority = newPriority;
    task.deadlineISO = newDeadline || '';
    task.deadline = newDeadline ? formatDateForDisplay(newDeadline) : '';

    // Record field edits in task history
    if (!task.history) task.history = [];
    if (changes.length > 0) {
        task.history.push({
            type: 'edited',
            actor: 'cs',
            timestamp: new Date().toISOString(),
            changes: changes
        });
    }

    // Notify the assigned AO about field changes (only if NOT reassigned,
    // because reassignment already sends its own notifications)
    if (changes.length > 0 && !isReassigned) {
        // e.g. "Title, Priority updated" — so AO knows what changed without clicking in
        const fieldNames = changes.map(c => c.field.charAt(0).toUpperCase() + c.field.slice(1));
        const editSummary = fieldNames.join(', ') + ' updated';
        addNotification({
            id: 'notif-' + Date.now(),
            type: 'task_edited',
            icon: 'edit',
            iconColor: '#6b7280',
            title: `Task edited: ${task.title}`,
            subtitle: `${editSummary} · by ${ROLES.cs.name}`,
            targetRole: task.assignee,
            taskId: task.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }

    // Handle reassignment separately (its own history entry + notifications)
    if (isReassigned) {
        const oldAOInfo = getAOInfo(oldAssignee);
        const newAOInfo = getAOInfo(newAssignee);

        task.assignee = newAssignee;

        // Reset to in_progress when reassigning from submitted OR sent_back.
        // - submitted: old AO's work stays in history, new AO starts fresh
        // - sent_back: revision was for the OLD AO, not the new one
        if (task.status === TASK_STATUS.SUBMITTED || task.status === TASK_STATUS.SENT_BACK) {
            const wasSubmitted = task.status === TASK_STATUS.SUBMITTED;
            task.status = TASK_STATUS.IN_PROGRESS;

            // Mark the old submission as superseded (only if there was one)
            if (wasSubmitted && task.submissions.length > 0) {
                const latestSub = task.submissions[task.submissions.length - 1];
                latestSub.status = 'superseded';
                latestSub.feedback = 'Task was reassigned to ' + (newAOInfo ? newAOInfo.name : 'another officer');
                latestSub.feedbackAt = new Date().toISOString();
            }
        }

        // Record reassignment in task history
        task.history.push({
            type: 'reassigned',
            actor: 'cs',
            timestamp: new Date().toISOString(),
            detail: `from ${oldAOInfo ? oldAOInfo.name : 'Unknown'} to ${newAOInfo ? newAOInfo.name : 'Unknown'}`,
            fromId: oldAssignee,
            toId: newAssignee
        });

        // Build a short summary of field changes (if any happened alongside reassign)
        // e.g. "Title, Priority updated" — so both AOs know what else changed
        const fieldNames = changes.map(c => c.field.charAt(0).toUpperCase() + c.field.slice(1));
        const changeSummary = fieldNames.length > 0
            ? fieldNames.join(', ') + ' also updated'
            : '';

        // Notify the NEW assignee
        // If fields also changed, they see it in the subtitle so they know
        // the task details are different from what was originally created
        addNotification({
            id: 'notif-' + Date.now(),
            type: 'task_assigned',
            icon: 'assignment_ind',
            iconColor: '#2563eb',
            title: `Task assigned: ${task.title}`,
            subtitle: changeSummary
                ? `Workflow: ${state.caseInfo.title || 'Untitled'} · ${changeSummary} · by ${ROLES.cs.name}`
                : `Workflow: ${state.caseInfo.title || 'Untitled'} · by ${ROLES.cs.name}`,
            targetRole: newAssignee,
            taskId: task.id,
            timestamp: new Date().toISOString(),
            read: false
        });

        // Notify the OLD assignee
        // If fields also changed, mention it so they have full picture of what happened
        addNotification({
            id: 'notif-' + (Date.now() + 1),
            type: 'task_reassigned',
            icon: 'swap_horiz',
            iconColor: '#6b7280',
            title: `Task reassigned: ${task.title}`,
            subtitle: changeSummary
                ? `Reassigned to ${newAOInfo ? newAOInfo.name : 'someone else'} · ${changeSummary} · by ${ROLES.cs.name}`
                : `Reassigned to ${newAOInfo ? newAOInfo.name : 'someone else'} · by ${ROLES.cs.name}`,
            targetRole: oldAssignee,
            taskId: task.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }

    // Log event in case-level activity
    // Only significant actions go to Activity: reassign yes, minor field edits no
    // (field edits are already tracked in task.history → shown in Updates)
    if (isReassigned) {
        state.events.unshift({
            id: 'evt-' + Date.now(),
            type: 'task_reassigned',
            actor: 'cs',
            timestamp: new Date().toISOString(),
            note: `"${task.title}" to ${getAOInfo(newAssignee)?.name || 'Unknown'}`
        });
    }

    syncLegacyActionItems();
    closeModal('edit-task-modal');
    _editTaskId = null;
    renderAll();
    // Toast: tell CS what happened
    // - Only fields changed → "Task updated"
    // - Only reassigned → "Task reassigned"
    // - Both → "Task reassigned & updated" so CS knows both took effect
    const toastMsg = isReassigned
        ? (changes.length > 0 ? 'Task reassigned & updated' : 'Task reassigned')
        : 'Task updated';
    showToast(toastMsg, 'success');
}

// ------------------------------------------
// REOPEN TASK (CS only)
// ------------------------------------------
// Moves a completed task back to 'in_progress' status.

function reopenTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;

    task.status = 'in_progress';

    // Record in task history (shows in Updates thread)
    if (!task.history) task.history = [];
    task.history.push({
        type: 'reopened',
        actor: 'cs',
        timestamp: new Date().toISOString()
    });

    state.events.unshift({
        id: 'evt-' + Date.now(),
        type: 'task_reopened',
        actor: 'cs',
        timestamp: new Date().toISOString(),
        note: `"${task.title}"`
    });

    // Notify the assigned AO that their task was reopened
    addNotification({
        id: 'notif-' + Date.now(),
        type: 'task_reopened',
        icon: 'replay',
        iconColor: '#2563eb',
        title: `Task reopened: ${task.title}`,
        subtitle: `Workflow: ${state.caseInfo.title || 'Untitled'} · by ${ROLES.cs.name}`,
        targetRole: task.assignee,
        taskId: task.id,
        timestamp: new Date().toISOString(),
        read: false
    });

    syncLegacyActionItems();
    renderAll();
    showToast('Task reopened', 'info');
}

// ------------------------------------------
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// ------------------------------------------
window.openTaskDetail = openTaskDetail;
window.closeTaskDetail = closeTaskDetail;
window.openDelegateModal = openDelegateModal;
window.addDelegateTask = addDelegateTask;
window.updateDelegateTask = updateDelegateTask;
window.removeDelegateTask = removeDelegateTask;
window.submitDelegate = submitDelegate;
window.expandDelegateNote = expandDelegateNote;
window.removePendingDoc = removePendingDoc;
window.openTaskSubmitModal = openTaskSubmitModal;
window.submitTaskForReview = submitTaskForReview;
window.openTaskApproveModal = openTaskApproveModal;
window.confirmTaskApprove = confirmTaskApprove;
window.openTaskSendBackModal = openTaskSendBackModal;
window.confirmTaskSendBack = confirmTaskSendBack;
window.formatDateForDisplay = formatDateForDisplay;
window.syncLegacyActionItems = syncLegacyActionItems;
window.closeDelegateDropdowns = closeDelegateDropdowns;
window.toggleDelegatePriority = toggleDelegatePriority;
window.toggleDelegateAssignee = toggleDelegateAssignee;
window.toggleDelegateMore = toggleDelegateMore;
window.openDelegateDeadline = openDelegateDeadline;
window.openTaskAttachModal = openTaskAttachModal;
window.attachDocumentToTask = attachDocumentToTask;
window.handleTaskFileSelect = handleTaskFileSelect;
window.openCancelTaskModal = openCancelTaskModal;
window.confirmCancelTask = confirmCancelTask;
window.openEditTaskModal = openEditTaskModal;
window.toggleEditAssigneeDropdown = toggleEditAssigneeDropdown;
window.selectEditAssignee = selectEditAssignee;
window.confirmEditTask = confirmEditTask;
window.updateReassignWarning = updateReassignWarning;
window.reopenTask = reopenTask;
