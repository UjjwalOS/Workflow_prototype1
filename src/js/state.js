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
        caseInfo: {
            id: 'CASE-2025-0847',
            title: 'Budget Proposal 2025',
            status: 'active',  // 'active', 'closed', or 'rejected'
            priority: 'high',  // 'high', 'medium', or 'low'
            dueDate: 'Dec 1, 2025',
            dueDateDisplay: 'Monday, December 1, 2025',
            dueDateISO: '2025-12-01',  // ISO format for date picker
            createdAt: 'Nov 22, 2025',
            currentHolder: 'dto',    // Who currently has the case
            previousHolder: null,    // Who had it before
            pendingAction: 'triage', // What action is expected
            pendingFrom: 'dto'       // Who requested the action
        },

        // Which document tab is selected
        selectedDocId: 'doc1',

        // Current tab in the details panel
        activeTab: 'details',

        // Whether each section is expanded or collapsed
        sectionStates: {
            aiSummary: false,    // AI Summary starts collapsed
            actionItems: true,   // Tasks start expanded
            documents: true,     // Documents start expanded
            comments: true       // Comments start expanded
        },

        // UI toggles
        showAllTasks: false,     // Show all tasks or just first 3
        showAllComments: false,  // Show all comments or just first 2
        eventsExpanded: false,   // Show full event history
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

        // Task assignment tracking
        taskAssignment: {
            assignedBy: null,
            assignedAt: null
        },

        // ------------------------------------------
        // DOCUMENTS
        // ------------------------------------------
        // The main/original documents in the case
        documents: [
            {
                id: 'doc1',
                name: 'Budget Proposal 2025.pdf',
                type: 'pdf',
                size: '2.4 MB',
                uploadedBy: 'dto',
                uploadedAt: 'Nov 22, 2025',
                status: 'original',
                // This is the content shown in the document viewer
                content: `
                    <h1>Budget Proposal 2025</h1>
                    <p class="subtitle">Office of the Chief Secretary<br>Government of Papua New Guinea</p>

                    <h2>Executive Summary</h2>
                    <p>This document presents the proposed budget allocation for fiscal year 2025, totaling <strong>K1.2 billion</strong>. This represents a <strong>12% increase</strong> from the previous fiscal year, reflecting our commitment to national development priorities.</p>

                    <h2>Budget Allocation</h2>
                    <table>
                        <thead>
                            <tr><th>Sector</th><th>Amount (Kina)</th><th>% of Total</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Infrastructure Development</td><td>450,000,000</td><td>37.5%</td></tr>
                            <tr><td>Healthcare Services</td><td>320,000,000</td><td>26.7%</td></tr>
                            <tr><td>Education Programs</td><td>280,000,000</td><td>23.3%</td></tr>
                            <tr><td>Administrative Operations</td><td>150,000,000</td><td>12.5%</td></tr>
                            <tr><td><strong>Total</strong></td><td><strong>1,200,000,000</strong></td><td><strong>100%</strong></td></tr>
                        </tbody>
                    </table>

                    <h2>Key Priorities</h2>
                    <ul>
                        <li><strong>Infrastructure:</strong> Road networks connecting rural communities to urban centers</li>
                        <li><strong>Healthcare:</strong> Construction of 3 new regional hospitals</li>
                        <li><strong>Education:</strong> Teacher training programs and school facility upgrades</li>
                        <li><strong>Digital Government:</strong> E-services platform development</li>
                    </ul>

                    <h2>Risk Assessment</h2>
                    <p>Key risks identified include currency fluctuation impact on imported materials, potential delays in contractor mobilization for remote areas, and capacity constraints in some implementing agencies.</p>

                    <h2>Recommendation</h2>
                    <p>Based on comprehensive analysis and stakeholder consultations, this budget proposal is recommended for approval by the Chief Secretary and subsequent submission to Cabinet for final endorsement.</p>

                    <div style="margin-top:40px;padding:20px;background:#f8fafc;border-radius:8px">
                        <p><strong>Prepared by:</strong> Department of Finance<br>
                        <strong>Date:</strong> November 20, 2025<br>
                        <strong>Classification:</strong> Official - Sensitive</p>
                    </div>
                `,
                viewedBy: ['dto']  // Track who has viewed this doc
            }
        ],

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
        events: [
            {
                id: 1,
                type: 'created',
                actor: 'dto',
                note: 'Urgent submission from PM\'s office regarding FY2025 budget allocation.',
                timestamp: 'Nov 22, 2025'
            }
        ]
    };
}

// The actual state object - starts as initial state
let state = getInitialState();

// Helper to calculate days until deadline
function getDaysRemaining(dueDateStr) {
    // For prototype, just return a fixed number based on the date string
    if (dueDateStr.includes('Dec 1')) return 3;
    if (dueDateStr.includes('Dec 5')) return 7;
    return 14;
}

// Make these available globally
window.state = state;
window.getInitialState = getInitialState;
window.getDaysRemaining = getDaysRemaining;
