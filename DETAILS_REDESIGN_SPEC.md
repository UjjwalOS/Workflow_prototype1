# Details Tab Redesign - Complete Specification

## Overview
This document specifies the complete redesign of the Details tab based on Figma designs. The redesign affects all 4 roles: DTO, EA, CS, and AO.

---

## 1. Person Names in ROLES Config

Update the ROLES config to include actual person names:

```javascript
const ROLES = {
    dto: {
        id: 'dto',
        initials: 'M',
        name: 'Manav',
        fullTitle: 'Document Transfer Officer',
        title: 'DTO',
        color: '#6366f1'
    },
    ea: {
        id: 'ea',
        initials: 'A',
        name: 'Anika Patel',
        fullTitle: 'Executive Assistant',
        title: 'Executive Assistant',
        color: '#ec4899'
    },
    cs: {
        id: 'cs',
        initials: 'R',
        name: 'Raman Singh',
        fullTitle: 'Chief Secretary Officer',
        title: 'Chief Secretary Officer',
        color: '#f59e0b'
    },
    ao: {
        id: 'ao',
        initials: 'R',
        name: 'Rohit Sharma',
        fullTitle: 'Action Officer',
        title: 'Action Officer',
        color: '#10b981'
    }
};
```

---

## 2. Actions Dropdown Menu

Replace the current bottom action bar with a top-right "Actions" dropdown button.

### Location
- Top-right corner of the page (near header)
- Blue button with dropdown chevron
- Label: "Actions ▼"

### Role-Specific Options

#### DTO Actions:
1. **Forward Case** → Opens Forward Case modal
2. **Revert to Sender** → Opens Revert to Sender modal (if applicable)

#### EA Actions:
1. **Forward Case** → Opens Forward Case modal
2. **Revert to Sender** → Opens Revert to Sender modal

#### CS Actions:
1. **Delegate Case** → Opens Delegate Case modal
2. **Revert to Sender** → Opens Revert to Sender modal
3. **Close Case** → Opens Close Case modal
4. **Reject Case** → Opens Reject Case modal

#### AO Actions:
1. **Forward Case** → Opens Forward Case modal (submit to CS)
2. **Revert to Sender** → Opens Revert to Sender modal (if issue found)

---

## 3. Details Tab Structure

The Overview tab (Details) should have this structure:

### Common Elements (All Roles)
1. **CURRENT HOLDER Card**
   - Avatar circle with initial/color
   - Name with "(You)" indicator if current role
   - Role title below name
   - Chevron (>) on right (navigates to Activity/timeline)

2. **Priority & Due Date Row**
   - Two columns side by side
   - **Priority:** High/Medium/Low badge (red/yellow/blue)
   - **Due Date:** Calendar icon + date
   - CS and EA can edit these inline
   - DTO and AO view-only

3. **Collapsible Sections** (accordion style)
   - Header with title + chevron
   - Click to expand/collapse
   - Default states vary by role

---

### Section Details

#### **AI Summary Section**
- **Default:** Collapsed for all roles
- **When expanded:** Shows AI-generated summary of document
- Can show original document title dropdown
- Document details (budget, allocations, etc.)
- "Have questions? Ask the AI" button

#### **Comments Section**
- **Default:** Collapsed for DTO/EA, Expanded for CS/AO (when active)
- **When collapsed:** Shows count if any comments exist
- **When expanded:**
  - Timeline view with avatars
  - Each comment shows: Avatar, Name, Timestamp, Text
  - Long comments have "Show more" link
  - "Show more" button at bottom to load more
  - "Add a comment" input box at top
  - No recipient selector - comments visible to everyone

#### **Task Assigned / Task Progress Section** (Role-dependent)
- **DTO:** Hidden entirely
- **EA:** Shows summary "Delegated Work" with count (if tasks exist)
- **CS:** Shows "Task Progress" with radio buttons (read-only) + green checkmarks when complete
- **AO:** Shows "Your Task" with interactive checkboxes + "ASSIGNED BY" info

