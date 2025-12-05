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
    const container = document.getElementById('event-log-tab');

    const verbConfig = {
        created: { verb: 'registered', suffix: 'this case', dotState: 'completed' },
        forwarded: { verb: 'forwarded', suffix: '', dotState: 'completed' },
        delegated: { verb: 'delegated', suffix: '', dotState: 'milestone' },
        submitted: { verb: 'completed & forwarded', suffix: '', dotState: 'completed' },
        returned: { verb: 'sent back', suffix: '', dotState: 'sent-back' },
        comment: { verb: 'added a note', suffix: '', dotState: 'completed' },
        uploaded: { verb: 'uploaded', suffix: 'a document', dotState: 'completed' },
        completed: { verb: 'completed', suffix: 'a task', dotState: 'completed' },
        closed: { verb: 'approved', suffix: '', dotState: 'approved' },
        rejected: { verb: 'rejected', suffix: 'this case', dotState: 'rejected' },
        priority_changed: { verb: 'changed priority', suffix: '', dotState: 'completed' },
        due_date_changed: { verb: 'changed due date', suffix: '', dotState: 'completed' },
        viewed: { verb: 'viewed', suffix: 'this case', dotState: 'completed' }
    };

    let events = [...state.events];
    let hiddenCount = 0;

    if (events.length > 5 && !state.eventsExpanded) {
        const visible = [events[0], events[1], ...events.slice(-2)];
        hiddenCount = events.length - 4;
        events = visible;
    }

    const fullEvents = [...state.events];
    const durations = {};
    for (let i = 0; i < fullEvents.length - 1; i++) {
        durations[fullEvents[i].id] = getSimulatedDuration(fullEvents[i].type, i);
    }

    let html = events.map((event, idx) => {
        const config = verbConfig[event.type] || { verb: 'performed action', suffix: '', dotState: 'completed' };
        const actor = ROLES[event.actor];
        const target = event.target ? ROLES[event.target] : null;

        const isActorYou = event.actor === state.currentRole;
        const isTargetYou = event.target === state.currentRole;
        const involvesYou = isActorYou || isTargetYou;

        const actorHtml = `<span class="event-actor ${isActorYou ? 'is-you' : ''}">${isActorYou ? 'You' : actor.name}</span>`;
        const verbHtml = `<span class="event-verb">${config.verb}</span>`;
        const suffixHtml = config.suffix ? `<span class="event-suffix"> ${config.suffix}</span>` : '';
        const targetHtml = target ? ` to <span class="event-target ${isTargetYou ? 'is-you' : ''}">${isTargetYou ? 'you' : target.name}</span>` : '';

        const actionLine = `${actorHtml} ${verbHtml}${targetHtml}${suffixHtml}`;

        let dotState = config.dotState;
        if (idx === 0 && state.caseInfo.status === 'active') {
            dotState = 'active';
        }

        const isHighlighted = idx === 0 && state.highlightLatestEvent && ['forwarded', 'delegated', 'submitted', 'returned'].includes(event.type);

        const duration = durations[event.id];
        let durationHtml = '';
        if (duration && event.type !== 'created' && event.type !== 'viewed' && event.type !== 'comment') {
            const durationClass = duration.minutes < 60 ? 'fast' : (duration.minutes < 240 ? 'normal' : 'slow');
            durationHtml = `
                <div class="event-duration ${durationClass}">
                    <span class="material-icons-outlined">schedule</span>
                    ${duration.display}
                </div>
            `;
        }

        let statusBadge = '';
        if (idx === 0 && (event.type === 'closed' || (state.caseInfo.status === 'closed'))) {
            statusBadge = '<span class="event-status-badge completed">Completed</span>';
        } else if (idx === 0 && event.type === 'rejected') {
            statusBadge = '<span class="event-status-badge rejected">Rejected</span>';
        }

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

        let showMore = '';
        if (idx === 1 && hiddenCount > 0) {
            showMore = `<div class="show-more-events" onclick="expandEvents()"><span class="material-icons-outlined" style="font-size:18px">unfold_more</span>Show ${hiddenCount} more activities</div>`;
        }

        const timestampHtml = statusBadge || `<span class="event-time">${event.timestamp}</span>`;

        return `
            ${showMore}
            <div class="event-item ${isHighlighted ? 'highlighted' : ''}">
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

    container.innerHTML = `<div class="event-log">${html}</div>`;
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
    const container = document.getElementById('documents-tab');
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

// Make functions globally available
window.renderEventLog = renderEventLog;
window.getSimulatedDuration = getSimulatedDuration;
window.renderDocumentsTab = renderDocumentsTab;
window.renderAskAITab = renderAskAITab;
window.renderActionBar = renderActionBar;
