/*
 * =============================================
 * CONFIGURATION
 * =============================================
 *
 * All the settings and data that define how the app works:
 * - ROLES: Who can use the system and their info
 * - ROLE_CONFIG: What each role can see and do
 * - TRANSITIONS: How documents move between people
 */

// ------------------------------------------
// UI CONFIGURATION
// ------------------------------------------
// Toggle features to test different UI approaches

const UI_CONFIG = {
    approvalButtons: {
        showInBanner: true,      // Show Approve/Reject buttons in the banner (Option A)
        showInDropdown: true     // Show Approve/Reject in action dropdown (Option B)
    }
};

// ------------------------------------------
// TASK STATUS DEFINITIONS
// ------------------------------------------
// The 5 possible states a task can be in.
// Tasks flow: in_progress → submitted → completed
//                                     ↘ sent_back → in_progress (loop)
//                          → cancelled (from any state)

const TASK_STATUS = {
    IN_PROGRESS: 'in_progress', // AO has this task (new or actively working)
    SUBMITTED: 'submitted',     // AO submitted for CS review
    COMPLETED: 'completed',     // CS approved the work
    SENT_BACK: 'sent_back',     // CS sent it back for revision
    CANCELLED: 'cancelled'      // CS cancelled the task
};

// How each status looks in the UI
const TASK_STATUS_CONFIG = {
    in_progress: {
        label: 'In Progress',
        icon: 'play_circle',
        color: '#2563eb',       // Blue
        bgColor: '#eff6ff',
        dotColor: '#2563eb'
    },
    submitted: {
        label: 'Pending Review',
        icon: 'schedule',
        color: '#f59e0b',       // Orange/Yellow
        bgColor: '#fffbeb',
        dotColor: '#f59e0b'
    },
    completed: {
        label: 'Approved',
        icon: 'check_circle',
        color: '#16a34a',       // Green
        bgColor: '#f0fdf4',
        dotColor: '#16a34a'
    },
    sent_back: {
        label: 'Needs Revision',       // AO-facing label
        labelCS: 'Revision Requested',  // CS-facing label
        icon: 'rotate_left',
        color: '#d97706',       // Amber (distinct from orange Pending Review)
        bgColor: '#fffbeb',
        dotColor: '#d97706'
    },
    cancelled: {
        label: 'Cancelled',
        icon: 'cancel',
        color: '#ef4444',       // Red
        bgColor: '#fef2f2',
        dotColor: '#ef4444'
    }
};

// ------------------------------------------
// ACTION OFFICERS LIST
// ------------------------------------------
// Multiple AOs that CS can assign tasks to.
// These map to the ROLES config but let us have
// multiple AO identities for the demo.

const ACTION_OFFICERS = [
    {
        id: 'ao',
        name: 'AO 1',
        initials: 'A1',
        title: 'Action Officer',
        color: '#10b981'
    },
    {
        id: 'ao2',
        name: 'AO 2',
        initials: 'A2',
        title: 'Action Officer',
        color: '#8b5cf6'
    },
    {
        id: 'ao3',
        name: 'AO 3',
        initials: 'A3',
        title: 'Action Officer',
        color: '#06b6d4'
    }
];

// ------------------------------------------
// ROLES
// ------------------------------------------
// These are all the different people who use the system.
// Each role has:
// - id: Short code used in the code
// - initials: Letters shown in their avatar circle
// - name: Full name
// - shortName: Shorter version of name
// - title: Their job title
// - color: Background color of their avatar

const ROLES = {
    dto: {
        id: 'dto',
        initials: 'DTO',
        name: 'DTO',
        roleTitle: 'DTO',
        fullTitle: 'Document Transfer Officer',
        color: '#6366f1'  // Purple
    },
    ea: {
        id: 'ea',
        initials: 'EA',
        name: 'EA',
        roleTitle: 'Executive Assistant',
        fullTitle: 'Executive Assistant',
        color: '#ec4899'  // Pink
    },
    cs: {
        id: 'cs',
        initials: 'CS',
        name: 'CS',
        roleTitle: 'Chief Secretary',
        fullTitle: 'Chief Secretary',
        color: '#f59e0b'  // Orange/Yellow
    },
    ao: {
        id: 'ao',
        initials: 'AO',
        name: 'AO 1',
        roleTitle: 'Action Officer',
        fullTitle: 'Action Officer',
        color: '#10b981'  // Green
    }
};

