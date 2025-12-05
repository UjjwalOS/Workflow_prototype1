/*
 * =============================================
 * SECTION RENDERING
 * =============================================
 *
 * Rendering functions for specific sections:
 * - Pending Banner
 * - AI Summary
 * - Comments
 * - Action Items (Tasks)
 * - Documents Section
 */

// ------------------------------------------
// PENDING BANNER
// ------------------------------------------
// Shows what action is expected from the current holder

function renderPendingBanner() {
    const requester = ROLES[state.caseInfo.pendingFrom];
    const role = state.currentRole;

    // AO gets special "Work Assigned" banner
    if (role === 'ao' && state.caseInfo.pendingAction === 'delegation') {
        const taskCount = state.actionItems.length;
        const incomplete = state.actionItems.filter(t => !t.completed).length;

        if (taskCount === 0 || incomplete === 0) {
            return '';
        }

        return `
            <div class="banner-work-assigned">
                <div class="banner-icon">
                    <span class="material-icons-outlined">assignment</span>
                </div>
                <div>
                    <div class="banner-pending-title">Work Assigned to You</div>
                    <div class="banner-pending-subtitle">${incomplete} of ${taskCount} tasks remaining • From ${requester.name}</div>
                </div>
            </div>
        `;
    }

    // Standard pending banner for others
    const actionLabels = {
        'review': 'Review Requested',
        'approve': 'Approval Requested',
        'sign': 'Signature Requested',
        'delegate': 'Delegation Recommended',
        'triage': 'Triage Required',
        'urgent-review': 'Urgent Review Needed',
        'delegation': 'Tasks Delegated',
        'revision': 'Revision Requested'
    };

    const subtitles = {
        dto: 'Route to appropriate recipient',
        ea: 'Review and forward to Chief Secretary',
        cs: 'Review and take action',
        ao: 'Complete assigned work'
    };

    return `
        <div class="banner-pending">
            <div class="banner-pending-icon">
                <span class="material-icons-outlined">pending_actions</span>
            </div>
            <div>
                <div class="banner-pending-title">${actionLabels[state.caseInfo.pendingAction] || state.caseInfo.pendingAction}</div>
                <div class="banner-pending-subtitle">${subtitles[state.currentRole]} • From ${requester.name}</div>
            </div>
        </div>
    `;
}

// ------------------------------------------
// AI SUMMARY
// ------------------------------------------

function renderAISummary() {
    const aiExpanded = state.sectionStates.aiSummary;

    return `
        <div class="ai-summary ${aiExpanded ? 'expanded' : ''}" onclick="toggleAISummary(event, this)">
            <div class="ai-summary-header">
                <div class="ai-summary-title">
                    <span class="material-icons-outlined" style="font-size:18px">auto_awesome</span>
                    AI Summary
                </div>
                <span class="material-icons-outlined expand-icon">expand_more</span>
            </div>
            <div class="ai-summary-content">
                <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:14px;margin-bottom:12px">
                    <p style="margin-bottom:10px"><strong>Document:</strong> Budget Proposal 2025</p>
                    <p style="margin-bottom:10px"><strong>Total Budget:</strong> K1.2 billion (12% increase from FY2024)</p>
                    <p style="margin-bottom:10px"><strong>Key Allocations:</strong></p>
                    <ul style="margin-left:20px;margin-bottom:10px">
                        <li>Infrastructure: K450M (37.5%)</li>
                        <li>Healthcare: K320M (26.7%)</li>
                        <li>Education: K280M (23.3%)</li>
                        <li>Operations: K150M (12.5%)</li>
                    </ul>
                    <p><strong>Recommendation:</strong> Approval recommended for Cabinet consideration</p>
                </div>
                <button class="ask-ai-btn" onclick="event.stopPropagation(); switchTab('ask-ai')">
                    <span class="material-icons-outlined" style="font-size:16px">chat</span>
                    Ask anything about this document
                </button>
            </div>
        </div>
    `;
}

// ------------------------------------------
// COMMENTS SECTION
// ------------------------------------------

