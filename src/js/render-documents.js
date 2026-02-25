/*
 * =============================================
 * DOCUMENT TAB RENDERING (Role-Specific)
 * =============================================
 *
 * Each role sees a different view of documents:
 * - CS: Received submissions + Original
 * - AO: Their drafts + Submitted work + Original
 * - EA: Incoming document + Case activity (read-only)
 * - DTO: Their submission status
 */

// ------------------------------------------
// CHIEF SECRETARY VIEW
// ------------------------------------------

function renderDocumentsForCS(originalDoc, submissions, drafts, icons) {
    const latestSubmission = submissions.filter(s => s.submittedTo === 'cs').sort((a, b) => b.round - a.round)[0];
    const previousSubmissions = submissions.filter(s => s.submittedTo === 'cs' && s !== latestSubmission);

    let html = '';

    // SECTION 1: Received from Action Officer
    if (latestSubmission) {
        const sender = ROLES[latestSubmission.submittedBy];
        const isNew = !latestSubmission.viewedBy.includes('cs');

        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">inbox</span>
                    Received from ${sender.shortName || sender.name}
                    ${isNew ? '<span class="doc-badge-new">New</span>' : ''}
                </div>

                <div class="submission-group">
                    <div class="submission-group-header">
                        <div class="submission-sender-avatar" style="background:${sender.color}">${sender.initials}</div>
                        <div class="submission-sender-info">
                            <div class="submission-sender-name">${sender.name}</div>
                            <div class="submission-sender-meta">
                                Submitted ${latestSubmission.submittedAt}
                                ${latestSubmission.round > 1 ? `<span class="doc-revision-badge">Revision ${latestSubmission.round}</span>` : ''}
                            </div>
                        </div>
                        <div class="submission-context">
                            <span class="material-icons-outlined">reply</span>
                            ${latestSubmission.inResponseTo}
                        </div>
                    </div>

                    ${latestSubmission.documents.map(doc => {
                        const isActive = doc.id === state.selectedDocId;
                        return `
                            <div class="document-card ${isNew ? 'has-new' : ''} ${isActive ? 'active' : ''}" onclick="selectSubmissionDoc('${latestSubmission.id}', '${doc.id}')">
                                <div class="doc-icon ${doc.type}"><span class="material-icons-outlined">${icons[doc.type]}</span></div>
                                <div class="doc-details">
                                    <div class="doc-name">${doc.name}</div>
                                    <div class="doc-meta">${doc.size} • ${doc.uploadedAt}</div>
                                    <div class="doc-badges">
                                        ${isNew ? '<span class="doc-badge-new">New</span>' : '<span class="doc-status received">Received</span>'}
                                    </div>
                                </div>
                                <button class="doc-action-btn" onclick="event.stopPropagation(); addCommentForDoc('${doc.id}')" title="Add comment">
                                    <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                                </button>
                                <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                                    <span class="material-icons-outlined" style="font-size:18px">download</span>
                                </button>
                            </div>
                        `;
                    }).join('')}

                    ${previousSubmissions.length > 0 ? `
                        <div class="previous-submissions" id="prev-submissions">
                            <div class="previous-submissions-header" onclick="togglePreviousSubmissions()">
                                <span class="material-icons-outlined">expand_more</span>
                                ${previousSubmissions.length} previous submission${previousSubmissions.length > 1 ? 's' : ''}
                            </div>
                            <div class="previous-submissions-list">
                                ${previousSubmissions.map(sub => sub.documents.map(doc => `
                                    <div class="previous-doc-item" onclick="selectSubmissionDoc('${sub.id}', '${doc.id}')">
                                        <span class="material-icons-outlined">${icons[doc.type]}</span>
                                        <span class="previous-doc-name">${doc.name}</span>
                                        <span class="previous-doc-status">${sub.status === 'returned' ? 'Returned' : 'Round ' + sub.round}</span>
                                    </div>
                                `).join('')).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">inbox</span>
                    Received Documents
                </div>
                <div class="doc-empty-state">
                    <span class="material-icons-outlined">hourglass_empty</span>
                    <div class="doc-empty-state-text">No submissions yet</div>
                    <div class="doc-empty-state-hint">Documents from Action Officers will appear here</div>
                </div>
            </div>
        `;
    }

    // SECTION 2: Original Case Document
    if (originalDoc) {
        const uploader = ROLES[originalDoc.uploadedBy];
        const isActive = originalDoc.id === state.selectedDocId;
        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">description</span>
                    Case Document
                </div>
                <div class="document-card original ${isActive ? 'active' : ''}" onclick="selectDoc('${originalDoc.id}')">
                    <div class="doc-icon ${originalDoc.type}"><span class="material-icons-outlined">${icons[originalDoc.type]}</span></div>
                    <div class="doc-details">
                        <div class="doc-name">${originalDoc.name}</div>
                        <div class="doc-meta">${originalDoc.size} • Registered by ${uploader.name} • ${originalDoc.uploadedAt}</div>
                        <span class="doc-status original">Original</span>
                    </div>
                    <button class="doc-action-btn" onclick="event.stopPropagation(); addCommentForDoc('${originalDoc.id}')" title="Add comment">
                        <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                    </button>
                    <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                        <span class="material-icons-outlined" style="font-size:18px">download</span>
                    </button>
                </div>
            </div>
        `;
    }

    return html;
}

// ------------------------------------------
// ACTION OFFICER VIEW
// ------------------------------------------

function renderDocumentsForAO(originalDoc, submissions, drafts, icons) {
    const mySubmissions = submissions.filter(s => s.submittedBy === 'ao');
    const latestSubmission = mySubmissions.sort((a, b) => b.round - a.round)[0];

    let html = '';
    const isHolder = state.caseInfo.currentHolder === 'ao';
    const uploadBtn = isHolder ? `
        <button class="section-action-btn" onclick="openModal('upload-modal')" title="Upload document" style="margin-left:auto;width:28px;height:28px;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center">
            <span class="material-icons-outlined" style="font-size:16px">add</span>
        </button>
    ` : '';

    // SECTION 1: Your Documents
    html += `
        <div class="doc-section">
            <div class="doc-section-title">
                <span class="material-icons-outlined" style="font-size:16px">drive_file_move</span>
                Your Documents
                ${uploadBtn}
            </div>
    `;

    // Show drafts
    if (drafts.length > 0) {
        html += drafts.map(doc => {
            const isActive = doc.id === state.selectedDocId;
            return `
                <div class="document-card ${isActive ? 'active' : ''}" onclick="selectDoc('${doc.id}')">
                    <div class="doc-icon ${doc.type}"><span class="material-icons-outlined">${icons[doc.type]}</span></div>
                    <div class="doc-details">
                        <div class="doc-name">${doc.name}</div>
                        <div class="doc-meta">${doc.size} • ${doc.uploadedAt}</div>
                        <div class="doc-badges">
                            <span class="doc-status draft">Draft</span>
                            <span style="font-size:11px;color:var(--gray-500)">Only visible to you</span>
                        </div>
                    </div>
                    <button class="doc-action-btn" onclick="event.stopPropagation(); addCommentForDoc('${doc.id}')" title="Add comment">
                        <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                    </button>
                    <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                        <span class="material-icons-outlined" style="font-size:18px">download</span>
                    </button>
                </div>
            `;
        }).join('');
    }

    // Show latest submission
    if (latestSubmission) {
        const recipient = ROLES[latestSubmission.submittedTo];
        const statusLabel = latestSubmission.status === 'returned' ? 'Needs Revision' :
                           latestSubmission.status === 'under-review' ? 'Submitted' : 'Accepted';
        const statusClass = latestSubmission.status === 'returned' ? 'revision' : 'submitted';

        html += latestSubmission.documents.map(doc => {
            const isActive = doc.id === state.selectedDocId;
            return `
                <div class="document-card ${isActive ? 'active' : ''}" onclick="selectSubmissionDoc('${latestSubmission.id}', '${doc.id}')">
                    <div class="doc-icon ${doc.type}"><span class="material-icons-outlined">${icons[doc.type]}</span></div>
                    <div class="doc-details">
                        <div class="doc-name">${doc.name}</div>
                        <div class="doc-meta">${doc.size} • Sent to ${recipient.shortName || recipient.name} • ${doc.uploadedAt}</div>
                        <div class="doc-badges">
                            <span class="doc-status ${statusClass}">${statusLabel}</span>
                            ${latestSubmission.round > 1 ? `<span class="doc-revision-badge">v${latestSubmission.round}</span>` : ''}
                        </div>
                        ${latestSubmission.status === 'returned' && latestSubmission.returnReason ? `
                            <div class="doc-source" style="color:#b45309;margin-top:8px">
                                <span class="material-icons-outlined" style="font-size:14px">info</span>
                                ${latestSubmission.returnReason}
                            </div>
                        ` : ''}
                    </div>
                    <button class="doc-action-btn" onclick="event.stopPropagation(); addCommentForDoc('${doc.id}')" title="Add comment">
                        <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                    </button>
                    <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                        <span class="material-icons-outlined" style="font-size:18px">download</span>
                    </button>
                </div>
            `;
        }).join('');
    }

    // Empty state
    if (drafts.length === 0 && !latestSubmission) {
        html += `
            <div class="doc-empty-state">
                <span class="material-icons-outlined">upload_file</span>
                <div class="doc-empty-state-text">No documents yet</div>
                <div class="doc-empty-state-hint">Upload documents to prepare your submission</div>
            </div>
        `;
    }

    html += `</div>`;

    // SECTION 2: Reference Document
    if (originalDoc) {
        const uploader = ROLES[originalDoc.uploadedBy];
        const isActive = originalDoc.id === state.selectedDocId;
        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">description</span>
                    Reference Document
                </div>
                <div class="document-card original ${isActive ? 'active' : ''}" onclick="selectDoc('${originalDoc.id}')">
                    <div class="doc-icon ${originalDoc.type}"><span class="material-icons-outlined">${icons[originalDoc.type]}</span></div>
                    <div class="doc-details">
                        <div class="doc-name">${originalDoc.name}</div>
                        <div class="doc-meta">${originalDoc.size} • ${uploader.name} • ${originalDoc.uploadedAt}</div>
                        <span class="doc-status original">Original Case</span>
                    </div>
                    <button class="doc-action-btn" onclick="event.stopPropagation(); addCommentForDoc('${originalDoc.id}')" title="Add comment">
                        <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                    </button>
                    <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                        <span class="material-icons-outlined" style="font-size:18px">download</span>
                    </button>
                </div>
            </div>
        `;
    }

    return html;
}

// ------------------------------------------
// EXECUTIVE ASSISTANT VIEW
// ------------------------------------------

function renderDocumentsForEA(originalDoc, submissions, drafts, icons) {
    const csSubmissions = submissions.filter(s => s.submittedTo === 'cs' && s.status !== 'draft');

    // Empty state when no documents exist yet
    if (!originalDoc && csSubmissions.length === 0) {
        return `
            <div class="doc-empty-state">
                <span class="material-icons-outlined" style="font-size:40px;color:var(--gray-300)">description</span>
                <p style="font-size:14px;font-weight:500;color:var(--gray-600);margin:12px 0 4px">No documents yet</p>
                <p style="font-size:12px;color:var(--gray-400)">Documents will appear here once a case is registered.</p>
            </div>
        `;
    }

    let html = '';

    // SECTION 1: Incoming Document
    if (originalDoc) {
        const uploader = ROLES[originalDoc.uploadedBy];
        const isActive = originalDoc.id === state.selectedDocId;
        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">move_to_inbox</span>
                    Incoming Document
                </div>
                <div class="document-card original ${isActive ? 'active' : ''}" onclick="selectDoc('${originalDoc.id}')">
                    <div class="doc-icon ${originalDoc.type}"><span class="material-icons-outlined">${icons[originalDoc.type]}</span></div>
                    <div class="doc-details">
                        <div class="doc-name">${originalDoc.name}</div>
                        <div class="doc-meta">${originalDoc.size} • From ${uploader.name} • ${originalDoc.uploadedAt}</div>
                        <span class="doc-status original">Original</span>
                        <div class="doc-source" style="margin-top:8px">
                            <div class="doc-source-avatar" style="background:${uploader.color}">${uploader.initials}</div>
                            Registered by ${uploader.shortName || uploader.name}
                        </div>
                    </div>
                    <button class="doc-action-btn" onclick="event.stopPropagation(); addCommentForDoc('${originalDoc.id}')" title="Add comment">
                        <span class="material-icons-outlined" style="font-size:18px">chat_bubble_outline</span>
                    </button>
                    <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                        <span class="material-icons-outlined" style="font-size:18px">download</span>
                    </button>
                </div>
            </div>
        `;
    }

    // SECTION 2: Case Activity (read only)
    if (csSubmissions.length > 0) {
        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">history</span>
                    Case Documents
                    <span style="font-size:10px;color:var(--gray-400);margin-left:4px">(View only)</span>
                </div>
                ${csSubmissions.flatMap(sub => sub.documents).map(doc => {
                    const isActive = doc.id === state.selectedDocId;
                    const uploader = ROLES[doc.uploadedBy];
                    return `
                        <div class="document-card ${isActive ? 'active' : ''}" onclick="selectDoc('${doc.id}')" style="opacity:0.85">
                            <div class="doc-icon ${doc.type}"><span class="material-icons-outlined">${icons[doc.type]}</span></div>
                            <div class="doc-details">
                                <div class="doc-name">${doc.name}</div>
                                <div class="doc-meta">${doc.size} • From ${uploader.name}</div>
                                <span class="doc-status submitted">From Action Officer</span>
                            </div>
                            <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                                <span class="material-icons-outlined" style="font-size:18px">download</span>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    return html;
}

// ------------------------------------------
// DOCUMENT TRANSFER OFFICER VIEW
// ------------------------------------------

function renderDocumentsForDTO(originalDoc, submissions, drafts, icons) {
    const allSubmittedDocs = submissions.flatMap(s => s.documents);

    // Empty state when no documents exist yet
    if (!originalDoc && allSubmittedDocs.length === 0) {
        return `
            <div class="doc-empty-state">
                <span class="material-icons-outlined" style="font-size:40px;color:var(--gray-300)">description</span>
                <p style="font-size:14px;font-weight:500;color:var(--gray-600);margin:12px 0 4px">No documents yet</p>
                <p style="font-size:12px;color:var(--gray-400)">Documents will appear here once you register a case with files.</p>
            </div>
        `;
    }

    let html = '';

    // SECTION 1: Your Submission
    if (originalDoc) {
        const isActive = originalDoc.id === state.selectedDocId;
        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">check_circle</span>
                    Your Submission
                </div>
                <div class="document-card original ${isActive ? 'active' : ''}" onclick="selectDoc('${originalDoc.id}')">
                    <div class="doc-icon ${originalDoc.type}"><span class="material-icons-outlined">${icons[originalDoc.type]}</span></div>
                    <div class="doc-details">
                        <div class="doc-name">${originalDoc.name}</div>
                        <div class="doc-meta">${originalDoc.size} • Submitted ${originalDoc.uploadedAt}</div>
                        <div class="doc-badges">
                            <span class="doc-status submitted">✓ Received</span>
                        </div>
                    </div>
                    <button class="doc-action-btn" onclick="event.stopPropagation()" title="Download">
                        <span class="material-icons-outlined" style="font-size:18px">download</span>
                    </button>
                </div>
            </div>
        `;
    }

    // SECTION 2: Case Progress (limited visibility)
    if (allSubmittedDocs.length > 0) {
        html += `
            <div class="doc-section">
                <div class="doc-section-title">
                    <span class="material-icons-outlined" style="font-size:16px">folder_shared</span>
                    Case Progress
                    <span style="font-size:10px;color:var(--gray-400);margin-left:4px">(${allSubmittedDocs.length} document${allSubmittedDocs.length > 1 ? 's' : ''} added)</span>
                </div>
                <div style="padding:16px;background:var(--gray-50);border-radius:8px;text-align:center">
                    <span class="material-icons-outlined" style="font-size:32px;color:var(--gray-400);margin-bottom:8px;display:block">lock</span>
                    <div style="font-size:13px;color:var(--gray-600)">Case is being processed</div>
                    <div style="font-size:12px;color:var(--gray-400);margin-top:4px">${allSubmittedDocs.length} additional document${allSubmittedDocs.length > 1 ? 's' : ''} in workflow</div>
                </div>
            </div>
        `;
    }

    return html;
}

// Make functions globally available
window.renderDocumentsForCS = renderDocumentsForCS;
window.renderDocumentsForAO = renderDocumentsForAO;
window.renderDocumentsForEA = renderDocumentsForEA;
window.renderDocumentsForDTO = renderDocumentsForDTO;
