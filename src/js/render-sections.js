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
    const requester = getAOInfo(state.caseInfo.pendingFrom) || ROLES[state.caseInfo.pendingFrom];
    const role = state.currentRole;
    const isHolder = state.caseInfo.currentHolder === state.currentRole;

    // AO gets special "Work Assigned" banner
    if (isAORole(role) && state.caseInfo.pendingAction === 'delegation') {
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

    // Approval banner with Approve/Reject buttons (if enabled in config)
    if (state.caseInfo.pendingAction === 'approve' && isHolder && UI_CONFIG.approvalButtons.showInBanner) {
        return `
            <div class="banner-approval-requested">
                <div class="banner-icon">
                    <span class="material-icons-outlined">check_circle</span>
                </div>
                <div class="banner-approval-content">
                    <div class="banner-pending-title">Approval Requested</div>
                    <div class="banner-pending-subtitle">Review and decide • From ${requester.name}</div>
                </div>
                <div class="banner-approval-actions">
                    <button class="btn btn-approve" onclick="handleApprove()">
                        <span class="material-icons-outlined" style="font-size:18px">check_circle</span>
                        Approve
                    </button>
                    <button class="btn btn-reject" onclick="handleReject()">
                        <span class="material-icons-outlined" style="font-size:18px">cancel</span>
                        Reject
                    </button>
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
        'revision': 'Changes Requested'
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
    // Overview preview: show max 3 recent comments (read-only, no input)
    const previewComments = state.comments.slice(0, 3);
    const totalCount = state.comments.length;

    return `
        <div class="section-card ${commentsExpanded ? 'expanded' : ''}" id="comments-section">
            <div class="section-header" onclick="toggleSection('comments')">
                <div class="section-title">
                    <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                    Comments
                    ${totalCount > 0 ? `<span class="section-count">${totalCount}</span>` : ''}
                </div>
                <span class="material-icons-outlined section-toggle">expand_more</span>
            </div>
            <div class="section-content">
                <div class="section-body">
                    ${totalCount === 0
                        ? '<div class="empty-state" style="text-align:center;padding:20px;color:var(--gray-400)">No messages yet</div>'
                        : previewComments.map(c => {
                            const author = getAOInfo(c.author) || ROLES[c.author];
                            const commentRecipient = c.recipient ? (getAOInfo(c.recipient) || ROLES[c.recipient]) : null;
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
                    <div class="see-all-link" onclick="event.stopPropagation(); switchTab('comments')">
                        <span class="material-icons-outlined" style="font-size:16px">open_in_new</span>
                        ${totalCount > 3 ? `View all ${totalCount} comments` : 'View all comments'}
                    </div>
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
    // For AO roles (ao2, ao3), fall back to the base 'ao' config
    const roleConfig = ROLE_CONFIG[state.currentRole] || (isAORole(state.currentRole) ? ROLE_CONFIG['ao'] : null);
    const taskView = roleConfig.taskView;

    // ------------------------------------------
    // NEW TASK SYSTEM (uses state.tasks)
    // ------------------------------------------
    // If new tasks exist, use the new card-based rendering
    if (state.tasks.length > 0) {
        if (isAORole(state.currentRole)) {
            return renderAOTasksOverview();
        }
        if (state.currentRole === 'cs') {
            return renderCSTasksOverview();
        }
        // DTO/EA (readonly): summary card in Overview tab
        if (taskView === 'readonly') {
            const counts = getTaskStatusCounts();
            const tasksExpanded = state.sectionStates.actionItems;
            return `
                <div class="section-card ${tasksExpanded ? 'expanded' : ''}" id="tasks-section">
                    <div class="section-header" onclick="toggleSection('actionItems')">
                        <div class="section-title">
                            <span class="material-icons-outlined" style="font-size:18px">assignment</span>
                            Delegated Work
                            <span class="section-count">${state.tasks.length}</span>
                        </div>
                        <span class="material-icons-outlined section-toggle">expand_more</span>
                    </div>
                    <div class="section-content">
                        <div class="section-body">
                            <div class="tasks-summary">
                                <div class="tasks-summary-icon">
                                    <span class="material-icons-outlined">people</span>
                                </div>
                                <div class="tasks-summary-text">
                                    <strong>${state.tasks.length} tasks</strong> delegated to Action Officers<br>
                                    <span style="color:var(--gray-500)">
                                        ${counts.completed} approved, ${counts.submitted} pending review, ${counts.in_progress} in progress
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // ------------------------------------------
    // LEGACY FALLBACK (uses state.actionItems)
    // ------------------------------------------
    // For EA summary view, or if old-style tasks exist

    // No tasks exist yet (neither new nor legacy)
    if (state.actionItems.length === 0 && state.tasks.length === 0) {
        return '';
    }

    const completed = state.actionItems.filter(t => t.completed).length;
    const total = state.actionItems.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const tasksExpanded = state.sectionStates.actionItems;

    // DTO/EA: Legacy summary view
    if (taskView === 'readonly') {
        if (state.tasks.length > 0) {
            // Use new task data for EA summary
            const counts = getTaskStatusCounts();
            return `
                <div class="section-card ${tasksExpanded ? 'expanded' : ''}" id="tasks-section">
                    <div class="section-header" onclick="toggleSection('actionItems')">
                        <div class="section-title">
                            <span class="material-icons-outlined" style="font-size:18px">assignment</span>
                            Delegated Work
                            <span class="section-count">${state.tasks.length}</span>
                        </div>
                        <span class="material-icons-outlined section-toggle">expand_more</span>
                    </div>
                    <div class="section-content">
                        <div class="section-body">
                            <div class="tasks-summary">
                                <div class="tasks-summary-icon">
                                    <span class="material-icons-outlined">people</span>
                                </div>
                                <div class="tasks-summary-text">
                                    <strong>${state.tasks.length} tasks</strong> delegated to Action Officers<br>
                                    <span style="color:var(--gray-500)">
                                        ${counts.completed} approved, ${counts.submitted} pending review, ${counts.in_progress} in progress
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Legacy EA summary
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
                    sender: getAOInfo(latestSubmission.submittedBy) || ROLES[latestSubmission.submittedBy]
                });
            });
            totalCount += latestSubmission.documents.length;
        }
        if (displayDocs.length < 3 && originalDoc) {
            displayDocs.push({ ...originalDoc, isOriginal: true });
        }
    } else if (isAORole(role)) {
        sectionTitle = 'Your Documents';
        sectionIcon = 'drive_file_move';
        drafts.slice(0, 2).forEach(doc => {
            displayDocs.push({ ...doc, isDraft: true });
        });
        const mySubmission = submissions.filter(s => s.submittedBy === role).sort((a, b) => b.round - a.round)[0];
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
    const canUpload = isHolder && isAORole(role);
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
                            statusLabel = `From ${doc.sender?.name || 'Unknown'}`;
                            statusClass = 'received';
                        } else if (doc.isSubmitted) {
                            statusLabel = doc.status === 'returned' ? 'Needs Changes' : 'Submitted';
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
