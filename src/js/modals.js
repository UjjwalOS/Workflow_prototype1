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
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
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
                    ${config.recipientOptions.map(r => `<option value="${r}">${ROLES[r].name} - ${ROLES[r].title}</option>`).join('')}
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
                        <div class="recipient-role">${recipient.title}</div>
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
            state.taskAssignment.assignedAt = 'Just now';
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
            submittedAt: 'Just now',
            inResponseTo: round === 1 ? 'Initial delegation' : 'Revision request',
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
            timestamp: 'Just now'
        });
        if (notes) {
            state.comments.unshift({
                id: Date.now(),
                author: state.currentRole,
                recipient: 'dto',
                text: `Rejection reason: ${notes}`,
                timestamp: 'Just now',
                linkedDocId: null
            });
        }

        closeModal('send-modal');
        renderAll();
        showToast('Case rejected', 'success');
        return;
    }

    // Handle CS returning work to AO
    if (state.currentTransition === 'cs-sendback' && recipientId === 'ao') {
        const latestSubmission = state.submissions
            .filter(s => s.submittedTo === 'cs' && s.status === 'under-review')
            .sort((a, b) => b.round - a.round)[0];

        if (latestSubmission) {
            latestSubmission.status = 'returned';
        }
    }

    // Determine event type
    let eventType = 'forwarded';
    if (state.currentTransition === 'cs-ao') eventType = 'delegated';
    else if (state.currentTransition === 'ao-cs') eventType = 'submitted';
    else if (state.currentTransition.includes('sendback')) eventType = 'returned';

    // Update holder
    state.caseInfo.previousHolder = state.caseInfo.currentHolder;
    state.caseInfo.currentHolder = recipientId;
    state.caseInfo.pendingAction = action;
    state.caseInfo.pendingFrom = state.currentRole;

    // Add event
    const attachedDocs = state.modalSelectedDocs.length > 0 ? [...state.modalSelectedDocs] : null;
    state.events.unshift({
        id: Date.now(),
        type: eventType,
        actor: state.currentRole,
        target: recipientId,
        note: null,  // Notes removed from modals (use live comments instead)
        docs: attachedDocs,
        timestamp: 'Just now'
    });

    closeModal('send-modal');
    renderAll();
    showToast(`Sent to ${recipient.name}`, 'success');
}

// ------------------------------------------
// CLOSE CASE MODAL
// ------------------------------------------

function openCloseModal() {
    openModal('close-modal');
}

function submitClose() {
    state.caseInfo.status = 'closed';
    state.events.unshift({
        id: Date.now(),
        type: 'closed',
        actor: state.currentRole,
        timestamp: 'Just now'
    });
    closeModal('close-modal');
    renderAll();
    showToast('Case closed!', 'success');
}

// ------------------------------------------
// UPLOAD MODAL
// ------------------------------------------

function simulateFileSelect() {
    const types = ['pdf', 'excel', 'word'];
    const type = types[Math.floor(Math.random() * types.length)];
    const ext = { pdf: '.pdf', excel: '.xlsx', word: '.docx' }[type];
    document.getElementById('upload-name').value = `Document_${Date.now().toString().slice(-6)}${ext}`;
}

function submitUpload() {
    const name = document.getElementById('upload-name').value.trim();
    if (!name) {
        showToast('Enter document name', 'error');
        return;
    }

    const type = name.endsWith('.xlsx') ? 'excel' : name.endsWith('.docx') ? 'word' : 'pdf';
    const docContent = generateUploadedDocContent(name, type);

    const docId = 'draft_' + Date.now();
    const newDraft = {
        id: docId,
        name,
        type,
        size: '1.2 MB',
        uploadedBy: state.currentRole,
        uploadedAt: 'Just now',
        status: 'draft',
        content: docContent
    };

    state.drafts.push(newDraft);

    state.events.unshift({
        id: Date.now(),
        type: 'uploaded',
        actor: state.currentRole,
        note: name,
        docId: docId,
        timestamp: 'Just now'
    });

    state.sectionStates.documents = true;

    closeModal('upload-modal');
    document.getElementById('upload-name').value = '';
    renderAll();
    showToast('Document uploaded as draft', 'success');
}

function generateUploadedDocContent(name, type) {
    const uploader = ROLES[state.currentRole];
    const cleanName = name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    if (type === 'excel') {
        return `
            <h1>${cleanName}</h1>
            <p class="subtitle">Spreadsheet Document<br>Uploaded by ${uploader.name}</p>

            <h2>Data Summary</h2>
            <table>
                <thead><tr><th>Category</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th></tr></thead>
                <tbody>
                    <tr><td>Revenue</td><td>125,000</td><td>142,000</td><td>138,500</td><td>156,200</td><td>561,700</td></tr>
                    <tr><td>Expenses</td><td>98,000</td><td>105,000</td><td>112,000</td><td>118,000</td><td>433,000</td></tr>
                    <tr><td>Net</td><td>27,000</td><td>37,000</td><td>26,500</td><td>38,200</td><td>128,700</td></tr>
                </tbody>
            </table>

            <h2>Analysis Notes</h2>
            <ul>
                <li>Q4 shows strongest performance with 15% growth</li>
                <li>Expense ratio maintained at target of 77%</li>
                <li>Year-over-year improvement of 8.5%</li>
            </ul>

            <div style="margin-top:40px;padding:20px;background:#f0fdf4;border-radius:8px">
                <p style="color:#16a34a;font-weight:600">✓ Data verified and ready for review</p>
            </div>
        `;
    } else if (type === 'word') {
        return `
            <h1>${cleanName}</h1>
            <p class="subtitle">Word Document<br>Uploaded by ${uploader.name}</p>

            <h2>Overview</h2>
            <p>This document contains the prepared response and analysis as requested.</p>

            <h2>Summary</h2>
            <p>All requested items have been addressed and documented. Please review the attached materials for completeness.</p>

            <div style="margin-top:40px;padding:20px;background:#eff6ff;border-radius:8px">
                <p style="color:#2563eb;font-weight:600">Ready for submission</p>
            </div>
        `;
    } else {
        return `
            <h1>${cleanName}</h1>
            <p class="subtitle">PDF Document<br>Uploaded by ${uploader.name}</p>

            <h2>Document Contents</h2>
            <p>This PDF document has been uploaded and is ready for review.</p>

            <div style="margin-top:40px;padding:20px;background:#fef2f2;border-radius:8px;text-align:center">
                <p style="color:#dc2626;font-weight:600">📄 PDF Document</p>
            </div>
        `;
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
window.submitUpload = submitUpload;
