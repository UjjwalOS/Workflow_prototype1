# Activity System Developer Guide

## Overview
This guide explains how the activity/event system works in IDMS v6. Use this alongside your Figma designs to implement the activity feed, notifications, and audit trail.

---

## What is an Activity?

An **activity** (also called an **event**) is a record of something that happened in the system. Every user action that changes the state of a document, case, or workflow creates an activity.

**Think of it like this:** Activities are the "story" of what happened to a document. They create an audit trail and power the notification system.

---

## Core Activity Properties

Every activity has these properties:

```javascript
{
  id: "unique-id",           // Unique identifier for this activity
  type: "activity_type",      // What kind of action happened (see types below)
  actor: "John Doe",          // Who performed the action
  role: "CS",                 // What role they had when they did it
  target: "Document Title",   // What document/case was affected
  timestamp: Date,            // When it happened
  metadata: {}                // Additional context (varies by type)
}
```

---

## Activity Types & States

### 1. **Document Registration**
**Type:** `document_registered`

**When it happens:** A DTO adds a new document to the system

**Metadata:**
```javascript
{
  documentId: "doc-123",
  documentTitle: "Budget Proposal 2024",
  documentType: "Memo",
  sender: "Ministry of Finance"
}
```

**Example timeline entry:**
> "John Doe (DTO) registered document 'Budget Proposal 2024' from Ministry of Finance"

**UI States:**
- ✅ Completed (registration is instant)

---

### 2. **Document Routing**
**Type:** `document_routed`

**When it happens:** A document is sent from one role to another

**Metadata:**
```javascript
{
  documentId: "doc-123",
  fromRole: "DTO",
  toRole: "EA",
  notes: "Urgent - needs review by Friday"
}
```

**Example timeline entry:**
> "Sarah Smith (DTO) sent document to EA with note: 'Urgent - needs review by Friday'"

**UI States:**
- ⏳ In Transit (document is moving between roles)
- ✅ Received (destination role has acknowledged)

---

### 3. **Document Review**
**Type:** `document_reviewed`

**When it happens:** EA triages a document and forwards to CS

**Metadata:**
```javascript
{
  documentId: "doc-123",
  priority: "High",
  category: "Budget",
  recommendation: "This needs CS approval before Friday"
}
```

**Example timeline entry:**
> "Maria Lopez (EA) reviewed document and set priority to High"

**UI States:**
- ✅ Completed (review is instant)

---

### 4. **Task Delegation**
**Type:** `task_delegated`

**When it happens:** CS assigns work to an Action Officer

**Metadata:**
```javascript
{
  caseId: "case-456",
  documentId: "doc-123",
  assignedTo: "Tom Wilson",
  dueDate: "2024-03-15",
  instructions: "Please draft a response addressing budget concerns"
}
```

**Example timeline entry:**
> "Chief Secretary delegated task to Tom Wilson (AO) - Due: March 15, 2024"

**UI States:**
- 🟡 Pending (assigned but not started)
- 🔵 In Progress (AO is working on it)
- ⏸️ On Hold (paused, waiting for something)
- ✅ Completed (work submitted back to CS)
- ❌ Cancelled (CS cancelled the delegation)

---

### 5. **Submission Created**
**Type:** `submission_created`

**When it happens:** AO submits completed work back to CS

**Metadata:**
```javascript
{
  submissionId: "sub-789",
  caseId: "case-456",
  title: "Budget Response Draft",
  fileCount: 3,
  message: "Draft response completed as requested"
}
```

**Example timeline entry:**
> "Tom Wilson (AO) submitted 'Budget Response Draft' with 3 attachments"

**UI States:**
- 📨 Submitted (waiting for CS review)
- 👀 Under Review (CS is reviewing)
- ✅ Accepted (CS approved the work)
- ↩️ Returned (CS sent it back for revisions)

---

### 6. **Case Closed**
**Type:** `case_closed`

**When it happens:** CS marks a case as complete

**Metadata:**
```javascript
{
  caseId: "case-456",
  resolution: "Approved",
  closureNotes: "Budget approved with minor amendments"
}
```

**Example timeline entry:**
> "Chief Secretary closed case with resolution: Approved"

**UI States:**
- ✅ Closed (case is done)
- 🔓 Reopened (if CS needs to reopen it)

---

### 7. **Comment Added**
**Type:** `comment_added`

**When it happens:** Someone adds a note or comment

**Metadata:**
```javascript
{
  targetType: "document",  // or "case" or "submission"
  targetId: "doc-123",
  commentText: "This needs legal review",
  isPrivate: false,
  mentions: ["legal-team"]  // If mentioning others
}
```

**Example timeline entry:**
> "Sarah Smith (EA) commented: 'This needs legal review'"

**UI States:**
- ✅ Posted (comment is visible)
- ✏️ Edited (if edited within 5 minutes)
- 🗑️ Deleted (if user removes it)

---

### 8. **Document Returned**
**Type:** `document_returned`

**When it happens:** CS sends a document back to EA or DTO for corrections

**Metadata:**
```javascript
{
  documentId: "doc-123",
  returnedTo: "EA",
  reason: "Missing signature page"
}
```

