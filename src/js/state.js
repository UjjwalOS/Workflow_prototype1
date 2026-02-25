/*
 * =============================================
 * STATE MANAGEMENT
 * =============================================
 *
 * The "state" is all the data that drives the app.
 * Think of it like the app's memory - it remembers:
 * - Which user is logged in
 * - What documents exist
 * - What tasks need to be done
 * - Everything else that can change
 *
 * IMPORTANT RULE: To change anything in the app,
 * update the state, then call renderAll().
 * Never change the HTML directly!
 */

// ------------------------------------------
// GET INITIAL STATE
// ------------------------------------------
// This function creates a fresh starting state.
// Called when the app first loads, or when resetting the demo.

function getInitialState() {
    return {
        // Which role is currently viewing (for demo role-switching)
        currentRole: 'dto',

        // Information about the current case/document being viewed
        // When id is null, no case is loaded (empty state)
        caseInfo: {
            id: null,               // Set when a case is created or loaded
            title: '',
            status: 'active',       // 'active', 'closed', or 'rejected'
            priority: 'medium',     // 'high', 'medium', or 'low'
            dueDate: '',
            dueDateDisplay: '',
            dueDateISO: '',         // ISO format for date picker
            createdAt: '',
            currentHolder: 'dto',   // Who currently has the case
            previousHolder: null,   // Who had it before
            pendingAction: 'triage',// What action is expected
            pendingFrom: 'dto'      // Who requested the action
        },

        // Which document tab is selected
        selectedDocId: null,

        // Current tab in the details panel
        activeTab: 'overview',

        // Whether each section is expanded or collapsed
        sectionStates: {
            aiSummary: false,    // AI Summary starts collapsed
            actionItems: false,  // Tasks start collapsed
            documents: false,    // Documents start collapsed
            comments: false      // Comments start collapsed
        },

        // UI toggles
        showAllTasks: false,     // Show all tasks or just first 3
        showAllComments: false,  // Show all comments or just first 2
        eventsExpanded: false,   // Show full event history
        eventsFilterMode: 'decisions', // 'decisions' = hide system events, 'all' = show everything
        highlightLatestEvent: false,

        // Modal state
        currentTransition: null,      // Which send flow is active
        modalTasks: [''],             // Task inputs in delegate modal
        modalSelectedDocs: [],        // Selected docs in send modal
        modalSelectedAction: null,    // Selected action option

        // Comment input state (for live chat)
        commentInput: {
            recipient: null,          // Role ID of selected recipient
            text: '',                 // Current textarea text
            dropdownOpen: false,      // Dropdown visibility
            highlightedIndex: 0,      // Keyboard navigation index
            linkedDocId: null         // Optional linked document
        },

        // Task assignment tracking (legacy — kept for backward compatibility)
        taskAssignment: {
            assignedBy: null,
            assignedAt: null
        },

        // ------------------------------------------
        // NEW TASK SYSTEM
        // ------------------------------------------
        // Each task is a "card" like in Jira/Linear.
        // Tasks have their own status, assignee, priority, deadline,
        // and a history of submissions (back-and-forth between AO and CS).
        //
        // Task structure:
        // {
        //   id: 'task-1',
        //   title: 'Prepare budget analysis...',
        //   description: '',         // Optional longer description
        //   status: 'in_progress',    // in_progress | submitted | completed | sent_back | cancelled
        //   assignee: 'ao',          // Which AO is assigned (matches ROLES id or ACTION_OFFICERS id)
        //   priority: 'high',        // high | medium | low
        //   deadline: 'Dec 15, 2025',
        //   createdAt: 'Just now',
        //   createdBy: 'cs',
        //   submissions: [           // History of AO submissions for THIS task
        //     {
        //       id: 'sub-1',
        //       submittedAt: '2 days ago',
        //       comment: 'Here is my analysis...',
        //       documents: ['draft_123'],  // Doc IDs attached
        //       feedback: null,            // CS feedback (if sent back)
        //       feedbackAt: null,
        //       status: 'approved'         // approved | sent_back
        //     }
        //   ]
        // }
        tasks: [],

        // Which task is currently being viewed in the Task Detail panel
        // null = no task selected (show task list)
        selectedTaskId: null,

        // Filter: which AO's tasks to show in the Task Tab
        // null = show all (no filter), or an AO id like 'ao', 'ao2', 'ao3'
        taskFilterAO: null,

        // Which task's three-dot menu is open (null = none)
        openTaskMenuId: null,
        openTaskDetailMenuId: null,

        // Delegate modal state (new card-based design)
        delegateModal: {
            tasks: [],              // Array of task drafts being created
            // Each task draft: { title: '', assignee: 'ao', priority: 'medium', deadline: '' }
        },

        // ------------------------------------------
        // DOCUMENTS
        // ------------------------------------------
        // The main/original documents in the case
        // (starts empty — documents are added when a case is registered)
        documents: [],

        // ------------------------------------------
        // SUBMISSIONS
        // ------------------------------------------
        // When AO submits work to CS, it creates a submission record
        // This tracks the back-and-forth between CS and AO
        submissions: [],

        // ------------------------------------------
        // DRAFTS
        // ------------------------------------------
        // Work-in-progress documents (only visible to owner)
        drafts: [],

        // ------------------------------------------
        // COMMENTS
        // ------------------------------------------
        // Notes attached to the case
        comments: [],

        // ------------------------------------------
        // ACTION ITEMS (Tasks)
        // ------------------------------------------
        // Tasks assigned by CS to AO
        // Each has: id, title, completed (boolean)
        actionItems: [],

        // ------------------------------------------
        // EVENTS (Activity Log)
        // ------------------------------------------
        // History of everything that happened
        // (starts empty — first event added on case creation)
        events: [],

        // ------------------------------------------
        // NOTIFICATIONS
        // ------------------------------------------
        // In-app notifications shown in the bell dropdown.
        // Each notification targets a specific role (targetRole).
        // Only visible when viewing as that role.
        // Structure:
        // {
        //   id: 'notif-123',
        //   type: 'task_cancelled',   // task_cancelled | task_assigned | etc.
        //   icon: 'cancel',           // Material icon name
        //   iconColor: '#ef4444',     // Icon color
        //   title: 'Task cancelled: ...',
        //   subtitle: 'Workflow: Budget 2025 · by Chief Secretary',
        //   targetRole: 'ao',         // Who should see this
        //   taskId: 'task_123',       // Optional: link to task
        //   timestamp: ISO string,
        //   read: false
        // }
        notifications: []
    };
}

