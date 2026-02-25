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
    state.selectedTaskId = null;  // Close any open task detail when switching roles

    // Remember the role across sessions
    if (typeof caseManager !== 'undefined') {
        caseManager.persistRole(roleId);
    }

    // Add "viewed" event when switching to holder role
    if (state.caseInfo.id && state.caseInfo.currentHolder === roleId && state.caseInfo.status === 'active') {
        const lastEvent = state.events[0];
        if (!(lastEvent && lastEvent.type === 'viewed' && lastEvent.actor === roleId)) {
            state.events.unshift({
                id: Date.now(),
                type: 'viewed',
                actor: roleId,
                timestamp: new Date().toISOString()
            });
        }
    }

    renderAll();
    // Update notification badge for the new role
    renderNotificationBadge();
    // Use getAOInfo() so it works for dynamic AO ids (ao2, ao3) too
    const roleInfo = getAOInfo(roleId) || ROLES[roleId];
    showToast(`Viewing as ${roleInfo.name}`, 'success');
}

// ------------------------------------------
// DOCUMENT SELECTION
// ------------------------------------------

function selectDoc(docId) {
    state.selectedDocId = docId;
    renderDocTabs();
    renderDocContent();
    renderOverviewTab();
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
    // Dismiss task detail overlay when navigating away from task tab
    if (tabId !== 'task' && state.selectedTaskId) {
        state.selectedTaskId = null;
        const overlay = document.getElementById('task-detail-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    state.activeTab = tabId;

    // Update tab buttons
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Animate the sliding indicator under the active tab
    updateTabIndicator();

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId + '-tab');
    });

    // Render the appropriate tab content
    if (tabId === 'overview') {
        renderOverviewTab();
    } else if (tabId === 'task') {
        renderTaskTab();
    } else if (tabId === 'activity') {
        renderEventLog();
    } else if (tabId === 'document') {
        renderDocumentsTab();
    } else if (tabId === 'comments') {
        renderCommentsTab();
    } else if (tabId === 'ask-ai') {
        renderAskAITab();
    }
}

/**
 * Moves the sliding indicator bar to sit under the currently active tab.
 * Uses requestAnimationFrame to track the tab's size as the label
 * animates open/closed, so the indicator follows smoothly.
 */
let _indicatorRAF = null;
function updateTabIndicator(animate) {
    // Cancel any running animation loop
    if (_indicatorRAF) cancelAnimationFrame(_indicatorRAF);

    const activeTab = document.querySelector('.panel-tab.active');
    const indicator = document.querySelector('.tab-indicator');
    if (!activeTab || !indicator) return;

    function positionIndicator() {
        const tabsContainer = activeTab.parentElement;
        const containerRect = tabsContainer.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        indicator.style.left = (tabRect.left - containerRect.left) + 'px';
        indicator.style.width = tabRect.width + 'px';
    }

    // Immediately position once
    positionIndicator();

    // If animating, keep tracking for 350ms (matches the CSS transition)
    if (animate !== false) {
        const start = performance.now();
        function track(now) {
            if (now - start < 350) {
                positionIndicator();
                _indicatorRAF = requestAnimationFrame(track);
            } else {
                positionIndicator(); // final snap
                _indicatorRAF = null;
            }
        }
        _indicatorRAF = requestAnimationFrame(track);
    }
}
window.updateTabIndicator = updateTabIndicator;

// ------------------------------------------
// SECTION TOGGLES
// ------------------------------------------

function toggleSection(sectionKey) {
    state.sectionStates[sectionKey] = !state.sectionStates[sectionKey];
    renderOverviewTab();
}

function toggleAISummary(event, el) {
    if (event.target.closest('.ask-ai-btn')) return;
    state.sectionStates.aiSummary = !state.sectionStates.aiSummary;
    el.classList.toggle('expanded');
}

function toggleShowAllTasks() {
    state.showAllTasks = !state.showAllTasks;
    renderOverviewTab();
}

function toggleShowAllComments() {
    state.showAllComments = !state.showAllComments;
    renderOverviewTab();
}

function togglePreviousSubmissions() {
    const el = document.getElementById('prev-submissions');
    if (el) el.classList.toggle('expanded');
}

function expandEvents() {
    state.eventsExpanded = true;
    renderEventLog();
}

function toggleEventFilter() {
    state.eventsFilterMode = state.eventsFilterMode === 'all' ? 'decisions' : 'all';
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
            timestamp: new Date().toISOString()
        });
        showToast('Task completed!', 'success');
    }

    renderOverviewTab();
    renderEventLog();
}

