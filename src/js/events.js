/*
 * =============================================
 * EVENT HANDLERS
 * =============================================
 *
 * Functions that respond to user actions:
 * - Clicking buttons
 * - Selecting items
 * - Toggling sections
 * - Keyboard shortcuts
 */

// ------------------------------------------
// ROLE SWITCHING
// ------------------------------------------

function switchRole(roleId) {
    const previousRole = state.currentRole;
    state.currentRole = roleId;
    state.highlightLatestEvent = false;

    // Add "viewed" event when switching to holder role
    if (state.caseInfo.currentHolder === roleId && state.caseInfo.status === 'active') {
        const lastEvent = state.events[0];
        if (!(lastEvent && lastEvent.type === 'viewed' && lastEvent.actor === roleId)) {
            state.events.unshift({
                id: Date.now(),
                type: 'viewed',
                actor: roleId,
                timestamp: 'Just now'
            });
        }
    }

    renderAll();
    showToast(`Viewing as ${ROLES[roleId].name}`, 'success');
}

// ------------------------------------------
// DOCUMENT SELECTION
// ------------------------------------------

function selectDoc(docId) {
    state.selectedDocId = docId;
    renderDocTabs();
    renderDocContent();
    renderDetailsTab();
    renderDocumentsTab();
}

function viewDocFromEventLog(docId) {
    state.selectedDocId = docId;
    switchTab('documents');
    renderDocTabs();
    renderDocContent();
}

function selectSubmissionDoc(submissionId, docId) {
    // Mark as viewed
    const submission = state.submissions.find(s => s.id === submissionId);
    if (submission && !submission.viewedBy.includes(state.currentRole)) {
        submission.viewedBy.push(state.currentRole);
    }
    state.selectedDocId = docId;
    renderAll();
}

// ------------------------------------------
// TAB SWITCHING
// ------------------------------------------

function switchTab(tabId) {
    state.activeTab = tabId;

    // Update tab buttons
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId + '-tab');
    });
}

// ------------------------------------------
// SECTION TOGGLES
// ------------------------------------------

function toggleSection(sectionKey) {
    state.sectionStates[sectionKey] = !state.sectionStates[sectionKey];
    renderDetailsTab();
}

function toggleAISummary(event, el) {
    if (event.target.closest('.ask-ai-btn')) return;
    state.sectionStates.aiSummary = !state.sectionStates.aiSummary;
    el.classList.toggle('expanded');
}

function toggleShowAllTasks() {
    state.showAllTasks = !state.showAllTasks;
    renderDetailsTab();
}

function toggleShowAllComments() {
    state.showAllComments = !state.showAllComments;
    renderDetailsTab();
}

function togglePreviousSubmissions() {
    const el = document.getElementById('prev-submissions');
    if (el) el.classList.toggle('expanded');
}

function expandEvents() {
    state.eventsExpanded = true;
    renderEventLog();
}

// ------------------------------------------
// TASK INTERACTIONS
// ------------------------------------------

function toggleTask(taskId) {
    const task = state.actionItems.find(t => t.id === taskId);
    if (!task || state.currentRole !== 'ao') return;

    task.completed = !task.completed;

    if (task.completed) {
        state.events.unshift({
            id: Date.now(),
            type: 'completed',
            actor: state.currentRole,
            note: `Completed: "${task.title}"`,
            timestamp: 'Just now'
        });
        showToast('Task completed!', 'success');
    }

    renderDetailsTab();
    renderEventLog();
}

// ------------------------------------------
// NAVIGATION HELPERS
// ------------------------------------------

function goToEventLog() {
    state.highlightLatestEvent = true;
    switchTab('event-log');
    setTimeout(() => {
        state.highlightLatestEvent = false;
        renderEventLog();
    }, 2000);
}

function goToComments() {
    switchTab('details');
    state.sectionStates.comments = true;
    renderDetailsTab();

    setTimeout(() => {
        const commentsSection = document.getElementById('comments-section');
        if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            commentsSection.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.3)';
            setTimeout(() => { commentsSection.style.boxShadow = ''; }, 2000);
        }
    }, 100);
}