**Example timeline entry:**
> "Chief Secretary returned document to EA: 'Missing signature page'"

**UI States:**
- ↩️ Returned (sent back)
- ✅ Resubmitted (once fixed and sent again)

---

## Activity States Summary Table

| Activity Type | Possible States | Primary State Color |
|--------------|----------------|---------------------|
| `document_registered` | completed | green |
| `document_routed` | in_transit, received | blue |
| `document_reviewed` | completed | green |
| `task_delegated` | pending, in_progress, on_hold, completed, cancelled | yellow → blue → gray |
| `submission_created` | submitted, under_review, accepted, returned | blue → green/orange |
| `case_closed` | closed, reopened | gray |
| `comment_added` | posted, edited, deleted | neutral |
| `document_returned` | returned, resubmitted | orange |

---

## Where Activities Appear in the UI

### 1. **Case Timeline** (Detail Page)
Shows all activities related to a specific case, in chronological order.

**Design considerations:**
- Use vertical timeline with connecting lines
- Show actor avatar on left
- Activity description on right
- Timestamp below description
- Group activities by date

### 2. **Activity Feed** (Dashboard)
Shows recent activities across all cases the user has access to.

**Design considerations:**
- Show most recent first
- Include "time ago" format (e.g., "2 hours ago")
- Make document titles clickable
- Add filter by activity type
- Add "Mark all as read" function

### 3. **Notifications Badge**
Count of unread activities that mention the user or affect their work.

**Design considerations:**
- Red badge with number
- Clear on visit or manual dismiss
- Only count activities where user is involved

### 4. **Audit Log** (Admin View)
Comprehensive, filterable list of all system activities.

**Design considerations:**
- Searchable by actor, type, date range
- Exportable to CSV
- Include all metadata for transparency

---

## Activity State Lifecycle Examples

### Example 1: Task Delegation Flow

```
1. CS delegates task
   State: pending
   Activity: task_delegated

2. AO starts working
   State: in_progress
   Activity: task_status_changed (optional)

3. AO submits work
   State: completed
   Activity: submission_created

4. CS reviews submission
   Submission state: under_review
   Activity: submission_status_changed (optional)

5. CS accepts work
   Submission state: accepted
   Case state: might move to closed
   Activity: submission_accepted, case_closed
```

### Example 2: Document Return Flow

```
1. EA forwards document to CS
   Activity: document_routed

2. CS finds issue and returns it
   State: returned
   Activity: document_returned

3. EA fixes issue and resubmits
   State: resubmitted
   Activity: document_routed (again)

4. CS approves
   Activity: document_reviewed
```

---

## Implementation Checklist for Developers

When implementing activities, ensure you:

- [ ] Create activity record in database for EVERY state change
- [ ] Store all required properties (actor, role, timestamp, etc.)
- [ ] Include relevant metadata for the activity type
- [ ] Update activity state when applicable (e.g., task goes from pending → in_progress)
- [ ] Trigger notifications for users who need to know
- [ ] Render activities in timeline with correct icon and color
- [ ] Make activities filterable and searchable
- [ ] Include "time ago" formatting (e.g., "2 hours ago")
- [ ] Show full timestamp on hover
- [ ] Link to related documents/cases
- [ ] Respect permissions (don't show private activities to wrong users)

---

## Design Tokens for Activity States

Use these in your Figma designs for consistency:

```css
/* Activity State Colors */
--state-pending: #F59E0B;      /* Yellow - waiting */
--state-in-progress: #3B82F6;  /* Blue - active work */
--state-completed: #10B981;    /* Green - done */
--state-cancelled: #6B7280;    /* Gray - stopped */
--state-returned: #F97316;     /* Orange - needs fixing */
--state-on-hold: #8B5CF6;      /* Purple - paused */

/* Activity Icons */
Use Font Awesome or similar:
- document_registered: 📄 fa-file-plus
- document_routed: 📤 fa-paper-plane
- task_delegated: 👤 fa-user-check
- submission_created: 📨 fa-inbox-in
- case_closed: ✅ fa-check-circle
- comment_added: 💬 fa-comment
- document_returned: ↩️ fa-undo
```

---

## Questions for Developers to Ask When Reviewing Designs

1. **What triggers this activity?** (user action, system event, time-based?)
2. **Who can see this activity?** (public, role-specific, private?)
3. **Does this activity require a notification?** (email, in-app, both?)
4. **What happens when the user clicks this activity?** (navigate to case, open modal?)
5. **Can this activity be undone?** (if so, what activity does that create?)
6. **What metadata needs to be captured?** (refer to the tables above)

---

## Final Notes

**For the Designer (You):**
When sharing Figma files with developers:
1. Include this guide as a link or attachment
2. Label your frames with the activity type (e.g., "task_delegated - pending state")
3. Show all state variations for each activity type
4. Include the timeline view AND the feed view
5. Annotate any interactive elements (hover states, click actions)

**For Developers:**
- This guide defines the **data model**
- The Figma designs show the **visual presentation**
- Together, they give you everything needed to implement the activity system
- If something is unclear, ask! The designer is learning, so collaboration helps everyone.

---

**Version:** 1.0
**Last Updated:** December 2024
**Maintained By:** Project Owner
