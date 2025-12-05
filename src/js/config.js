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
        name: 'Document Transfer Officer',
        shortName: 'DTO',
        title: 'Registry Unit',
        color: '#6366f1'  // Purple
    },
    ea: {
        id: 'ea',
        initials: 'EA',
        name: 'Executive Assistant',
        shortName: 'EA',
        title: 'Office of the CS',
        color: '#ec4899'  // Pink
    },
    cs: {
        id: 'cs',
        initials: 'CS',
        name: 'Chief Secretary',
        shortName: 'CS',
        title: 'Head of Public Service',
        color: '#f59e0b'  // Orange/Yellow
    },
    ao: {
        id: 'ao',
        initials: 'AO',
        name: 'Action Officer',
        shortName: 'AO',
        title: 'Budget & Planning',
        color: '#10b981'  // Green
    }
};

// ------------------------------------------
// ROLE CONFIGURATION
// ------------------------------------------
// What each role can see and do in the interface.
//
// taskView options:
// - 'hidden': Can't see tasks at all (DTO)
// - 'summary': Just sees "X tasks delegated" (EA)
// - 'progress': Sees progress bar but can't edit (CS)
// - 'interactive': Can check off tasks (AO)

const ROLE_CONFIG = {
    dto: {
        canView: ['documents'],
        canAction: ['forward'],
        taskView: 'hidden'  // DTO doesn't deal with tasks
    },
    ea: {
        canView: ['documents', 'tasks', 'comments'],
        canAction: ['forward', 'sendback'],
        taskView: 'summary'  // Just awareness of delegated work
    },
    cs: {
        canView: ['documents', 'tasks', 'comments', 'analytics'],
        canAction: ['delegate', 'approve', 'reject', 'sendback'],
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
        actions: [
            { value: 'review', label: 'For Review', desc: 'Review and provide direction' },
            { value: 'approve', label: 'For Approval', desc: 'Approval recommended' },
            { value: 'sign', label: 'For Signature', desc: 'Signature required' }
        ]
    },
    // EA sends back to DTO (if something wrong)
    'ea-sendback': {
        title: 'Return to Document Officer',
        recipient: 'dto',
        actions: [
            { value: 'revision', label: 'Needs Revision', desc: 'Document requires changes' }
        ],
        showActionSelect: false,
        implicitAction: 'revision'
    },
    // CS delegates to Action Officer (assigns work)
    'cs-ao': {
        title: 'Delegate to Action Officer',
        recipient: 'ao',
        showTasks: true,  // Shows task input fields
        showPriority: true,
        showDueDate: true,
        actions: [
            { value: 'delegation', label: 'Work Assignment', desc: 'Assign tasks to complete' }
        ],
        showActionSelect: false,
        implicitAction: 'delegation'
    },
    // CS sends back (returns work)
    'cs-sendback': {
        title: 'Return Document',
        showRecipientSelect: true,
        recipientOptions: ['ea', 'ao'],  // Can send back to either
        actions: [
            { value: 'revision', label: 'Needs Revision', desc: 'Additional work required' }
        ],
        showActionSelect: false,
        implicitAction: 'revision'
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
        actions: [
            { value: 'review', label: 'For Review', desc: 'Completed work for review' }
        ],
        showActionSelect: false,
        implicitAction: 'review'
    }
};

// Make these available to other files
// (This is how JavaScript modules share code)
window.ROLES = ROLES;
window.ROLE_CONFIG = ROLE_CONFIG;
window.TRANSITIONS = TRANSITIONS;