// ------------------------------------------
// PRIORITY DROPDOWN
// ------------------------------------------

function togglePriorityDropdown(event) {
    event.stopPropagation();
    const options = document.getElementById('priority-options');
    options.classList.toggle('show');

    // Close on outside click
    const closeDropdown = (e) => {
        if (!e.target.closest('.priority-dropdown')) {
            options.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    };
    document.addEventListener('click', closeDropdown);
}

function changePriority(priority) {
    const oldPriority = state.caseInfo.priority;
    state.caseInfo.priority = priority;

    state.events.unshift({
        id: Date.now(),
        type: 'priority_changed',
        actor: state.currentRole,
        note: `Changed priority from ${oldPriority} to ${priority}`,
        timestamp: 'Just now'
    });

    renderAll();
    showToast(`Priority changed to ${priority}`, 'success');
}

// ------------------------------------------
// DUE DATE EDITING
// ------------------------------------------

function toggleDueDatePicker(event) {
    event.stopPropagation();
    const picker = document.getElementById('due-date-picker');
    const input = document.getElementById('due-date-input');

    // Set current date value in the input
    if (state.caseInfo.dueDateISO) {
        input.value = state.caseInfo.dueDateISO;
    }

    picker.classList.toggle('show');

    // Close on outside click
    const closePicker = (e) => {
        if (!e.target.closest('.due-date-editable')) {
            picker.classList.remove('show');
            document.removeEventListener('click', closePicker);
        }
    };
    document.addEventListener('click', closePicker);
}

function changeDueDate(dateValue) {
    if (!dateValue) return;

    const oldDate = state.caseInfo.dueDate;

    // Parse the date and format it for display
    const date = new Date(dateValue);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const shortOptions = { month: 'short', day: 'numeric', year: 'numeric' };

    state.caseInfo.dueDateISO = dateValue;
    state.caseInfo.dueDateDisplay = date.toLocaleDateString('en-US', options);
    state.caseInfo.dueDate = date.toLocaleDateString('en-US', shortOptions);

    // Create event for activity log
    state.events.unshift({
        id: Date.now(),
        type: 'due_date_changed',
        actor: state.currentRole,
        note: `Changed due date from ${oldDate} to ${state.caseInfo.dueDate}`,
        timestamp: 'Just now'
    });

    // Close the picker
    const picker = document.getElementById('due-date-picker');
    if (picker) picker.classList.remove('show');

    renderAll();
    showToast(`Due date changed to ${state.caseInfo.dueDate}`, 'success');
}

// ------------------------------------------
// DEMO RESET
// ------------------------------------------

function resetDemo() {
    state = getInitialState();
    window.state = state;
    renderAll();
    renderAskAITab();
    showToast('Demo reset successfully!', 'success');
}

// ------------------------------------------
// DOCUMENT HELPERS
// ------------------------------------------

// Find a document from any source
function findDocument(docId) {
    let doc = state.documents.find(d => d.id === docId);
    if (doc) return doc;

    doc = state.drafts.find(d => d.id === docId);
    if (doc) return doc;

    for (const sub of state.submissions) {
        doc = sub.documents.find(d => d.id === docId);
        if (doc) return doc;
    }

    return null;
}

// Get all documents visible to current role
function getVisibleDocuments() {
    const role = state.currentRole;
    let docs = [];

    // Original document is always visible
    const originals = state.documents.filter(d => d.status === 'original');
    docs.push(...originals);

    // Add drafts (only visible to owner)
    const myDrafts = state.drafts.filter(d => d.uploadedBy === role);
    docs.push(...myDrafts);

    // Add submitted documents based on role visibility
    state.submissions.forEach(sub => {
        const canSee = sub.submittedBy === role ||
                       sub.submittedTo === role ||
                       role === 'ea';
        if (canSee) {
            sub.documents.forEach(doc => {
                if (!docs.find(d => d.id === doc.id)) {
                    docs.push({ ...doc, submissionId: sub.id, submissionStatus: sub.status });
                }
            });
        }
    });

    return docs;
}

// Get current role's draft documents
function getMyDraftDocuments() {
    return state.drafts.filter(d => d.uploadedBy === state.currentRole);
}

// Get documents selectable in send modal
function getSelectableDocuments() {
    const role = state.currentRole;

    if (role === 'ao') {
        return state.drafts.filter(d => d.uploadedBy === 'ao');
    } else if (role === 'dto' || role === 'ea') {
        return state.documents.filter(d => d.status === 'original');
    }

    return [];
}

// ------------------------------------------
// COMMENTS / LIVE CHAT
// ------------------------------------------

// Get all roles except current user (for recipient selection)
function getAvailableRecipients() {
    return Object.keys(ROLES).filter(id => id !== state.currentRole);
}

// Check if comment can be sent (has recipient and text)
function canSendComment() {
    return state.commentInput.recipient && state.commentInput.text.trim().length > 0;
}

// Toggle the recipient dropdown
function toggleRecipientDropdown() {
    state.commentInput.dropdownOpen = !state.commentInput.dropdownOpen;
    state.commentInput.highlightedIndex = 0;
    renderDetailsTab();

    if (state.commentInput.dropdownOpen) {
        // Add outside click listener
        setTimeout(() => {
            document.addEventListener('click', closeMentionDropdownOnOutsideClick);
        }, 0);
    }
}

// Close dropdown on outside click
function closeMentionDropdownOnOutsideClick(e) {
    if (!e.target.closest('.recipient-dropdown-menu') && !e.target.closest('.comment-recipient-btn')) {
        closeMentionDropdown();
    }
}

// Close the mention dropdown
function closeMentionDropdown() {
    state.commentInput.dropdownOpen = false;
    document.removeEventListener('click', closeMentionDropdownOnOutsideClick);
    renderDetailsTab();
}

// Highlight a specific option in dropdown (for keyboard nav)
function highlightMentionOption(index) {
    const recipients = getAvailableRecipients();
    // Clamp index to valid range
    if (index < 0) index = recipients.length - 1;
    if (index >= recipients.length) index = 0;

    state.commentInput.highlightedIndex = index;

    // Update DOM directly for smooth keyboard nav (no full re-render)
    document.querySelectorAll('.mention-option').forEach((el, i) => {
        el.classList.toggle('highlighted', i === index);
    });
}

// Select a recipient from dropdown
function selectCommentRecipient(roleId) {
    state.commentInput.recipient = roleId;
    state.commentInput.dropdownOpen = false;
    document.removeEventListener('click', closeMentionDropdownOnOutsideClick);
    renderDetailsTab();

    // Focus textarea after selection
    setTimeout(() => {
        const textarea = document.getElementById('comment-textarea');
        if (textarea) textarea.focus();
    }, 0);
}

// Clear the selected recipient
function clearCommentRecipient() {
    state.commentInput.recipient = null;
    renderDetailsTab();

    // Focus textarea
    setTimeout(() => {
        const textarea = document.getElementById('comment-textarea');
        if (textarea) textarea.focus();
    }, 0);
}

// Clear linked document
function clearLinkedDoc() {
    state.commentInput.linkedDocId = null;
    renderDetailsTab();
}

// Handle text input in comment textarea
function handleCommentInput(event) {
    state.commentInput.text = event.target.value;

    // Update send button state without full re-render
    const sendBtn = document.querySelector('.comment-send-btn');
    if (sendBtn) {
        const canSend = state.commentInput.recipient && state.commentInput.text.trim().length > 0;
        sendBtn.classList.toggle('enabled', canSend);
    }
}

// Handle keyboard events in comment textarea
function handleCommentKeydown(event) {
    const dropdown = state.commentInput.dropdownOpen;
    const recipients = getAvailableRecipients();

    if (dropdown) {
        // Dropdown is open - handle navigation
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                highlightMentionOption(state.commentInput.highlightedIndex + 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                highlightMentionOption(state.commentInput.highlightedIndex - 1);
                break;
            case 'Enter':
                event.preventDefault();
                const selectedRole = recipients[state.commentInput.highlightedIndex];
                if (selectedRole) selectCommentRecipient(selectedRole);
                break;
            case 'Escape':
                event.preventDefault();
                closeMentionDropdown();
                break;
        }
    } else {
        // Dropdown is closed
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSendComment()) {
                submitComment();
            }
        }
    }
}