// ------------------------------------------
// NAVIGATION HELPERS
// ------------------------------------------

function goToEventLog() {
    state.highlightLatestEvent = true;
    switchTab('activity');
    setTimeout(() => {
        state.highlightLatestEvent = false;
        renderEventLog();
    }, 2000);
}

function goToComments() {
    switchTab('comments');
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
        timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
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

async function resetDemo() {
    if (typeof caseManager !== 'undefined') {
        // Clear all saved cases, files, and metadata from IndexedDB
        await caseManager.resetAll();
        renderAskAITab();
        showToast('All cases cleared!', 'success');
    } else {
        // Fallback: just reset in-memory state
        state = getInitialState();
        window.state = state;
        renderAll();
        renderAskAITab();
        showToast('Demo reset successfully!', 'success');
    }
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
    renderOverviewTab();

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
    renderOverviewTab();
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
    renderOverviewTab();

    // Focus textarea after selection
    setTimeout(() => {
        const textarea = document.getElementById('comment-textarea');
        if (textarea) textarea.focus();
    }, 0);
}

// Clear the selected recipient
function clearCommentRecipient() {
    state.commentInput.recipient = null;
    renderOverviewTab();

    // Focus textarea
    setTimeout(() => {
        const textarea = document.getElementById('comment-textarea');
        if (textarea) textarea.focus();
    }, 0);
}

// Clear linked document
function clearLinkedDoc() {
    state.commentInput.linkedDocId = null;
    renderOverviewTab();
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
        timestamp: new Date().toISOString(),
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
        note: `Sent message to ${recipient.shortName || recipient.name}`,
        timestamp: new Date().toISOString()
    });

    // Notify the comment recipient
    addNotification({
        id: 'notif-' + Date.now() + '-comment',
        type: 'comment_received',
        icon: 'chat',
        iconColor: '#2563eb',
        title: `New message from ${author.name}`,
        subtitle: `"${newComment.text.length > 50 ? newComment.text.slice(0, 50) + '…' : newComment.text}"`,
        targetRole: state.commentInput.recipient,
        timestamp: new Date().toISOString(),
        read: false
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
    renderOverviewTab();
    renderEventLog();

    showToast(`Message sent to ${recipient.name}`, 'success');
}

// Open comment input with linked document (called from doc card)
function addCommentForDoc(docId) {
    state.commentInput.linkedDocId = docId;
    state.sectionStates.comments = true;
    switchTab('overview');
    renderOverviewTab();

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
// HEADER DROPDOWNS
// ------------------------------------------



function toggleActionsDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('actions-dropdown');
    closeAllDropdowns();
    dropdown.classList.toggle('show');

    // Close on outside click
    if (dropdown.classList.contains('show')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdownsOnOutsideClick);
        }, 0);
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
    // Also close notification dropdown
    const notifDropdown = document.getElementById('notification-dropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
}

function closeDropdownsOnOutsideClick(e) {
    if (!e.target.closest('.header-dropdown') && !e.target.closest('.notif-wrapper')) {
        closeAllDropdowns();
        document.removeEventListener('click', closeDropdownsOnOutsideClick);
    }
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

// ------------------------------------------
// SNACKBAR (dark bottom bar — different from toast)
// ------------------------------------------
// A dark bar that appears at the bottom center, like "Task Cancelled".
// Stays until dismissed or auto-hides after 5 seconds.

function showSnackbar(message) {
    // Remove any existing snackbar
    const existing = document.querySelector('.snackbar');
    if (existing) existing.remove();

    const snackbar = document.createElement('div');
    snackbar.className = 'snackbar';
    snackbar.innerHTML = `
        <span class="snackbar-text">${message}</span>
        <button class="snackbar-close" onclick="this.parentElement.remove()">
            <span class="material-icons-outlined" style="font-size:18px">close</span>
        </button>
    `;
    document.body.appendChild(snackbar);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (snackbar.parentElement) {
            snackbar.style.animation = 'snackbarSlideUp 0.3s ease reverse forwards';
            setTimeout(() => snackbar.remove(), 300);
        }
    }, 5000);
}

// ------------------------------------------
// NOTIFICATION SYSTEM
// ------------------------------------------
// In-app notifications shown in the bell icon dropdown.
// Notifications are role-scoped: each notification has a targetRole,
// and only shows when viewing as that role.

function addNotification(notif) {
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift(notif);
    renderNotificationBadge();
}

// Get notifications for the current role
function getNotificationsForRole(role) {
    if (!state.notifications) state.notifications = [];
    return state.notifications.filter(n => n.targetRole === role);
}