// ------------------------------------------
// ROLE CONFIGURATION
// ------------------------------------------
// What each role can see and do in the interface.
//
// taskView options:
// - 'readonly': Can see all tasks but can't take any actions (DTO, EA)
// - 'progress': Full task management — edit, approve, send back (CS)
// - 'interactive': Can submit tasks and attach docs (AO)

const ROLE_CONFIG = {
    dto: {
        canView: ['documents', 'tasks'],
        canAction: ['forward'],
        taskView: 'readonly'  // Can see tasks but no actions
    },
    ea: {
        canView: ['documents', 'tasks', 'comments'],
        canAction: ['forward'],
        taskView: 'readonly'  // Can see tasks but no actions
    },
    cs: {
        canView: ['documents', 'tasks', 'comments', 'analytics'],
        canAction: ['delegate', 'approve', 'reject'],
        taskView: 'progress'  // Track progress, can't edit
    },
    ao: {
        canView: ['documents', 'tasks', 'comments'],
        canAction: ['submit', 'upload'],
        taskView: 'interactive'  // Full control over assigned tasks
    }
};

// ------------------------------------------
// TRANSITIONS
// ------------------------------------------
// Defines all possible ways documents can move from one person to another.
// Each transition has:
// - title: What shows at the top of the send modal
// - recipient: Who receives it (or recipientOptions for multiple choices)
// - actions: What the recipient is being asked to do
// - Various flags for what to show in the modal

const TRANSITIONS = {
    // DTO sends to EA (normal flow)
    'dto-ea': {
        title: 'Send to Executive Assistant',
        recipient: 'ea',
        showComments: true,
        actions: [
            { value: 'triage', label: 'Triage', desc: 'Route to appropriate recipient' }
        ],
        showActionSelect: false,
        implicitAction: 'triage'
    },
    // DTO sends directly to CS (urgent)
    'dto-cs': {
        title: 'Send to Chief Secretary (Urgent)',
        recipient: 'cs',
        showComments: true,
        actions: [
            { value: 'urgent-review', label: 'Urgent Review', desc: 'Requires immediate attention' }
        ],
        showActionSelect: false,
        implicitAction: 'urgent-review'
    },
    // EA forwards to CS
    'ea-cs': {
        title: 'Forward to Chief Secretary',
        recipient: 'cs',
        showActionSelect: true,
        showPriority: true,
        showDueDate: true,
        showComments: true,
        actions: [
            { value: 'review', label: 'For Review', desc: 'Review and provide direction' },
            { value: 'approve', label: 'For Approval', desc: 'Approval recommended' },
            { value: 'sign', label: 'For Signature', desc: 'Signature required' }
        ]
    },
    // CS delegates to Action Officer (assigns work)
    'cs-ao': {
        title: 'Delegate to Action Officer',
        recipient: 'ao',
        showTasks: true,  // Shows task input fields
        showPriority: true,
        showDueDate: true,
        showComments: true,
        actions: [
            { value: 'delegation', label: 'Work Assignment', desc: 'Assign tasks to complete' }
        ],
        showActionSelect: false,
        implicitAction: 'delegation'
    },
    // CS rejects case entirely
    'cs-reject': {
        title: 'Reject Case',
        recipient: 'dto',
        actions: [
            { value: 'rejected', label: 'Rejected', desc: 'Case will be closed as rejected' }
        ],
        showActionSelect: false,
        implicitAction: 'rejected'
    },
    // AO submits completed work to CS
    'ao-cs': {
        title: 'Submit to Chief Secretary',
        recipient: 'cs',
        showDocSelect: true,  // Must select documents to include
        showCompletedTasks: true,  // Shows summary of completed tasks
        showComments: true,
        actions: [
            { value: 'review', label: 'For Review', desc: 'Completed work for review' }
        ],
        showActionSelect: false,
        implicitAction: 'review'
    }
};

// Make these available to other files
// (This is how JavaScript modules share code)
window.UI_CONFIG = UI_CONFIG;
window.ROLES = ROLES;
window.ROLE_CONFIG = ROLE_CONFIG;
window.TRANSITIONS = TRANSITIONS;
window.TASK_STATUS = TASK_STATUS;
window.TASK_STATUS_CONFIG = TASK_STATUS_CONFIG;
window.ACTION_OFFICERS = ACTION_OFFICERS;
