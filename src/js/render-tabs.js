/*
 * =============================================
 * TAB RENDERING
 * =============================================
 *
 * Rendering functions for the different tabs:
 * - Event Log (Activity Timeline)
 * - Documents Tab
 * - Ask AI Tab
 * - Action Bar
 */

// ------------------------------------------
// EVENT LOG
// ------------------------------------------

function renderEventLog() {
    const container = document.getElementById('activity-tab');
    if (!state.caseInfo.id) { container.innerHTML = ''; return; }

    // -- Event type configuration --
    const verbConfig = {
        created: { verb: 'registered', suffix: 'this case', dotState: 'completed' },
        forwarded: { verb: 'forwarded', suffix: '', dotState: 'completed' },
        delegated: { verb: 'delegated', suffix: '', dotState: 'milestone' },
        submitted: { verb: 'submitted', suffix: 'a task for review', dotState: 'completed' },
        returned: { verb: 'requested revision on', suffix: '', dotState: 'sent-back' },
        comment: { verb: 'added a note', suffix: '', dotState: 'completed' },
        uploaded: { verb: 'uploaded', suffix: 'a document', dotState: 'completed' },
        completed: { verb: 'completed', suffix: 'a task', dotState: 'completed' },
        closed: { verb: 'closed', suffix: 'this case', dotState: 'approved' },
        rejected: { verb: 'rejected', suffix: 'this case', dotState: 'rejected' },
        approved: { verb: 'approved', suffix: 'the document', dotState: 'approved' },
        approval_rejected: { verb: 'rejected', suffix: 'the document', dotState: 'rejected' },
        priority_changed: { verb: 'changed priority', suffix: '', dotState: 'completed' },
        due_date_changed: { verb: 'changed due date', suffix: '', dotState: 'completed' },
        viewed: { verb: 'viewed', suffix: 'this case', dotState: 'completed' },
        task_cancelled: { verb: 'cancelled task', suffix: '', dotState: 'rejected' },
        task_reassigned: { verb: 'reassigned task', suffix: '', dotState: 'completed' },
        task_reopened: { verb: 'reopened task', suffix: '', dotState: 'completed' },
        task_approved: { verb: 'approved', suffix: 'a task', dotState: 'approved' }
    };

    // -- Change 1: System vs Decision classification --
    const SYSTEM_EVENTS = ['viewed', 'priority_changed', 'due_date_changed'];

    // Colored pill badges for decision events
    const VERB_BADGE_COLORS = {
        approved:          { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
        task_approved:     { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
        forwarded:         { bg: '#eff6ff', color: '#2563eb', label: 'Forwarded' },
        delegated:         { bg: '#f5f3ff', color: '#7c3aed', label: 'Delegated' },
        returned:          { bg: '#fffbeb', color: '#d97706', label: 'Revision Requested' },
        rejected:          { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
        approval_rejected: { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
        closed:            { bg: '#f0fdf4', color: '#16a34a', label: 'Closed' },
        submitted:         { bg: '#eff6ff', color: '#2563eb', label: 'Submitted' },
        task_cancelled:    { bg: '#fef2f2', color: '#ef4444', label: 'Cancelled' },
        task_reassigned:   { bg: '#fffbeb', color: '#d97706', label: 'Reassigned' },
        task_reopened:     { bg: '#eff6ff', color: '#2563eb', label: 'Reopened' },
    };

    function isSystemEvent(type) {
        return SYSTEM_EVENTS.includes(type);
    }

    // -- Change 6: Smarter collapse logic --
    // Always show decision events, only hide system events when collapsed
    let events = [...state.events];

    // Filter out system events (viewed, priority changes, etc.) when in "decisions only" mode
    if (state.eventsFilterMode === 'decisions') {
        events = events.filter(e => !isSystemEvent(e.type));
    }

    let hiddenSystemEvents = [];

    if (events.length > 7 && !state.eventsExpanded) {
        const decisionEvents = events.filter(e => !isSystemEvent(e.type));
        const systemEvents = events.filter(e => isSystemEvent(e.type));

        if (systemEvents.length > 0) {
            hiddenSystemEvents = systemEvents;
            events = decisionEvents;
        } else {
            // All decisions, no system events — use original collapse
            const visible = [events[0], events[1], ...events.slice(-2)];
            hiddenSystemEvents = events.slice(2, -2).map(e => e); // store for count
            events = visible;
        }
    }

    // Build "show more" summary text
    let showMoreHtml = '';
    if (hiddenSystemEvents.length > 0) {
        const typeCounts = {};
        hiddenSystemEvents.forEach(e => {
            const label = e.type === 'viewed' ? 'view' : e.type.replace(/_/g, ' ');
            typeCounts[label] = (typeCounts[label] || 0) + 1;
        });
        const parts = Object.entries(typeCounts).map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`);
        const summaryText = `${hiddenSystemEvents.length} more: ${parts.join(', ')}`;
        showMoreHtml = `<div class="show-more-events" onclick="expandEvents()"><span class="material-icons-outlined" style="font-size:18px">unfold_more</span>${summaryText}</div>`;
    }

    const fullEvents = [...state.events];
    const durations = {};
    for (let i = 0; i < fullEvents.length - 1; i++) {
        durations[fullEvents[i].id] = getSimulatedDuration(fullEvents[i].type, i);
    }

    let html = events.map((event, idx) => {
        const config = verbConfig[event.type] || { verb: 'performed action', suffix: '', dotState: 'completed' };
        const actor = getAOInfo(event.actor) || ROLES[event.actor];
        const target = event.target ? (getAOInfo(event.target) || ROLES[event.target]) : null;
        const isSystem = isSystemEvent(event.type);

        const isActorYou = event.actor === state.currentRole;
        const isTargetYou = event.target === state.currentRole ||
            (event.targets && event.targets.includes(state.currentRole));
        const involvesYou = isActorYou || isTargetYou;

        // -- Change 3: Role avatar --
        const actorColor = actor.color || '#9ca3af';
        const actorInitials = actor.initials || actor.name?.charAt(0) || '?';
        const avatarHtml = `<span class="event-avatar" style="background:${actorColor}">${actorInitials}</span>`;

        const actorHtml = `${avatarHtml}<span class="event-actor ${isActorYou ? 'is-you' : ''}">${isActorYou ? 'You' : actor.name}</span>`;

        // -- Change 1: Verb badge for decisions, plain text for system --
        const badgeConfig = VERB_BADGE_COLORS[event.type];
        const verbHtml = (badgeConfig && !isSystem)
            ? `<span class="event-verb-badge" style="background:${badgeConfig.bg};color:${badgeConfig.color}">${badgeConfig.label}</span>`
            : `<span class="event-verb">${config.verb}</span>`;

        // Dynamic suffix: for forwarded events, show the reason (e.g. "for review")
        const ACTION_LABELS = { review: 'for review', approve: 'for approval', sign: 'for signature', triage: 'for triage', 'urgent-review': 'for urgent review' };
        const dynamicSuffix = (event.type === 'forwarded' && event.action) ? ACTION_LABELS[event.action] || '' : config.suffix;
        const suffixHtml = dynamicSuffix ? `<span class="event-suffix"> ${dynamicSuffix}</span>` : '';
        // Handle multiple targets (e.g. delegation to multiple AOs)
        let targetHtml = '';
        if (event.targets && event.targets.length > 0) {
            const names = event.targets.map(id => {
                const info = getAOInfo(id) || ROLES[id];
                const isYou = id === state.currentRole;
                return `<span class="event-target ${isYou ? 'is-you' : ''}">${isYou ? 'you' : (info ? info.name : 'AO')}</span>`;
            });
            targetHtml = ` to ${names.join(', ')}`;
        } else if (target) {
            targetHtml = ` to <span class="event-target ${isTargetYou ? 'is-you' : ''}">${isTargetYou ? 'you' : target.name}</span>`;
        }

        // -- Change 2: Inline timestamp for system events --
        const inlineTime = isSystem ? ` <span class="event-time-inline">&middot; ${formatRelativeTime(event.timestamp)}</span>` : '';

        const actionLine = `${actorHtml} ${verbHtml}${targetHtml}${suffixHtml}${inlineTime}`;

        let dotState = config.dotState;
        if (idx === 0 && state.caseInfo.status === 'active') {
            dotState = 'active';
        }

        const isHighlighted = idx === 0 && state.highlightLatestEvent && ['forwarded', 'delegated', 'submitted', 'returned'].includes(event.type);

        // -- Change 4: Duration badge showing who acted and how fast --
        const duration = durations[event.id];
        let durationHtml = '';
        if (duration && event.type !== 'created' && event.type !== 'viewed' && event.type !== 'comment') {
            const durationClass = duration.minutes < 60 ? 'fast' : (duration.minutes < 240 ? 'normal' : 'slow');
            const actorLabel = isActorYou ? 'You' : (actor.name || 'Unknown');
            durationHtml = `
                <div class="event-duration ${durationClass}">
                    <span class="material-icons-outlined">schedule</span>
                    ${actorLabel} acted in ${duration.display}
                </div>
            `;
        }

        let statusBadge = '';
        if (idx === 0 && (event.type === 'closed' || (state.caseInfo.status === 'closed'))) {
            statusBadge = '<span class="event-status-badge completed">Completed</span>';
        } else if (idx === 0 && event.type === 'rejected') {
            statusBadge = '<span class="event-status-badge rejected">Rejected</span>';
        }

        // -- Change 7: Comment events get speech-bubble card --
        let contentHtml = '';
        if (event.note && event.type !== 'created') {
            if (event.type === 'delegated') {
                contentHtml = `
                    <div class="event-instructions">
                        <div class="event-instructions-label">Instructions</div>
                        <div class="event-instructions-text">${event.note}</div>
                    </div>
                `;
            } else if (event.type === 'uploaded') {
                const fileName = event.note;
                const fileType = fileName.endsWith('.xlsx') ? 'excel' : (fileName.endsWith('.docx') ? 'word' : 'pdf');
                const fileIcon = fileType === 'pdf' ? 'picture_as_pdf' : (fileType === 'excel' ? 'table_chart' : 'description');
                const clickHandler = event.docId ? `onclick="viewDocFromEventLog('${event.docId}')"` : '';
                contentHtml = `
                    <div class="event-attachment" ${clickHandler}>
                        <div class="event-attachment-icon ${fileType}">
                            <span class="material-icons-outlined">${fileIcon}</span>
                        </div>
                        <div class="event-attachment-info">
                            <div class="event-attachment-name">${fileName}</div>
                            <div class="event-attachment-size">Draft</div>
                        </div>
                        <div class="event-attachment-download">
                            <span class="material-icons-outlined">download</span>
                        </div>
                    </div>
                `;
            } else if (event.type === 'comment') {
                // Speech-bubble style card with role-colored left border
                const authorColor = actorColor;
                contentHtml = `<div class="event-comment-card" style="border-left-color:${authorColor}" onclick="goToComments()" title="View in Comments section">${event.note}</div>`;
            } else {
                contentHtml = `<div class="event-note" onclick="goToComments()" title="View in Comments section">${event.note}</div>`;
            }
        }

        let attachmentHtml = '';
        if (event.type === 'submitted' && event.docs && event.docs.length > 0) {
            attachmentHtml = event.docs.map(docId => {
                const doc = state.documents.find(d => d.id === docId);
                if (!doc) return '';
                const iconType = doc.type === 'pdf' ? 'pdf' : (doc.type === 'excel' ? 'excel' : 'word');
                const icon = doc.type === 'pdf' ? 'picture_as_pdf' : (doc.type === 'excel' ? 'table_chart' : 'description');
                return `
                    <div class="event-attachment" onclick="viewDocFromEventLog('${doc.id}')">
                        <div class="event-attachment-icon ${iconType}">
                            <span class="material-icons-outlined">${icon}</span>
                        </div>
                        <div class="event-attachment-info">
                            <div class="event-attachment-name">${doc.name}</div>
                            <div class="event-attachment-size">${doc.size}</div>
                        </div>
                        <div class="event-attachment-download">
                            <span class="material-icons-outlined">download</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // -- Change 2: Right-aligned timestamp only for decision events --
        let timestampHtml;
        if (statusBadge) {
            timestampHtml = statusBadge;
        } else if (isSystem) {
            timestampHtml = ''; // timestamp is inline in the action line
        } else {
            timestampHtml = `<span class="event-time">${formatRelativeTime(event.timestamp)}</span>`;
        }

        // -- Change 5: "CURRENT" badge on the latest event --
        const currentBadge = (idx === 0 && state.caseInfo.status === 'active')
            ? '<div class="event-current-badge">Current</div>'
            : '';

        // -- Change 6: Insert "show more" before the last event --
        const insertShowMore = (idx === events.length - 1 && showMoreHtml) ? showMoreHtml : '';

        return `
            ${insertShowMore}
            ${currentBadge}
            <div class="event-item ${isSystem ? 'system-event' : ''} ${isHighlighted ? 'highlighted' : ''}">
                <div class="event-dot ${dotState} ${involvesYou ? 'involves-you' : ''}"></div>
                <div class="event-content">
                    <div class="event-header">
                        <div class="event-action-line">${actionLine}</div>
                        ${timestampHtml}
                    </div>
                    ${durationHtml}
                    ${contentHtml}
                    ${attachmentHtml}
                </div>
            </div>
        `;
    }).join('');

    // Filter toggle button — shows when there are system events to hide/show
    const isFiltered = state.eventsFilterMode === 'decisions';
    const systemCount = state.events.filter(e => isSystemEvent(e.type)).length;
    const toggleHtml = systemCount > 0 ? `
        <div class="event-filter-bar">
            <button class="event-filter-toggle ${isFiltered ? 'active' : ''}" onclick="toggleEventFilter()">
                <span class="material-icons-outlined" style="font-size:16px">${isFiltered ? 'filter_list' : 'filter_list_off'}</span>
                ${isFiltered ? `Decisions only &middot; ${systemCount} hidden` : 'Showing all'}
            </button>
        </div>` : '';

    container.innerHTML = `${toggleHtml}<div class="event-log">${html}</div>`;
}

function getSimulatedDuration(eventType, index) {
    const baseDurations = {
        forwarded: [15, 30, 45],
        delegated: [10, 20, 30],
        submitted: [120, 240, 360],
        returned: [60, 120, 180],
        completed: [30, 60, 90],
        closed: [15, 30, 45],
        viewed: null,
        comment: null,
        created: null
    };

    const durations = baseDurations[eventType];
    if (!durations) return null;

    const minutes = durations[index % durations.length];

    if (minutes < 60) {
        return { minutes, display: `${minutes}m` };
    } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return { minutes, display: mins > 0 ? `${hours}h ${mins}m` : `${hours}h` };
    } else {
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        return { minutes, display: hours > 0 ? `${days}d ${hours}h` : `${days}d` };
    }
}

// ------------------------------------------
// DOCUMENTS TAB
// ------------------------------------------

function renderDocumentsTab() {
    const container = document.getElementById('document-tab');

    // No case loaded — show a helpful empty state
    if (!state.caseInfo.id) {
        container.innerHTML = `
            <div class="doc-empty-state">
                <span class="material-icons-outlined">description</span>
                <p class="doc-empty-state-text">No case selected</p>
                <p class="doc-empty-state-hint">Select or register a case to view documents.</p>
            </div>
        `;
        return;
    }

    const role = state.currentRole;
    const docTypeIcons = { pdf: 'picture_as_pdf', excel: 'table_chart', word: 'description' };

    const originalDoc = state.documents.find(d => d.status === 'original');
    const submissions = state.submissions || [];
    const drafts = state.drafts || [];

    let html = '';

    if (role === 'cs') {
        html = renderDocumentsForCS(originalDoc, submissions, drafts, docTypeIcons);
    } else if (role === 'ao') {
        html = renderDocumentsForAO(originalDoc, submissions, drafts, docTypeIcons);
    } else if (role === 'ea') {
        html = renderDocumentsForEA(originalDoc, submissions, drafts, docTypeIcons);
    } else {
        html = renderDocumentsForDTO(originalDoc, submissions, drafts, docTypeIcons);
    }

    // Fallback: if the role function returned empty, show generic empty state
    if (!html || html.trim() === '') {
        html = `
            <div class="doc-empty-state">
                <span class="material-icons-outlined">description</span>
                <p class="doc-empty-state-text">No documents yet</p>
                <p class="doc-empty-state-hint">Documents will appear here as the case progresses.</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Role-specific document views are in render-documents.js

// ------------------------------------------
// ASK AI TAB
// ------------------------------------------

function renderAskAITab() {
    const container = document.getElementById('ask-ai-tab');
    container.innerHTML = `
        <div class="chat-container">
            <div class="quick-prompts">
                <span class="quick-prompt" onclick="askQuickPrompt('Total budget?')">Total budget</span>
                <span class="quick-prompt" onclick="askQuickPrompt('Healthcare allocation?')">Healthcare</span>
                <span class="quick-prompt" onclick="askQuickPrompt('Key risks?')">Risks</span>
                <span class="quick-prompt" onclick="askQuickPrompt('Recommendation?')">Recommendation</span>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div class="chat-message ai">
                    <div class="chat-avatar">✨</div>
                    <div class="chat-bubble">I've analyzed the Budget Proposal 2025. Ask me anything!</div>
                </div>
            </div>
            <div class="chat-input-area">
                <div class="chat-input-wrapper">
                    <input type="text" class="chat-input" id="chat-input" placeholder="Ask about this document..." onkeypress="if(event.key==='Enter')sendChat()">
                </div>
                <button class="chat-send-btn" onclick="sendChat()"><span class="material-icons-outlined">send</span></button>
            </div>
        </div>
    `;
}

// ------------------------------------------
// ACTION BAR
// ------------------------------------------

function renderActionBar() {
    const container = document.getElementById('action-bar');
    const isHolder = state.caseInfo.currentHolder === state.currentRole;
    const isClosed = state.caseInfo.status === 'closed';
    const isRejected = state.caseInfo.status === 'rejected';
    const holder = ROLES[state.caseInfo.currentHolder];

    if (isClosed) {
        container.innerHTML = `
            <div class="action-bar-info" style="background:var(--success-light);border:1px solid #86efac">
                <span class="material-icons-outlined" style="color:var(--success)">verified</span>
                <span style="color:var(--success);font-weight:500">Case Closed</span>
            </div>
        `;
        return;
    }

    if (isRejected) {
        container.innerHTML = `
            <div class="action-bar-info" style="background:var(--danger-light);border:1px solid #fecaca">
                <span class="material-icons-outlined" style="color:var(--danger)">cancel</span>
                <span style="color:var(--danger);font-weight:500">Case Rejected</span>
            </div>
        `;
        return;
    }

    if (!isHolder) {
        let statusMessage = `Currently with ${holder.name}`;
        let statusIcon = 'hourglass_empty';
        let bgStyle = '';

        if (state.currentRole === 'cs' && state.actionItems.length > 0) {
            const completed = state.actionItems.filter(t => t.completed).length;
            const total = state.actionItems.length;
            const percent = Math.round((completed / total) * 100);

            if (percent === 100) {
                statusMessage = `${holder.name} has completed all tasks`;
                statusIcon = 'check_circle';
                bgStyle = 'background:var(--success-light);border:1px solid #86efac';
            } else {
                statusMessage = `${holder.name} is working (${percent}% complete)`;
                statusIcon = 'pending';
            }
        }

        container.innerHTML = `
            <div class="action-bar-info" style="${bgStyle}">
                <span class="material-icons-outlined">${statusIcon}</span>
                ${statusMessage}
            </div>
        `;
        return;
    }

    let html = '';

    if (state.currentRole === 'dto') {
        html = `
            <button class="primary-action" onclick="openSendModal('dto-ea')">
                <span class="material-icons-outlined">send</span>
                Send to Executive Assistant
            </button>
            <div class="secondary-actions">
                <button class="secondary-action" onclick="openSendModal('dto-cs')">
                    <span class="material-icons-outlined" style="font-size:16px">priority_high</span>
                    Send to CS (Urgent)
                </button>
            </div>
        `;
    } else if (state.currentRole === 'ea') {
        html = `
            <button class="primary-action" onclick="openSendModal('ea-cs')">
                <span class="material-icons-outlined">send</span>
                Forward to Chief Secretary
            </button>
            <div class="secondary-actions">
                <button class="secondary-action" onclick="openSendModal('ea-sendback')">
                    <span class="material-icons-outlined" style="font-size:16px">reply</span>
                    Return to DTO
                </button>
            </div>
        `;
    } else if (state.currentRole === 'cs') {
        html = `
            <button class="primary-action" onclick="openSendModal('cs-ao')">
                <span class="material-icons-outlined">person_add</span>
                Delegate to Action Officer
            </button>
            <div class="secondary-actions">
                <button class="secondary-action" onclick="openSendModal('cs-sendback')">
                    <span class="material-icons-outlined" style="font-size:16px">reply</span>
                    Send Back
                </button>
                <button class="secondary-action success" onclick="openCloseModal()">
                    <span class="material-icons-outlined" style="font-size:16px">check_circle</span>
                    Close Case
                </button>
                <button class="secondary-action danger" onclick="openSendModal('cs-reject')">
                    <span class="material-icons-outlined" style="font-size:16px">cancel</span>
                    Reject
                </button>
            </div>
        `;
    } else if (state.currentRole === 'ao') {
        const allDone = state.actionItems.length === 0 || state.actionItems.every(t => t.completed);
        const incompleteTasks = state.actionItems.filter(t => !t.completed).length;

        if (allDone) {
            html = `
                <button class="primary-action success" onclick="openSendModal('ao-cs')">
                    <span class="material-icons-outlined">upload</span>
                    Submit to Chief Secretary
                </button>
            `;
        } else {
            html = `
                <div style="text-align:center;padding:8px 0;margin-bottom:8px">
                    <span style="font-size:12px;color:var(--gray-500)">${incompleteTasks} task${incompleteTasks > 1 ? 's' : ''} remaining</span>
                </div>
                <button class="primary-action" onclick="openSendModal('ao-cs')" style="background:var(--gray-400)">
                    <span class="material-icons-outlined">upload</span>
                    Submit to Chief Secretary
                </button>
                <p style="font-size:11px;color:var(--gray-500);text-align:center;margin-top:8px">Complete tasks before submitting</p>
            `;
        }
    }

    container.innerHTML = html;
}

// ------------------------------------------
// COMMENTS TAB
// ------------------------------------------

function renderCommentsTab() {
    const container = document.getElementById('comments-tab');
    if (!container) return;
    if (!state.caseInfo.id) { container.innerHTML = ''; return; }

    // Comment input state
    const { recipient, text, dropdownOpen, highlightedIndex, linkedDocId } = state.commentInput;
    const recipientRole = recipient ? (getAOInfo(recipient) || ROLES[recipient]) : null;
    const recipients = Object.keys(ROLES).filter(id => id !== state.currentRole);
    const linkedDoc = linkedDocId ? findDocument(linkedDocId) : null;
    const canSend = recipient && text.trim().length > 0;

    // Comment composer
    const composerHtml = `
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
                                            <div class="recipient-option-title">${role.roleTitle}</div>
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

    // All comments (no limit)
    const commentsHtml = state.comments.length === 0
        ? '<div class="empty-state" style="text-align:center;padding:40px 20px;color:var(--gray-400)">No messages yet. Start a conversation!</div>'
        : state.comments.map(c => {
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
        }).join('');

    container.innerHTML = `
        ${composerHtml}
        <div class="comments-list">
            ${commentsHtml}
        </div>
    `;
}

// Make functions globally available
window.renderEventLog = renderEventLog;
window.getSimulatedDuration = getSimulatedDuration;
window.renderDocumentsTab = renderDocumentsTab;
window.renderAskAITab = renderAskAITab;
window.renderActionBar = renderActionBar;
window.renderCommentsTab = renderCommentsTab;
