/*
 * =============================================
 * MODAL HANDLING
 * =============================================
 *
 * Functions for opening, closing, and interacting with modals:
 * - Send Modal (for forwarding/delegating)
 * - Upload Modal
 * - Close Case Modal
 */

// ------------------------------------------
// MODAL OPEN/CLOSE
// ------------------------------------------

function openModal(modalId) {
    // Close any already-open modal first (prevents stacking)
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
        if (m.id !== modalId) m.classList.remove('active');
    });

    document.getElementById(modalId).classList.add('active');
    // Disable pointer-events on iframes so they don't steal clicks from the modal.
    // Browser PDF viewers (native plugins) can capture mouse events even when
    // a higher z-index element is on top.
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // Re-enable iframe pointer-events when no modals are open
    const anyOpen = document.querySelector('.modal-overlay.active');
    if (!anyOpen) {
        document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
    }
}

// ------------------------------------------
// SEND MODAL
// ------------------------------------------

function openSendModal(transitionKey) {
    const config = TRANSITIONS[transitionKey];
    if (!config) return;

    state.currentTransition = transitionKey;
    state.modalTasks = [''];
    state.modalSelectedDocs = [];
    state.modalSelectedAction = null;  // Start with nothing selected (optional)

    const isReject = transitionKey === 'cs-reject';

    document.getElementById('send-modal-title').textContent = config.title;

    let html = '';

    // Rejection warning
    if (isReject) {
        html += `
            <div class="rejection-warning">
                <span class="material-icons-outlined">warning</span>
                <div>
                    <strong>This action cannot be undone</strong>
                    <p style="margin:4px 0 0;font-size:12px;color:var(--gray-600)">The case will be permanently closed as rejected. The original sender will be notified.</p>
                </div>
            </div>
        `;
    }

    // Recipient selection/display
    if (config.showRecipientSelect && config.recipientOptions) {
        html += `
            <div class="form-group">
                <label class="form-label">To</label>
                <select class="form-select" id="modal-recipient">
                    ${config.recipientOptions.map(r => `<option value="${r}">${ROLES[r].name} - ${ROLES[r].roleTitle}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (config.recipient) {
        const recipient = ROLES[config.recipient];
        html += `
            <div class="form-group">
                <label class="form-label">To</label>
                <div class="recipient-display">
                    <div class="recipient-avatar" style="background:${recipient.color}">${recipient.initials}</div>
                    <div>
                        <div class="recipient-name">${recipient.name}</div>
                        <div class="recipient-role">${recipient.roleTitle}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Document selection
    if (config.showDocSelect && !isReject) {
        const selectableDocs = getSelectableDocuments();

        if (state.currentRole === 'ao') {
            if (selectableDocs.length > 0) {
                html += `
                    <div class="form-group">
                        <label class="form-label">Documents to Submit *</label>
                        <p class="form-helper" style="margin-bottom:8px;margin-top:0">Select at least one draft document to include</p>
                        <div class="doc-select-list" id="modal-doc-list">
                            ${selectableDocs.map(doc => `
                                <div class="doc-select-item is-draft" onclick="toggleDocSelect('${doc.id}', this)" data-is-draft="true">
                                    <div class="doc-select-checkbox"><span class="material-icons-outlined" style="display:none">check</span></div>
                                    <span class="doc-select-name">${doc.name}</span>
                                    <span class="doc-select-badge draft">Draft</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-divider"></div>
                `;
            } else {
                html += `
                    <div class="form-group">
                        <label class="form-label">Documents to Submit</label>
                        <div style="padding:24px;background:var(--gray-50);border-radius:8px;text-align:center;border:1px dashed var(--gray-300)">
                            <span class="material-icons-outlined" style="font-size:32px;color:var(--gray-400);display:block;margin-bottom:8px">upload_file</span>
                            <p style="color:var(--gray-600);font-size:13px;margin:0">No draft documents available</p>
                            <p style="color:var(--gray-400);font-size:12px;margin:4px 0 0">Upload documents first before submitting</p>
                        </div>
                    </div>
                    <div class="form-divider"></div>
                `;
            }
        } else if (selectableDocs.length > 0) {
            html += `
                <div class="form-group">
                    <label class="form-label">Documents to Forward</label>
                    <div class="doc-select-list" id="modal-doc-list">
                        ${selectableDocs.map(doc => `
                            <div class="doc-select-item selected" onclick="toggleDocSelect('${doc.id}', this)" data-is-draft="false">
                                <div class="doc-select-checkbox"><span class="material-icons-outlined">check</span></div>
                                <span class="doc-select-name">${doc.name}</span>
                                <span class="doc-select-badge original">Original</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-divider"></div>
            `;
            state.modalSelectedDocs = selectableDocs.map(d => d.id);
        }
    }

    // Action selection (optional - user can select 0 or 1 option)
    if (config.showActionSelect && config.actions) {
        html += `
            <div class="form-group">
                <label class="form-label">Action Requested (optional)</label>
                <div class="radio-options" id="modal-actions">
                    ${config.actions.map((action) => `
                        <div class="radio-option" onclick="selectAction('${action.value}', this)">
                            <div class="radio-circle"><div class="radio-dot"></div></div>
                            <div>
                                <div class="radio-label">${action.label}</div>
                                <div class="radio-desc">${action.desc}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Comments field (if enabled)
    if (config.showComments && !isReject) {
        html += `
            <div class="form-group">
                <label class="form-label">Comments (optional)</label>
                <p class="form-helper" style="margin-bottom:8px;margin-top:0">Add any notes or instructions (max 500 words)</p>
                <textarea class="form-textarea" id="modal-comments" placeholder="Type your comments here..." maxlength="2500"></textarea>
                <div class="textarea-counter" style="text-align:right;font-size:11px;color:var(--gray-400);margin-top:4px">
                    <span id="comment-count">0</span> / 2500 characters
                </div>
            </div>
        `;
    }

    // Task input (for delegation)
    if (config.showTasks) {
        html += `
            <div class="form-group">
                <label class="form-label">Action Items</label>
                <p class="form-helper" style="margin-bottom:12px;margin-top:0">Tasks for the Action Officer</p>
                <div class="task-input-list" id="modal-task-list">
                    <div class="task-input-item">
                        <input type="text" placeholder="Enter task..." onchange="updateTask(0, this.value)">
                        <button class="task-remove-btn" onclick="removeTask(0)">
                            <span class="material-icons-outlined" style="font-size:18px">close</span>
                        </button>
                    </div>
                </div>
                <button class="add-task-btn" onclick="addTask()">
                    <span class="material-icons-outlined" style="font-size:18px">add</span>
                    Add another task
                </button>
            </div>
            <div class="form-divider"></div>
        `;
    }

    // Task summary (for AO submission)
    if (config.showCompletedTasks && state.actionItems.length > 0) {
        const completed = state.actionItems.filter(t => t.completed);
        const incomplete = state.actionItems.filter(t => !t.completed);

        let tasksHtml = `<div class="form-group"><label class="form-label">Task Summary</label>`;
        tasksHtml += `<div class="task-summary-list">`;

        if (completed.length > 0) {
            tasksHtml += completed.map(t => `
                <div class="task-summary-item completed">
                    <span class="material-icons-outlined" style="color:#10b981;font-size:18px">check_circle</span>
                    <span class="task-summary-title">${t.title}</span>
                    <span class="task-summary-status completed">Completed</span>
                </div>
            `).join('');
        }

        if (incomplete.length > 0) {
            tasksHtml += incomplete.map(t => `
                <div class="task-summary-item incomplete">
                    <span class="material-icons-outlined" style="color:#f59e0b;font-size:18px">radio_button_unchecked</span>
                    <span class="task-summary-title">${t.title}</span>
                    <span class="task-summary-status incomplete">Not completed</span>
                </div>
            `).join('');
        }

        tasksHtml += `</div>`;

        if (incomplete.length > 0) {
            tasksHtml += `
                <div class="task-warning">
                    <span class="material-icons-outlined">warning</span>
                    <span>${incomplete.length} task${incomplete.length > 1 ? 's' : ''} not yet completed. You can still submit, but this will be visible to the Chief Secretary.</span>
                </div>
            `;
        }

        tasksHtml += `</div><div class="form-divider"></div>`;
        html += tasksHtml;
    }

    // Only show Reason for Rejection field (required for rejection modal)
    // Notes removed - users can use live comments instead
    if (isReject) {
        html += `
            <div class="form-group">
                <label class="form-label">Reason for Rejection *</label>
                <textarea class="form-textarea" id="modal-notes" placeholder="Explain why this case is being rejected..." required></textarea>
            </div>
        `;
    }

    // Priority and Due Date
    if ((config.showPriority || config.showDueDate) && !isReject) {
        html += `<div class="form-row">`;
        if (config.showPriority) {
            html += `
                <div class="form-group">
                    <label class="form-label">Priority</label>
                    <select class="form-select" id="modal-priority">
                        <option value="high" ${state.caseInfo.priority === 'high' ? 'selected' : ''}>High</option>
                        <option value="medium" ${state.caseInfo.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="low" ${state.caseInfo.priority === 'low' ? 'selected' : ''}>Low</option>
                    </select>
                </div>
            `;
        }
        if (config.showDueDate) {
            html += `
                <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" class="form-input" id="modal-due-date">
                </div>
            `;
        }
        html += `</div>`;
    }

    document.getElementById('send-modal-body').innerHTML = html;

    // Update submit button
    const submitBtn = document.getElementById('send-modal-submit');
    const isSubmit = transitionKey === 'ao-cs';

    if (isReject) {
        submitBtn.innerHTML = `<span class="material-icons-outlined" style="font-size:18px">cancel</span>Reject Case`;
        submitBtn.className = 'btn btn-danger';
    } else {
        submitBtn.innerHTML = `<span class="material-icons-outlined" style="font-size:18px">${isSubmit ? 'upload' : 'send'}</span>${isSubmit ? 'Submit' : 'Send'}`;
        submitBtn.className = `btn ${isSubmit ? 'btn-success' : 'btn-primary'}`;
    }

    // Add character counter for comments if present
    setTimeout(() => {
        const commentsField = document.getElementById('modal-comments');
        if (commentsField) {
            commentsField.addEventListener('input', function() {
                const count = this.value.length;
                document.getElementById('comment-count').textContent = count;
            });
        }
    }, 0);

    openModal('send-modal');
}

// ------------------------------------------
// MODAL INTERACTIONS
// ------------------------------------------

function selectAction(value, el) {
    const isAlreadySelected = el.classList.contains('selected');
    el.parentElement.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));

    if (isAlreadySelected) {
        // Clicking same option = deselect (allows "no action" state)
        state.modalSelectedAction = null;
    } else {
        // Clicking different option = select it
        el.classList.add('selected');
        state.modalSelectedAction = value;
    }
}

function toggleDocSelect(docId, el) {
    el.classList.toggle('selected');
    const checkbox = el.querySelector('.doc-select-checkbox .material-icons-outlined');
    if (el.classList.contains('selected')) {
        state.modalSelectedDocs.push(docId);
        checkbox.style.display = 'block';
    } else {
        state.modalSelectedDocs = state.modalSelectedDocs.filter(id => id !== docId);
        checkbox.style.display = 'none';
    }
}

function addTask() {
    state.modalTasks.push('');
    const list = document.getElementById('modal-task-list');
    const idx = state.modalTasks.length - 1;
    const div = document.createElement('div');
    div.className = 'task-input-item';
    div.innerHTML = `
        <input type="text" placeholder="Enter task..." onchange="updateTask(${idx}, this.value)">
        <button class="task-remove-btn" onclick="removeTask(${idx})">
            <span class="material-icons-outlined" style="font-size:18px">close</span>
        </button>
    `;
    list.appendChild(div);
}

function updateTask(idx, value) {
    state.modalTasks[idx] = value;
}

function removeTask(idx) {
    if (state.modalTasks.length <= 1) return;
    state.modalTasks.splice(idx, 1);
    const list = document.getElementById('modal-task-list');
    list.innerHTML = state.modalTasks.map((task, i) => `
        <div class="task-input-item">
            <input type="text" placeholder="Enter task..." value="${task}" onchange="updateTask(${i}, this.value)">
            <button class="task-remove-btn" onclick="removeTask(${i})">
                <span class="material-icons-outlined" style="font-size:18px">close</span>
            </button>
        </div>
    `).join('');
}

// ------------------------------------------
// SUBMIT SEND MODAL
// ------------------------------------------

function submitSend() {
    const config = TRANSITIONS[state.currentTransition];
    if (!config) return;

    const notes = document.getElementById('modal-notes')?.value.trim() || '';
    const comments = document.getElementById('modal-comments')?.value.trim() || '';
    const isReject = state.currentTransition === 'cs-reject';

    // Validation
    if (isReject && !notes) {
        showToast('Please provide a reason for rejection', 'error');
        return;
    }

    if (state.currentTransition === 'ao-cs' && state.modalSelectedDocs.length === 0) {
        showToast('Please select at least one document to submit', 'error');
        return;
    }

    let recipientId = config.showRecipientSelect
        ? document.getElementById('modal-recipient')?.value
        : config.recipient;
    const recipient = ROLES[recipientId];
    const action = state.modalSelectedAction || config.implicitAction;

    // Update priority if changed
    const priorityEl = document.getElementById('modal-priority');
    if (priorityEl) state.caseInfo.priority = priorityEl.value;

    // Handle task assignment (CS delegating to AO)
    if (config.showTasks) {
        const validTasks = state.modalTasks.filter(t => t.trim());
        if (validTasks.length > 0) {
            state.actionItems = validTasks.map((title, i) => ({
                id: Date.now() + i,
                title,
                completed: false
            }));
            state.taskAssignment.assignedBy = state.currentRole;
            state.taskAssignment.assignedAt = new Date().toISOString();
        }
    }

    // Handle AO submission
    if (state.currentTransition === 'ao-cs' && state.modalSelectedDocs.length > 0) {
        const selectedDrafts = state.drafts.filter(d => state.modalSelectedDocs.includes(d.id));
        const existingRounds = state.submissions.filter(s => s.submittedBy === 'ao').length;
        const round = existingRounds + 1;

        const newSubmission = {
            id: 'sub_' + Date.now(),
            round: round,
            submittedBy: 'ao',
            submittedTo: 'cs',
            submittedAt: new Date().toISOString(),
            inResponseTo: round === 1 ? 'Initial delegation' : 'Changes requested',
            status: 'under-review',
            documents: selectedDrafts.map(d => ({
                id: d.id,
                name: d.name,
                type: d.type,
                size: d.size,
                uploadedBy: d.uploadedBy,
                uploadedAt: d.uploadedAt,
                content: d.content
            })),
            viewedBy: []
        };

        state.submissions.push(newSubmission);
        state.drafts = state.drafts.filter(d => !state.modalSelectedDocs.includes(d.id));
    }

    // Handle rejection
    if (isReject) {
        state.caseInfo.status = 'rejected';
        state.events.unshift({
            id: Date.now(),
            type: 'rejected',
            actor: state.currentRole,
            note: notes,
            timestamp: new Date().toISOString()
        });
        if (notes) {
            state.comments.unshift({
                id: Date.now(),
                author: state.currentRole,
                recipient: 'dto',
                text: `Rejection reason: ${notes}`,
                timestamp: new Date().toISOString(),
                linkedDocId: null
            });
        }

        // Notify DTO that case was rejected
        addNotification({
            id: 'notif-' + Date.now(),
            type: 'case_rejected',
            icon: 'block',
            iconColor: '#ef4444',
            title: `Case rejected: ${state.caseInfo.title || 'Untitled'}`,
            subtitle: `by ${ROLES[state.currentRole].name}`,
            targetRole: 'dto',
            timestamp: new Date().toISOString(),
            read: false
        });

        closeModal('send-modal');
        renderAll();
        showToast('Case rejected', 'success');
        return;
    }

    // Determine event type
    let eventType = 'forwarded';
    if (state.currentTransition === 'cs-ao') eventType = 'delegated';
    else if (state.currentTransition === 'ao-cs') eventType = 'submitted';

    // Update holder — but NOT for AO submissions.
    // When AO submits work, case stays with CS. Only task status changes.
    if (state.currentTransition !== 'ao-cs') {
        state.caseInfo.previousHolder = state.caseInfo.currentHolder;
        state.caseInfo.currentHolder = recipientId;
    }
    state.caseInfo.pendingAction = action;
    state.caseInfo.pendingFrom = state.currentRole;

    // Add event
    const attachedDocs = state.modalSelectedDocs.length > 0 ? [...state.modalSelectedDocs] : null;
    state.events.unshift({
        id: Date.now(),
        type: eventType,
        actor: state.currentRole,
        target: recipientId,
        action: action || null,  // Why it was forwarded (e.g. "review", "approve", "sign")
        note: null,  // Notes removed from modals (use live comments instead)
        docs: attachedDocs,
        timestamp: new Date().toISOString()
    });

    // Add comment if provided
    if (comments) {
        state.comments.unshift({
            id: Date.now() + 1,
            author: state.currentRole,
            recipient: recipientId,
            text: comments,
            timestamp: new Date().toISOString(),
            linkedDocId: null
        });
    }

    // Notify recipient based on transition type
    if (state.currentTransition === 'ao-cs') {
        // AO submitting work → notify CS
        const aoInfo = getAOInfo(state.currentRole);
        addNotification({
            id: 'notif-' + Date.now(),
            type: 'work_submitted',
            icon: 'upload_file',
            iconColor: '#2563eb',
            title: `Work submitted: ${state.caseInfo.title || 'Untitled'}`,
            subtitle: `by ${aoInfo ? aoInfo.name : 'Action Officer'}`,
            targetRole: 'cs',
            timestamp: new Date().toISOString(),
            read: false
        });
    } else {
        // Case forwarded/delegated → notify the recipient
        addNotification({
            id: 'notif-' + Date.now(),
            type: 'case_forwarded',
            icon: 'send',
            iconColor: '#2563eb',
            title: `Case received: ${state.caseInfo.title || 'Untitled'}`,
            subtitle: `from ${ROLES[state.currentRole].name}`,
            targetRole: recipientId,
            timestamp: new Date().toISOString(),
            read: false
        });
    }

    closeModal('send-modal');
    renderAll();
    showToast(`Sent to ${recipient.name}`, 'success');
}

// ------------------------------------------
// CLOSE CASE MODAL
// ------------------------------------------

function openCloseModal() {
    // Render dynamic case info into the modal body
    const body = document.getElementById('close-modal-body');
    if (body) {
        body.innerHTML = `
            <div class="close-case-summary">
                <span class="material-icons-outlined close-case-icon">verified</span>
                <h3 class="close-case-title">Ready to Close</h3>
                <p class="close-case-desc">This case will be marked as completed and archived.</p>
            </div>
            <div class="case-summary">
                <div class="summary-row">
                    <span class="summary-label">Case ID</span>
                    <span class="summary-value">${state.caseInfo.id || '—'}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Title</span>
                    <span class="summary-value">${state.caseInfo.title || '—'}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Status</span>
                    <span class="summary-value" style="color:var(--success)">Ready to close</span>
                </div>
            </div>
        `;
    }
    openModal('close-modal');
}

function submitClose() {
    state.caseInfo.status = 'closed';
    state.events.unshift({
        id: Date.now(),
        type: 'closed',
        actor: state.currentRole,
        timestamp: new Date().toISOString()
    });

    // Notify all AOs who have tasks on this case
    const assignedAOs = typeof getAssignedAOs === 'function' ? getAssignedAOs() : [];
    assignedAOs.forEach((aoId, index) => {
        addNotification({
            id: 'notif-' + Date.now() + '-' + index,
            type: 'case_closed',
            icon: 'verified',
            iconColor: '#16a34a',
            title: `Case closed: ${state.caseInfo.title || 'Untitled'}`,
            subtitle: `by ${ROLES[state.currentRole].name}`,
            targetRole: aoId,
            timestamp: new Date().toISOString(),
            read: false
        });
    });

    closeModal('close-modal');
    renderAll();
    showToast('Case closed!', 'success');
}

// ------------------------------------------
// UPLOAD MODAL
// ------------------------------------------

// ------------------------------------------
// UPLOAD MODAL (Real file uploads)
// ------------------------------------------

// Temporary storage for files selected in the upload modal
let uploadModalFile = null;

function openUploadModal() {
    uploadModalFile = null;
    document.getElementById('upload-name').value = '';

    // Replace the simulated upload area with a real file input trigger
    const uploadArea = document.querySelector('#upload-modal .upload-area');
    if (uploadArea) {
        // Create/find real file input
        let fileInput = document.getElementById('upload-file-input');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'upload-file-input';
            fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
            fileInput.style.display = 'none';
            fileInput.onchange = function() {
                if (this.files.length > 0) {
                    uploadModalFile = this.files[0];
                    document.getElementById('upload-name').value = this.files[0].name;
                    uploadArea.innerHTML = `
                        <span class="material-icons-outlined upload-icon" style="color:var(--success)">check_circle</span>
                        <p class="upload-text">${this.files[0].name}</p>
                        <p class="upload-hint">${(this.files[0].size / 1024).toFixed(0)} KB</p>
                    `;
                }
            };
            document.body.appendChild(fileInput);
        }
        uploadArea.onclick = () => fileInput.click();
    }

    openModal('upload-modal');
}

// Legacy function name kept for backward compatibility
function simulateFileSelect() {
    const fileInput = document.getElementById('upload-file-input');
    if (fileInput) {
        fileInput.click();
    } else {
        openUploadModal();
    }
}

async function submitUpload() {
    const name = document.getElementById('upload-name').value.trim();
    if (!name) {
        showToast('Enter document name', 'error');
        return;
    }

    let docId, newDraft;

    if (uploadModalFile && typeof caseManager !== 'undefined') {
        // Real file upload path
        const { fileId, docRecord } = await caseManager.attachFile(uploadModalFile, state.currentRole);
        docRecord.id = 'draft_' + Date.now();
        docRecord.status = 'draft';
        docRecord.name = name; // Use the custom name from the input
        newDraft = docRecord;
        docId = docRecord.id;
    } else {
        // Fallback: create a record without a real file
        docId = 'draft_' + Date.now();
        const ext = name.split('.').pop().toLowerCase();
        let type = 'pdf';
        if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'excel';
        else if (['doc', 'docx'].includes(ext)) type = 'word';

        newDraft = {
            id: docId,
            name,
            type,
            size: '—',
            uploadedBy: state.currentRole,
            uploadedAt: new Date().toISOString(),
            status: 'draft',
            content: null
        };
    }

    state.drafts.push(newDraft);

    state.events.unshift({
        id: Date.now(),
        type: 'uploaded',
        actor: state.currentRole,
        note: name,
        docId: docId,
        timestamp: new Date().toISOString()
    });

    state.sectionStates.documents = true;
    uploadModalFile = null;

    closeModal('upload-modal');
    document.getElementById('upload-name').value = '';
    renderAll();
    showToast('Document uploaded as draft', 'success');
}

// ------------------------------------------
// REGISTER CASE MODAL (DTO creates new case)
// ------------------------------------------

// Holds the files selected in the register modal
let registerFiles = [];

function openRegisterCaseModal() {
    // Reset the form
    registerFiles = [];
    const titleInput = document.getElementById('register-case-title');
    const prioritySelect = document.getElementById('register-case-priority');
    const dueDateInput = document.getElementById('register-case-due-date');
    const notesInput = document.getElementById('register-case-notes');
    const fileList = document.getElementById('register-file-list');
    const uploadArea = document.getElementById('register-upload-area');
    const fileInput = document.getElementById('register-file-input');

    if (titleInput) titleInput.value = '';
    if (prioritySelect) prioritySelect.value = 'medium';
    if (dueDateInput) dueDateInput.value = '';
    if (notesInput) notesInput.value = '';
    if (fileList) fileList.innerHTML = '';
    if (fileInput) fileInput.value = '';
    if (uploadArea) {
        // Reset the label content (the for="register-file-input" stays on the element)
        uploadArea.innerHTML = `
            <span class="material-icons-outlined upload-icon">cloud_upload</span>
            <p class="upload-text">Click to select files</p>
            <p class="upload-hint">PDF, Word, Excel, or image files</p>
        `;
    }

    openModal('register-case-modal');
    console.log('Register case modal opened');
}

function handleRegisterFileSelect(input) {
    console.log('handleRegisterFileSelect called, files:', input.files.length);
    if (!input.files.length) return;

    // Add new files to the list (don't replace)
    for (const file of input.files) {
        registerFiles.push(file);
        console.log('Added file:', file.name, file.size, 'bytes');
    }

    // Update the upload area to show success
    const uploadArea = document.getElementById('register-upload-area');
    if (uploadArea) {
        uploadArea.innerHTML = `
            <span class="material-icons-outlined upload-icon" style="color:var(--success)">check_circle</span>
            <p class="upload-text">${registerFiles.length} file(s) selected</p>
            <p class="upload-hint">Click to add more</p>
        `;
    }

    // Render the file list
    renderRegisterFileList();
}

function renderRegisterFileList() {
    const container = document.getElementById('register-file-list');
    if (!container) return;

    container.innerHTML = registerFiles.map((file, i) => {
        const sizeStr = file.size > 1024 * 1024
            ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
            : (file.size / 1024).toFixed(0) + ' KB';

        const ext = file.name.split('.').pop().toLowerCase();
        let icon = 'description'; // default
        if (ext === 'pdf') icon = 'picture_as_pdf';
        else if (['xls', 'xlsx', 'csv'].includes(ext)) icon = 'table_chart';
        else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) icon = 'image';

        return `
            <div class="file-list-item">
                <span class="material-icons-outlined" style="font-size:18px;color:var(--gray-500)">${icon}</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${sizeStr}</span>
                <button class="file-remove" onclick="removeRegisterFile(${i})" title="Remove">
                    <span class="material-icons-outlined" style="font-size:16px">close</span>
                </button>
            </div>
        `;
    }).join('');
}

function removeRegisterFile(index) {
    registerFiles.splice(index, 1);
    renderRegisterFileList();

    // Update upload area text
    const uploadArea = document.getElementById('register-upload-area');
    if (uploadArea && registerFiles.length === 0) {
        uploadArea.innerHTML = `
            <span class="material-icons-outlined upload-icon">cloud_upload</span>
            <p class="upload-text">Click to select files</p>
            <p class="upload-hint">PDF, Word, Excel, or image files</p>
        `;
    } else if (uploadArea) {
        uploadArea.innerHTML = `
            <span class="material-icons-outlined upload-icon" style="color:var(--success)">check_circle</span>
            <p class="upload-text">${registerFiles.length} file(s) selected</p>
            <p class="upload-hint">Click to add more</p>
        `;
    }
}

async function submitRegisterCase() {
    const title = document.getElementById('register-case-title').value.trim();
    const priority = document.getElementById('register-case-priority').value;
    const dueDate = document.getElementById('register-case-due-date').value;
    const notes = document.getElementById('register-case-notes').value.trim();

    // Validation
    if (!title) {
        showToast('Please enter a case title', 'error');
        return;
    }

    // Disable submit button to prevent double-click
    const submitBtn = document.getElementById('register-case-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px">hourglass_top</span> Registering...';
    }

    try {
        const caseId = await caseManager.createCase({
            title,
            priority,
            dueDate,
            notes,
            files: registerFiles
        });

        registerFiles = [];
        closeModal('register-case-modal');
        showToast(`Case ${caseId} registered!`, 'success');
    } catch (err) {
        console.error('Failed to register case:', err);
        showToast('Failed to register case', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px">add_circle</span> Register Case';
        }
    }
}

// ------------------------------------------
// APPROVAL MODAL
// ------------------------------------------

function handleApprove() {
    openModal('approval-modal');
    document.getElementById('approval-action-type').textContent = 'approve';
    document.getElementById('approval-modal-title').textContent = 'Approve Document';
    document.getElementById('approval-action-label').textContent = 'approve';
    document.getElementById('approval-reason-field').style.display = 'none';

    const submitBtn = document.getElementById('approval-submit-btn');
    submitBtn.innerHTML = '<span class="material-icons-outlined">check_circle</span>Approve';
    submitBtn.className = 'btn btn-success';
}

function handleReject() {
    openModal('approval-modal');
    document.getElementById('approval-action-type').textContent = 'reject';
    document.getElementById('approval-modal-title').textContent = 'Reject Document';
    document.getElementById('approval-action-label').textContent = 'reject';
    document.getElementById('approval-reason-field').style.display = 'block';

    const submitBtn = document.getElementById('approval-submit-btn');
    submitBtn.innerHTML = '<span class="material-icons-outlined">cancel</span>Reject';
    submitBtn.className = 'btn btn-danger';
}

function submitApproval() {
    const actionType = document.getElementById('approval-action-type').textContent;
    const isApproved = actionType === 'approve';
    const reason = document.getElementById('approval-rejection-reason')?.value.trim() || '';

    // Validation for rejection
    if (!isApproved && !reason) {
        showToast('Please provide a reason for rejection', 'error');
        return;
    }

    // Log approval/rejection event
    state.events.unshift({
        id: Date.now(),
        type: isApproved ? 'approved' : 'approval_rejected',
        actor: state.currentRole,
        note: isApproved ? null : reason,
        timestamp: new Date().toISOString()
    });

    // Add comment for rejection reason
    if (!isApproved && reason) {
        state.comments.unshift({
            id: Date.now() + 1,
            author: state.currentRole,
            recipient: state.caseInfo.pendingFrom,
            text: `Rejection reason: ${reason}`,
            timestamp: new Date().toISOString(),
            linkedDocId: null
        });
    }

    // Notify the person who requested the action (e.g. EA who sent doc for approval)
    if (state.caseInfo.pendingFrom) {
        addNotification({
            id: 'notif-' + Date.now(),
            type: isApproved ? 'doc_approved' : 'doc_rejected',
            icon: isApproved ? 'check_circle' : 'cancel',
            iconColor: isApproved ? '#16a34a' : '#ef4444',
            title: isApproved
                ? `Document approved: ${state.caseInfo.title || 'Untitled'}`
                : `Document rejected: ${state.caseInfo.title || 'Untitled'}`,
            subtitle: `by ${ROLES[state.currentRole].name}`,
            targetRole: state.caseInfo.pendingFrom,
            timestamp: new Date().toISOString(),
            read: false
        });
    }

    // Clear pending action
    state.caseInfo.pendingAction = null;

    // Close modal and re-render
    closeModal('approval-modal');
    document.getElementById('approval-rejection-reason').value = '';
    renderAll();

    showToast(isApproved ? 'Document approved' : 'Document rejected', 'success');

    // Show next action prompt after a brief moment
    setTimeout(() => {
        showNextActionPrompt(isApproved);
    }, 800);
}

function showNextActionPrompt(wasApproved) {
    const message = wasApproved
        ? 'Document approved. What would you like to do next?'
        : 'Document rejected. Would you like to return it to the sender?';

    const toast = document.createElement('div');
    toast.className = 'toast-next-action';
    toast.innerHTML = `
        <div class="toast-content">
            <span class="material-icons-outlined">${wasApproved ? 'check_circle' : 'cancel'}</span>
            <span>${message}</span>
        </div>
        <button class="toast-action-btn" onclick="openActionMenu()">
            <span>Take Action</span>
            <span class="material-icons-outlined">arrow_forward</span>
        </button>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 10000);
}

function openActionMenu() {
    // Close any action toasts
    document.querySelectorAll('.toast-next-action').forEach(t => t.remove());

    // Open the actions dropdown
    const actionsBtn = document.getElementById('actions-dropdown-btn');
    if (actionsBtn) {
        actionsBtn.click();
    }
}

// Make functions globally available
window.openModal = openModal;
window.closeModal = closeModal;
window.openSendModal = openSendModal;
window.selectAction = selectAction;
window.toggleDocSelect = toggleDocSelect;
window.addTask = addTask;
window.updateTask = updateTask;
window.removeTask = removeTask;
window.submitSend = submitSend;
window.openCloseModal = openCloseModal;
window.submitClose = submitClose;
window.simulateFileSelect = simulateFileSelect;
window.openUploadModal = openUploadModal;
window.submitUpload = submitUpload;
window.openRegisterCaseModal = openRegisterCaseModal;
window.handleRegisterFileSelect = handleRegisterFileSelect;
window.removeRegisterFile = removeRegisterFile;
window.submitRegisterCase = submitRegisterCase;
window.handleApprove = handleApprove;
window.handleReject = handleReject;
window.submitApproval = submitApproval;
window.openActionMenu = openActionMenu;