#### **Documents Section**
- **Default:** Collapsed for DTO/EA, Expanded for CS/AO
- **When collapsed:** Shows count badge (e.g., "Documents 1")
- **When expanded:**
  - Shows "CASE DOCUMENT" header
  - List of documents with:
    - File icon + name
    - Metadata: Date, uploader indicator
    - "New" badge if unviewed by current role

---

## 4. Modal Designs

### **Forward Case Modal** (Used by DTO, EA, AO)

#### DTO → EA or CS
```
Title: Forward Case

Forward To: [Text field showing recipient name]

[EA Flow Only]
Action Requested: (radio buttons)
○ For Review - Review and provide direction
○ For Approval - Approval recommended
○ For Signature - Signature required

Priority: [Dropdown: High/Medium/Low]
Due Date: [Date picker: DD/MM/YYYY]

Comments: [Textarea: "Short instructions or context (max 500 words)"]

[Cancel] [Forward]
```

#### EA → CS
Same as above but includes Action Requested section.

#### AO → CS (Submit completed work)
```
Title: Forward Case

Forward To: [Raman Singh]

Select documents to send:
☐ [PDF icon] Budget_Proposal_2025 - 12/02 PM • You
☐ [PDF icon] Budget_2025 - 8 Dec • You
☐ [PDF icon] Final_Budget_Report - 7 Dec • Alice

Comments: [Textarea: "Short instructions or context (max 500 words)"]

[Cancel] [Forward Case]
```
**Selected documents get blue border**
**Button becomes enabled when at least one doc selected**

---

### **Delegate Case Modal** (CS Only)

```
Title: Delegate Case

Delegate To: [Search field: "Search by name or designation..."]
[After selection shows: Rohit Sharma]

Assign Task: [+ Add Task]
☐ [Input: "Describe the task..."] [X remove]
☐ [Input: "Describe the task..."] [X remove]
☐ [Input: "Describe the task..."] [X remove]

Priority: [Dropdown: High]
Due Date: [Date picker: 15/12/2025]

Comments: [Textarea: "Short instructions or context (max 500 words)"]

[Cancel] [Delegate]
```

**Features:**
- Can add multiple tasks with "+ Add Task"
- Each task has remove (X) button
- At least one task required

---

### **Revert to Sender Modal** (All roles)

```
Title: Revert to Sender

Revert To: [Auto-filled with previous person's name]

[CS Only - Optional Task Assignment]
Assign Task: [+ Add Task]
☐ [Input: "Describe the task..."]

Priority: [Dropdown: Low]
Due Date: [Date picker: 15/12/2025]

Comments: [Textarea: "Short instructions or context (max 500 words)"]

[Cancel] [Send]
```

---

### **Close Case Modal** (CS Only)

```
Title: Close Case

Select documents to send:
☐ [PDF icon] Budget_Proposal_2025 - 12/02 PM • Jack
☐ [PDF icon] Budget_2025 - 8 Dec • Jack
☐ [PDF icon] Final_Budget_Report - 7 Dec • Alice

Closing remarks (optional):
[Textarea: "And any final notes for the official record..."]

[Cancel] [Close Case]
```

**Selected documents get blue border**

---

### **Reject Case Modal** (CS Only)

```
Title: Reject Case

This case will be returned to Manav (Document Transfer Officer).
He can correct the submission and resubmit, or close it permanently.

Reason for rejection (optional):
[Dropdown: "Select a reason"]

Additional comments (optional):
[Textarea: "Write a comment..."]

[Cancel] [Reject Case]
```

**Button is red/danger color**

---

## 5. Comments Timeline System

### Comment Structure
```javascript
{
    id: 'comment-1',
    author: 'dto',
    authorName: 'Manav',
    text: 'Meeting held with Treasury officials on Dec 5',
    timestamp: '5 days',
    linkedDoc: null, // optional document ID
    mentions: [] // optional array of role IDs
}
```

### Visual Design
- **Avatar circle** on left (colored with role color, shows initial)
- **Name** in bold
- **Timestamp** in gray ("5 days", "2d ago", "3d ago")
- **Three-dot menu** on right (for edit/delete)
- **Comment text** with "Show more" if long
- **"Show more" button** at bottom to load more comments
- **Add a comment** input at top (when expanded)