// Submit the comment
function submitComment() {
    if (!canSendComment()) return;

    const newComment = {
        id: Date.now(),
        author: state.currentRole,
        recipient: state.commentInput.recipient,
        text: state.commentInput.text.trim(),
        timestamp: 'Just now',
        linkedDocId: state.commentInput.linkedDocId
    };

    // Add to comments array (newest first)
    state.comments.unshift(newComment);

    // Add event to timeline
    const author = ROLES[state.currentRole];
    const recipient = ROLES[state.commentInput.recipient];
    state.events.unshift({
        id: Date.now() + 1,
        type: 'comment',
        actor: state.currentRole,
        note: `Sent message to ${recipient.shortName}`,
        timestamp: 'Just now'
    });

    // Reset input state
    state.commentInput = {
        recipient: null,
        text: '',
        dropdownOpen: false,
        highlightedIndex: 0,
        linkedDocId: null
    };

    // Re-render
    renderDetailsTab();
    renderEventLog();

    showToast(`Message sent to ${recipient.name}`, 'success');
}

// Open comment input with linked document (called from doc card)
function addCommentForDoc(docId) {
    state.commentInput.linkedDocId = docId;
    state.sectionStates.comments = true;
    switchTab('details');
    renderDetailsTab();

    // Scroll to and focus comment input
    setTimeout(() => {
        const commentsSection = document.getElementById('comments-section');
        if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const textarea = document.getElementById('comment-textarea');
        if (textarea) textarea.focus();
    }, 100);
}