// The actual state object - starts as initial state
let state = getInitialState();

// Helper to calculate days until deadline
function getDaysRemaining(dueDateStr) {
    if (!dueDateStr || dueDateStr === 'Not set') return 14;

    // Try to parse the ISO date first (stored in dueDateISO)
    const iso = state.caseInfo.dueDateISO;
    if (iso) {
        const due = new Date(iso + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    }

    // Fallback: try parsing the display string
    const parsed = new Date(dueDateStr);
    if (!isNaN(parsed)) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.ceil((parsed - now) / (1000 * 60 * 60 * 24));
    }

    return 14; // Default fallback
}

// ------------------------------------------
// DEADLINE INDICATOR — Linear-style 3-state system
// Returns info about how to display a deadline:
//   Overdue  → red event_busy icon
//   Due soon → orange calendar_today icon (0-7 days)
//   Normal   → grey calendar_today icon (>7 days)
//   No deadline → { show: false }
// ------------------------------------------
function getDeadlineIndicator(deadlineStr, deadlineISO) {
    if (!deadlineStr || deadlineStr === 'Not set') {
        return { show: false };
    }

    // Parse date — prefer ISO (reliable), fallback to display string
    let dueDate;
    if (deadlineISO) {
        dueDate = new Date(deadlineISO + 'T00:00:00');
    } else {
        dueDate = new Date(deadlineStr);
    }

    // If parsing failed, show as normal (safe fallback)
    if (isNaN(dueDate.getTime())) {
        return {
            show: true,
            icon: 'calendar_today',
            colorVar: 'var(--gray-500)',
            cssClass: 'deadline-normal',
            tooltip: deadlineStr,
            daysLeft: 99
        };
    }

    // Calculate days from today
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    // Format date for tooltip
    const displayDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (daysLeft < 0) {
        // OVERDUE — red, calendar-X icon
        const overdueDays = Math.abs(daysLeft);
        return {
            show: true,
            icon: 'event_busy',
            colorVar: 'var(--danger)',
            cssClass: 'deadline-overdue',
            tooltip: overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`,
            daysLeft
        };
    } else if (daysLeft === 0) {
        // DUE TODAY — orange
        return {
            show: true,
            icon: 'calendar_today',
            colorVar: 'var(--warning)',
            cssClass: 'deadline-soon',
            tooltip: 'Due today',
            daysLeft: 0
        };
    } else if (daysLeft <= 7) {
        // DUE THIS WEEK — orange (1-7 days)
        return {
            show: true,
            icon: 'calendar_today',
            colorVar: 'var(--warning)',
            cssClass: 'deadline-soon',
            tooltip: daysLeft === 1 ? 'Due tomorrow' : `Due in ${daysLeft} days`,
            daysLeft
        };
    } else {
        // NORMAL — grey (more than 7 days away)
        return {
            show: true,
            icon: 'calendar_today',
            colorVar: 'var(--gray-500)',
            cssClass: 'deadline-normal',
            tooltip: `Due ${displayDate}`,
            daysLeft
        };
    }
}

// ------------------------------------------
// TASK HELPER FUNCTIONS
// ------------------------------------------

// Get all tasks assigned to a specific AO
function getTasksForAO(aoId) {
    return state.tasks.filter(t => t.assignee === aoId);
}

// Get all tasks created by CS (all tasks basically)
function getAllDelegatedTasks() {
    return state.tasks;
}

// Get unique AO IDs that have tasks assigned
function getAssignedAOs() {
    const aoIds = [...new Set(state.tasks.map(t => t.assignee))];
    return aoIds;
}

// Check if a role id is any Action Officer (ao, ao2, ao3, etc.)
function isAORole(roleId) {
    return ACTION_OFFICERS.some(ao => ao.id === roleId);
}

// Get AO info (works for both ROLES entries and ACTION_OFFICERS entries)
function getAOInfo(aoId) {
    // First check ROLES
    if (ROLES[aoId]) return ROLES[aoId];
    // Then check ACTION_OFFICERS
    const ao = ACTION_OFFICERS.find(a => a.id === aoId);
    if (ao) return { id: ao.id, initials: ao.initials, name: ao.name, roleTitle: ao.title, fullTitle: ao.title, color: ao.color };
    return null;
}

// Count tasks by status for a specific AO
function getTaskStatusCounts(aoId) {
    const tasks = aoId ? getTasksForAO(aoId) : state.tasks;
    return {
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        submitted: tasks.filter(t => t.status === 'submitted').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        sent_back: tasks.filter(t => t.status === 'sent_back').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        total: tasks.length
    };
}

// Get a single task by ID
function getTaskById(taskId) {
    return state.tasks.find(t => t.id === taskId);
}

// Make these available globally
window.state = state;
window.getInitialState = getInitialState;
window.getDaysRemaining = getDaysRemaining;
window.getDeadlineIndicator = getDeadlineIndicator;
window.getTasksForAO = getTasksForAO;
window.getAllDelegatedTasks = getAllDelegatedTasks;
window.getAssignedAOs = getAssignedAOs;
window.getAOInfo = getAOInfo;
window.isAORole = isAORole;
window.getTaskStatusCounts = getTaskStatusCounts;
window.getTaskById = getTaskById;