---

## 6. Task System

### Data Structure
```javascript
actionItems: [
    {
        id: 'task-1',
        text: 'Prepare comprehensive analysis on proposed procurement reforms...',
        completed: false,
        assignedBy: 'cs',
        assignedAt: '3d ago'
    }
]
```

### CS View (Read-only Radio Buttons)
```html
<div class="task-item">
    <input type="radio" disabled [checked if completed]>
    <span class="task-text">Task description...</span>
    [Green checkmark icon if completed]
</div>

ASSIGNED TO:
[Avatar] Rohit Sharma • 3d ago
         Action Officer
```

### AO View (Interactive Checkboxes)
```html
<div class="task-item">
    <input type="checkbox" [checked] onchange="toggleTask(id)">
    <span class="task-text">Task description...</span>
</div>

ASSIGNED BY:
[Avatar] Raman Singh • 3d ago
         Chief Secretary Officer
```

---

## 7. Success Toast Notifications

After successful actions, show toast:

```
[Dark background with white text]
"Document Forwarded to Raman Singh, Chief Secretary Officer successfully."
[X close]
```

```
"Case rejected successfully."
```

```
"Document sent back to Rohit Sharma, Action Officer successfully."
```

**Position:** Bottom center
**Duration:** 5 seconds or until dismissed
**Style:** Dark gray background (#333), white text, rounded corners

---

## 8. Visual Design Tokens

### Colors
- **Primary Blue:** #2563eb (Actions button, selected states)
- **Success Green:** #10b981 (checkmarks, completed states)
- **Danger Red:** #ef4444 (high priority, reject button)
- **Warning Yellow:** #f59e0b (medium priority)
- **Gray:** #6b7280 (secondary text)

### Spacing
- **Section padding:** 16px
- **Card margin:** 12px bottom
- **Input fields:** 12px padding

### Typography
- **Section headers:** 14px, 600 weight
- **Body text:** 14px, 400 weight
- **Timestamps:** 12px, gray
- **Labels:** 12px, 500 weight

---

## 9. Default Section States

### DTO:
- AI Summary: Collapsed
- Comments: Collapsed
- Documents: Collapsed

### EA:
- AI Summary: Collapsed
- Comments: Collapsed
- Documents: Collapsed

### CS:
- AI Summary: Collapsed
- Comments: Expanded (if has comments)
- Task Progress: Expanded (if has tasks)
- Documents: Expanded

### AO:
- AI Summary: Collapsed
- Comments: Expanded
- Your Task: Expanded
- Documents: Expanded

---

## 10. Priority & Due Date Inline Editing

### Who Can Edit:
- **CS:** Can edit Priority and Due Date anytime (inline in main view)
- **EA:** Can set when forwarding
- **DTO:** Can set when forwarding
- **AO:** Read-only

### Inline Edit UI (CS):
```html
Priority: [Dropdown with High/Medium/Low - directly clickable]
Due Date: [Calendar icon + date - click to open date picker]
```

---

## 11. Implementation Checklist

- [ ] Update ROLES config with person names
- [ ] Move Actions to dropdown menu in header
- [ ] Remove bottom action bar completely
- [ ] Redesign Current Holder card
- [ ] Implement collapsible sections (accordion)
- [ ] Build Comments timeline UI
- [ ] Build Task system (CS radio view, AO checkbox view)
- [ ] Rebuild all 5 modals from scratch
- [ ] Implement document selection UI with checkboxes
- [ ] Add inline Priority/Due Date editing for CS
- [ ] Implement toast notifications
- [ ] Update all CSS to match design
- [ ] Test all role transitions
- [ ] Ensure role-switching still works perfectly

---

## 12. Critical Notes

1. **Maintain role-switching capability** - User must still be able to switch between roles easily
2. **All state management stays the same** - Only UI changes, core logic preserved
3. **Event log integration** - Current Holder card chevron links to Activity tab
4. **Mobile responsive** - Ensure modals and sections work on smaller screens
5. **Accessibility** - Maintain keyboard navigation and screen reader support

---

**End of Specification**