function renderCommentsSection() {
    const commentsExpanded = state.sectionStates.comments;
    const showAllComments = state.showAllComments;
    const displayComments = showAllComments ? state.comments : state.comments.slice(0, 2);
    const hasMoreComments = state.comments.length > 2;

    // Comment input state
    const { recipient, text, dropdownOpen, highlightedIndex, linkedDocId } = state.commentInput;
    const recipientRole = recipient ? ROLES[recipient] : null;
    const currentUser = ROLES[state.currentRole];
    const recipients = Object.keys(ROLES).filter(id => id !== state.currentRole);
    const linkedDoc = linkedDocId ? findDocument(linkedDocId) : null;
    const canSend = recipient && text.trim().length > 0;

    // Build comment input HTML
    const commentInputHTML = `
        <div class="comment-input-area">
            ${linkedDoc ? `
                <div class="comment-linked-indicator">
                    <span class="material-icons-outlined" style="font-size:14px">attach_file</span>
                    Re: ${linkedDoc.name}
                    <button onclick="clearLinkedDoc()" title="Remove">
                        <span class="material-icons-outlined" style="font-size:14px">close</span>
                    </button>
                </div>
            ` : ''}
            <div class="comment-to-row">
                <label class="comment-to-label">To:</label>
                <div class="comment-recipient-dropdown">
                    <button class="comment-recipient-btn" onclick="toggleRecipientDropdown()">
                        ${recipientRole ? `
                            <div class="recipient-btn-avatar" style="background:${recipientRole.color}">${recipientRole.initials}</div>
                            <span class="recipient-btn-name">${recipientRole.name}</span>
                        ` : `
                            <span class="recipient-btn-placeholder">Select recipient</span>
                        `}
                        <span class="material-icons-outlined recipient-btn-arrow">expand_more</span>
                    </button>
                    ${dropdownOpen ? `
                        <div class="recipient-dropdown-menu">
                            ${recipients.map((roleId, i) => {
                                const role = ROLES[roleId];
                                return `
                                    <div class="recipient-dropdown-option ${i === highlightedIndex ? 'highlighted' : ''}"
                                         onclick="selectCommentRecipient('${roleId}')"
                                         onmouseenter="highlightMentionOption(${i})">
                                        <div class="recipient-option-avatar" style="background:${role.color}">${role.initials}</div>
                                        <div class="recipient-option-info">
                                            <div class="recipient-option-name">${role.name}</div>
                                            <div class="recipient-option-title">${role.title}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            <textarea
                id="comment-textarea"
                class="comment-textarea"
                placeholder="Write your comment..."
                oninput="handleCommentInput(event)"
                onkeydown="handleCommentKeydown(event)"
            >${text}</textarea>
            <div class="comment-input-footer">
                <div></div>
                <button class="comment-send-btn ${canSend ? 'enabled' : ''}" onclick="submitComment()">
                    Send
                    <span class="material-icons-outlined" style="font-size:16px">arrow_forward</span>
                </button>
            </div>
        </div>
    `;

    return `
        <div class="section-card ${commentsExpanded ? 'expanded' : ''}" id="comments-section">
            <div class="section-header" onclick="toggleSection('comments')">
                <div class="section-title">
                    <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                    Comments
                    <span class="section-count">${state.comments.length}</span>
                </div>
                <span class="material-icons-outlined section-toggle">expand_more</span>
            </div>
            <div class="section-content">
                ${commentInputHTML}
                <div class="section-body">
                    ${state.comments.length === 0
                        ? '<div class="empty-state" style="text-align:center;padding:20px;color:var(--gray-400)">No messages yet. Start a conversation!</div>'
                        : displayComments.map(c => {
                            const author = ROLES[c.author];
                            const commentRecipient = c.recipient ? ROLES[c.recipient] : null;
                            const commentLinkedDoc = c.linkedDocId ? findDocument(c.linkedDocId) : null;
                            return `
                                <div class="comment-item">
                                    <div class="comment-header">
                                        <div class="comment-avatar" style="background:${author.color}">${author.initials}</div>
                                        <div class="comment-meta-wrapper">
                                            <div class="comment-author-line">
                                                <span class="comment-author">${author.name}</span>
                                                ${commentRecipient ? `
                                                    <span class="comment-arrow">→</span>
                                                    <span class="comment-recipient" style="background:${commentRecipient.color}">${commentRecipient.initials}</span>
                                                ` : ''}
                                                <span class="comment-time">• ${c.timestamp}</span>
                                            </div>
                                            ${commentLinkedDoc ? `
                                                <div class="comment-linked-doc" onclick="selectDoc('${commentLinkedDoc.id}')">
                                                    <span class="material-icons-outlined" style="font-size:12px">attach_file</span>
                                                    Re: ${commentLinkedDoc.name}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <div class="comment-text">${c.text}</div>
                                </div>
                            `;
                        }).join('')}
                    ${hasMoreComments && commentsExpanded ? `
                        <div class="see-all-link" onclick="event.stopPropagation(); toggleShowAllComments()">
                            <span class="material-icons-outlined" style="font-size:16px">${showAllComments ? 'expand_less' : 'expand_more'}</span>
                            ${showAllComments ? 'Show less' : `Show all ${state.comments.length} comments`}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------
// ACTION ITEMS SECTION
// ------------------------------------------
// Different views based on role

function renderActionItemsSection() {
    const roleConfig = ROLE_CONFIG[state.currentRole];
    const taskView = roleConfig.taskView;
    const isHolder = state.caseInfo.currentHolder === state.currentRole;

    // DTO: Hidden entirely
    if (taskView === 'hidden') {
        return '';
    }

    // No tasks exist yet
    if (state.actionItems.length === 0) {
        return '';
    }

    const completed = state.actionItems.filter(t => t.completed).length;
    const total = state.actionItems.length;
    const percent = Math.round((completed / total) * 100);
    const tasksExpanded = state.sectionStates.actionItems;

    // EA: Summary view
    if (taskView === 'summary') {
        const ao = ROLES['ao'];
        return `
            <div class="section-card ${tasksExpanded ? 'expanded' : ''}" id="tasks-section">
                <div class="section-header" onclick="toggleSection('actionItems')">
                    <div class="section-title">
                        <span class="material-icons-outlined" style="font-size:18px">assignment</span>
                        Delegated Work
                        <span class="section-count" style="background:${percent === 100 ? 'var(--success-light)' : 'var(--gray-200)'};color:${percent === 100 ? 'var(--success)' : 'var(--gray-600)'}">${completed}/${total}</span>
                    </div>
                    <span class="material-icons-outlined section-toggle">expand_more</span>
                </div>
                <div class="section-content">
                    <div class="section-body">
                        <div class="tasks-summary">
                            <div class="tasks-summary-icon">
                                <span class="material-icons-outlined">person</span>
                            </div>
                            <div class="tasks-summary-text">
                                <strong>${total} tasks</strong> delegated to ${ao.name}<br>
                                <span style="color:${percent === 100 ? 'var(--success)' : 'var(--gray-500)'}">
                                    ${percent === 100 ? '✓ All complete' : `${completed} done, ${total - completed} pending`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // CS: Progress tracking view
    if (taskView === 'progress') {
        const ao = ROLES['ao'];
        const allDone = percent === 100;
        return `
            <div class="section-card ${tasksExpanded ? 'expanded' : ''}" id="tasks-section">
                <div class="section-header" onclick="toggleSection('actionItems')">
                    <div class="section-title">
                        <span class="material-icons-outlined" style="font-size:18px">trending_up</span>
                        Task Progress
                        <span class="section-count" style="background:${allDone ? 'var(--success-light)' : 'var(--warning-light)'};color:${allDone ? 'var(--success)' : '#b45309'}">${percent}%</span>
                    </div>
                    <span class="material-icons-outlined section-toggle">expand_more</span>
                </div>
                <div class="section-content">
                    <div class="section-body">
                        <div class="progress-tracker">
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width:${percent}%"></div>
                            </div>
                            ${state.actionItems.map(item => `
                                <div class="progress-item ${item.completed ? 'done' : ''}">
                                    <div class="progress-indicator ${item.completed ? 'done' : 'pending'}">
                                        ${item.completed ? '<span class="material-icons-outlined">check</span>' : ''}
                                    </div>
                                    <span class="progress-task-title">${item.title}</span>
                                </div>
                            `).join('')}
                            <div class="progress-assignee">
                                <div class="progress-assignee-avatar" style="background:${ao.color}">${ao.initials}</div>
                                <span>Assigned to <strong>${ao.name}</strong></span>
                                ${!allDone ? '<span style="margin-left:auto;color:var(--warning);font-size:11px">In progress</span>' : '<span style="margin-left:auto;color:var(--success);font-size:11px">✓ Complete</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // AO: Interactive checkboxes
    if (taskView === 'interactive') {
        const incomplete = total - completed;
        const showAll = state.showAllTasks;
        const displayTasks = showAll ? state.actionItems : state.actionItems.slice(0, 3);
        const hasMore = state.actionItems.length > 3;
        const allDone = incomplete === 0;

        const assignedBy = state.taskAssignment.assignedBy ? ROLES[state.taskAssignment.assignedBy] : null;
        const assignedAt = state.taskAssignment.assignedAt || '';

        return `
            <div class="section-card ${tasksExpanded ? 'expanded' : ''}" id="tasks-section">
                <div class="section-header" onclick="toggleSection('actionItems')">
                    <div class="section-title">
                        <span class="material-icons-outlined" style="font-size:18px">checklist</span>
                        Your Tasks
                        <span class="section-count" style="background:${allDone ? 'var(--success-light)' : 'var(--primary-light)'};color:${allDone ? 'var(--success)' : 'var(--primary)'}">
                            ${allDone ? '✓ Done' : `${incomplete} remaining`}
                        </span>
                    </div>
                    <span class="material-icons-outlined section-toggle">expand_more</span>
                </div>
                <div class="section-content">
                    <div class="section-body">
                        ${assignedBy ? `
                            <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--gray-50);border-radius:var(--radius-md);margin-bottom:12px;font-size:12px;color:var(--gray-600)">
                                <div style="width:24px;height:24px;border-radius:50%;background:${assignedBy.color};display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:600">${assignedBy.initials}</div>
                                Assigned by <strong>${assignedBy.name}</strong> • ${assignedAt}
                            </div>
                        ` : ''}
                        ${allDone ? `
                            <div style="text-align:center;padding:16px;background:var(--success-light);border-radius:var(--radius-md);margin-bottom:12px">
                                <span class="material-icons-outlined" style="font-size:32px;color:var(--success)">task_alt</span>
                                <p style="color:var(--success);font-weight:600;margin-top:4px">All tasks complete!</p>
                                <p style="color:var(--gray-600);font-size:12px">Ready to submit to Chief Secretary</p>
                            </div>
                        ` : ''}
                        ${displayTasks.map(item => `
                            <div class="task-item ${item.completed ? 'completed' : ''}">
                                <div class="task-checkbox ${item.completed ? 'checked' : ''}" onclick="toggleTask(${item.id})">
                                    ${item.completed ? '<span class="material-icons-outlined">check</span>' : ''}
                                </div>
                                <div>
                                    <div class="task-title">${item.title}</div>
                                    <div class="task-meta">${item.completed ? '✓ Completed' : 'Click to mark complete'}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${hasMore ? `
                            <div class="see-all-link" onclick="event.stopPropagation(); toggleShowAllTasks()">
                                <span class="material-icons-outlined" style="font-size:16px">${showAll ? 'expand_less' : 'expand_more'}</span>
                                ${showAll ? 'Show less' : `Show all ${state.actionItems.length} tasks`}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    return '';
}

// ------------------------------------------
// DOCUMENTS SECTION (in Details tab)
// ------------------------------------------

function renderDocumentsSection() {
    const docsExpanded = state.sectionStates.documents;
    const docTypeIcons = { pdf: 'picture_as_pdf', excel: 'table_chart', word: 'description' };
    const role = state.currentRole;

    const originalDoc = state.documents.find(d => d.status === 'original');
    const submissions = state.submissions || [];
    const drafts = state.drafts || [];

    let displayDocs = [];
    let sectionTitle = 'Documents';
    let sectionIcon = 'folder_open';
    let totalCount = 1;
    let hasNewItems = false;

    if (role === 'cs') {
        sectionTitle = 'Documents';
        sectionIcon = 'inbox';
        const latestSubmission = submissions.filter(s => s.submittedTo === 'cs').sort((a, b) => b.round - a.round)[0];
        if (latestSubmission) {
            hasNewItems = !latestSubmission.viewedBy.includes('cs');
            latestSubmission.documents.slice(0, 2).forEach(doc => {
                displayDocs.push({
                    ...doc,
                    isNew: hasNewItems,
                    fromSubmission: true,
                    submissionId: latestSubmission.id,
                    sender: ROLES[latestSubmission.submittedBy]
                });
            });
            totalCount += latestSubmission.documents.length;
        }
        if (displayDocs.length < 3 && originalDoc) {
            displayDocs.push({ ...originalDoc, isOriginal: true });
        }
    } else if (role === 'ao') {
        sectionTitle = 'Your Documents';
        sectionIcon = 'drive_file_move';
        drafts.slice(0, 2).forEach(doc => {
            displayDocs.push({ ...doc, isDraft: true });
        });
        const mySubmission = submissions.filter(s => s.submittedBy === 'ao').sort((a, b) => b.round - a.round)[0];
        if (mySubmission && displayDocs.length < 2) {
            mySubmission.documents.slice(0, 2 - displayDocs.length).forEach(doc => {
                displayDocs.push({
                    ...doc,
                    isSubmitted: true,
                    status: mySubmission.status,
                    round: mySubmission.round
                });
            });
        }
        if (displayDocs.length < 3 && originalDoc) {
            displayDocs.push({ ...originalDoc, isOriginal: true });
        }
        totalCount = drafts.length + submissions.flatMap(s => s.documents).length + 1;
    } else {
        sectionTitle = role === 'ea' ? 'Incoming Document' : 'Your Submission';
        sectionIcon = role === 'ea' ? 'move_to_inbox' : 'check_circle';
        if (originalDoc) displayDocs.push({ ...originalDoc, isOriginal: true });
    }

    const isHolder = state.caseInfo.currentHolder === state.currentRole;
    const canUpload = isHolder && role === 'ao';
    const uploadBtn = canUpload ? `
        <button class="section-action-btn" onclick="event.stopPropagation(); openModal('upload-modal')" title="Upload document">
            <span class="material-icons-outlined">upload_file</span>
        </button>
    ` : '';

    return `
        <div class="section-card ${docsExpanded ? 'expanded' : ''}" id="documents-section">
            <div class="section-header" onclick="toggleSection('documents')">
                <div class="section-title">
                    <span class="material-icons-outlined" style="font-size:18px">${sectionIcon}</span>
                    ${sectionTitle}
                    ${hasNewItems ? '<span class="doc-badge-new" style="margin-left:8px">New</span>' : `<span class="section-count">${totalCount}</span>`}
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${uploadBtn}
                    <span class="material-icons-outlined section-toggle">expand_more</span>
                </div>
            </div>
            <div class="section-content">
                <div class="section-body">
                    ${displayDocs.length === 0 ? `
                        <div class="empty-state">No documents available</div>
                    ` : displayDocs.map(doc => {
                        const isViewing = doc.id === state.selectedDocId;

                        let statusLabel = '';
                        let statusClass = 'original';

                        if (doc.isOriginal) {
                            statusLabel = role === 'dto' ? '✓ Received' : 'Original';
                            statusClass = role === 'dto' ? 'submitted' : 'original';
                        } else if (doc.isDraft) {
                            statusLabel = 'Draft';
                            statusClass = 'draft';
                        } else if (doc.isNew) {
                            statusLabel = 'New';
                            statusClass = 'new';
                        } else if (doc.fromSubmission) {
                            statusLabel = `From ${doc.sender.shortName}`;
                            statusClass = 'received';
                        } else if (doc.isSubmitted) {
                            statusLabel = doc.status === 'returned' ? 'Needs Revision' : 'Submitted';
                            statusClass = doc.status === 'returned' ? 'revision' : 'submitted';
                        }

                        let metaInfo = doc.size;
                        if (doc.isOriginal) {
                            metaInfo += ` • ${doc.uploadedAt}`;
                        } else if (doc.isDraft) {
                            metaInfo += ' • Only visible to you';
                        } else if (doc.fromSubmission) {
                            metaInfo += ` • ${doc.uploadedAt}`;
                        }

                        const clickHandler = doc.fromSubmission
                            ? `selectSubmissionDoc('${doc.submissionId}', '${doc.id}')`
                            : `selectDoc('${doc.id}')`;

                        return `
                            <div class="doc-card ${isViewing ? 'active' : ''} ${doc.isNew ? 'has-new' : ''}" onclick="${clickHandler}" ${doc.isNew ? 'style="border-left:3px solid #f59e0b"' : ''}>
                                <div class="doc-card-icon ${doc.type}">
                                    <span class="material-icons-outlined">${docTypeIcons[doc.type] || 'description'}</span>
                                </div>
                                <div class="doc-card-content">
                                    <div class="doc-card-header">
                                        <span class="doc-card-name">${doc.name}</span>
                                        ${doc.isNew
                                            ? '<span class="doc-badge-new">New</span>'
                                            : `<span class="doc-card-badge ${statusClass}">${statusLabel}</span>`
                                        }
                                    </div>
                                    <div class="doc-card-meta">
                                        <span>${metaInfo}</span>
                                    </div>
                                </div>
                                <div class="doc-card-actions">
                                    <button class="doc-card-action-btn" onclick="event.stopPropagation(); addCommentForDoc('${doc.id}')" title="Add comment">
                                        <span class="material-icons-outlined">chat_bubble_outline</span>
                                    </button>
                                    ${isViewing ? '<span class="doc-card-viewing">Viewing</span>' : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                    <div class="see-all-link" onclick="event.stopPropagation(); switchTab('documents')">
                        <span class="material-icons-outlined" style="font-size:16px">open_in_new</span>
                        ${totalCount > 3 ? `View all ${totalCount} documents` : 'View all documents'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Make functions globally available
window.renderPendingBanner = renderPendingBanner;
window.renderAISummary = renderAISummary;
window.renderCommentsSection = renderCommentsSection;
window.renderActionItemsSection = renderActionItemsSection;
window.renderDocumentsSection = renderDocumentsSection;