// ------------------------------------------
// TOAST NOTIFICATIONS
// ------------------------------------------

function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons-outlined" style="font-size:18px">
            ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
        </span>
        ${message}
    `;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Make functions globally available
window.switchRole = switchRole;
window.selectDoc = selectDoc;
window.viewDocFromEventLog = viewDocFromEventLog;
window.selectSubmissionDoc = selectSubmissionDoc;
window.switchTab = switchTab;
window.toggleSection = toggleSection;
window.toggleAISummary = toggleAISummary;
window.toggleShowAllTasks = toggleShowAllTasks;
window.toggleShowAllComments = toggleShowAllComments;
window.togglePreviousSubmissions = togglePreviousSubmissions;
window.expandEvents = expandEvents;
window.toggleTask = toggleTask;
window.goToEventLog = goToEventLog;
window.goToComments = goToComments;
window.togglePriorityDropdown = togglePriorityDropdown;
window.changePriority = changePriority;
window.resetDemo = resetDemo;
window.findDocument = findDocument;
window.getVisibleDocuments = getVisibleDocuments;
window.getMyDraftDocuments = getMyDraftDocuments;
window.getSelectableDocuments = getSelectableDocuments;
window.addCommentForDoc = addCommentForDoc;
window.showToast = showToast;
window.getAvailableRecipients = getAvailableRecipients;
window.canSendComment = canSendComment;
window.toggleRecipientDropdown = toggleRecipientDropdown;
window.closeMentionDropdown = closeMentionDropdown;
window.highlightMentionOption = highlightMentionOption;
window.selectCommentRecipient = selectCommentRecipient;
window.clearCommentRecipient = clearCommentRecipient;
window.clearLinkedDoc = clearLinkedDoc;
window.handleCommentInput = handleCommentInput;
window.handleCommentKeydown = handleCommentKeydown;
window.submitComment = submitComment;