function getUnreadCountForRole(role) {
    if (!state.notifications) state.notifications = [];
    return state.notifications.filter(n => n.targetRole === role && !n.read).length;
}

function markNotificationRead(notifId) {
    const notif = state.notifications.find(n => n.id === notifId);
    if (notif) {
        notif.read = true;
        renderNotificationBadge();
        renderNotificationDropdown();
    }
}

function markAllNotificationsRead() {
    const role = state.currentRole;
    state.notifications.forEach(n => {
        if (n.targetRole === role) n.read = true;
    });
    renderNotificationBadge();
    renderNotificationDropdown();
}

// Render the red badge on the bell icon
function renderNotificationBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = getUnreadCountForRole(state.currentRole);
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Toggle the notification dropdown
function toggleNotificationDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;
    const isOpen = dropdown.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
        dropdown.classList.add('show');
        renderNotificationDropdown();
    }
}

// Render the notification dropdown content
function renderNotificationDropdown() {
    const body = document.getElementById('notification-dropdown-body');
    if (!body) return;

    const role = state.currentRole;
    const allNotifs = getNotificationsForRole(role);
    const unreadNotifs = allNotifs.filter(n => !n.read);
    const activeTab = state._notifTab || 'all';
    const displayNotifs = activeTab === 'unread' ? unreadNotifs : allNotifs;

    // Update tab counts
    const unreadTabLabel = document.getElementById('notif-unread-tab');
    if (unreadTabLabel) {
        unreadTabLabel.textContent = `Unread${unreadNotifs.length > 0 ? ' (' + unreadNotifs.length + ')' : ''}`;
    }

    // Update active tab styling
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    const activeTabEl = document.getElementById(activeTab === 'unread' ? 'notif-unread-tab' : 'notif-all-tab');
    if (activeTabEl) activeTabEl.classList.add('active');

    if (displayNotifs.length === 0) {
        body.innerHTML = `
            <div class="notif-empty">
                <span class="material-icons-outlined" style="font-size:32px;color:var(--gray-300)">notifications_none</span>
                <p>No ${activeTab === 'unread' ? 'unread ' : ''}notifications</p>
            </div>
        `;
        return;
    }

    body.innerHTML = displayNotifs.map(notif => {
        const timeStr = formatRelativeTime(notif.timestamp);
        return `
            <div class="notif-item ${notif.read ? '' : 'unread'}" onclick="handleNotificationClick('${notif.id}')">
                <div class="notif-item-icon" style="color:${notif.iconColor || 'var(--gray-500)'}">
                    <span class="material-icons-outlined">${notif.icon || 'info'}</span>
                </div>
                <div class="notif-item-content">
                    <div class="notif-item-title">${notif.title}</div>
                    ${notif.subtitle ? `<div class="notif-item-subtitle">${notif.subtitle}</div>` : ''}
                </div>
                <div class="notif-item-meta">
                    <span class="notif-item-time">${timeStr}</span>
                    ${!notif.read ? '<span class="notif-unread-dot"></span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Switch notification tab (All / Unread)
function switchNotifTab(tab) {
    state._notifTab = tab;
    renderNotificationDropdown();
}

// Handle clicking a notification item
function handleNotificationClick(notifId) {
    const notif = state.notifications.find(n => n.id === notifId);
    if (!notif) return;

    // Mark as read
    notif.read = true;
    renderNotificationBadge();

    // Navigate to the relevant task if applicable
    if (notif.taskId) {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) dropdown.classList.remove('show');
        openTaskDetail(notif.taskId);
    }

    renderNotificationDropdown();
}

// ------------------------------------------
// SIDEBAR TOGGLE
// ------------------------------------------

function toggleCaseSidebar() {
    const sidebar = document.getElementById('case-sidebar');
    if (!sidebar) return;

    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');

    // Remember the state across refreshes
    localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
}

// Make functions globally available
window.toggleCaseSidebar = toggleCaseSidebar;
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
window.toggleEventFilter = toggleEventFilter;
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
window.toggleActionsDropdown = toggleActionsDropdown;
window.closeAllDropdowns = closeAllDropdowns;
window.showSnackbar = showSnackbar;
window.addNotification = addNotification;
window.getNotificationsForRole = getNotificationsForRole;
window.getUnreadCountForRole = getUnreadCountForRole;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.renderNotificationBadge = renderNotificationBadge;
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.renderNotificationDropdown = renderNotificationDropdown;
window.switchNotifTab = switchNotifTab;
window.handleNotificationClick = handleNotificationClick;
