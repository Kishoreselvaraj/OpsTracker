# Aetram OpsTracker — Business Requirements Document
> Development & QA Reference | Version 1.0 | May 2025 | Confidential

---

## Project Metadata

| Field | Value |
|---|---|
| Project | Aetram OpsTracker |
| Document | Business Requirements Document |
| Version | 1.0 |
| Date | May 2025 |
| Audience | Development Team (Dev & QA) |
| Current Users | ~700 |
| Planned Scale | 2,350+ |

---

## 1. Executive Summary

The **EOD (End-of-Day) Tracking & Approval Workflow System** is an internal enterprise platform designed to capture, manage, and validate employee effort on a daily basis.

**Core value propositions:**
- Team members submit structured daily EOD reports (tasks + hours)
- Team Leads review and approve via a governed workflow
- Replaces spreadsheets and informal check-ins with a traceable, role-governed digital system
- Enforces org hierarchy: Departments → Task Groups → Task Sub-Groups
- Maintains an immutable audit trail of all submissions, approvals, and changes
- Department Heads get read-only visibility and analytical reports
- Admins manage the full org structure and user base

---

## 2. System Architecture (Three Layers)

```
┌──────────────────────────────────────────────────┐
│           Authentication Layer                   │
│        JWT · Login · Session Management          │
├──────────────────────────────────────────────────┤
│           Role-Based UI Layer                    │
│  Admin Portal · Dept Head · Team Lead · Member   │
├──────────────────────────────────────────────────┤
│           Core Application Modules               │
│  EOD Entry · Approvals · Org Mgmt · Reports      │
│       Notifications · Audit Trail                │
└──────────────────────────────────────────────────┘
```

- **Auth Layer** — login, JWT token issuance, session validation
- **Role-Based UI Layer** — tailored interface per authenticated role
- **Core Modules** — all business logic: EOD, approvals, org, reporting, audit

---

## 3. Key Concepts

### 3.1 Role-Based Access Control (RBAC)
- Every user is assigned **exactly one role** at login
- System renders only features and data permitted for that role
- Four roles: `Admin`, `Department Head`, `Team Lead`, `Member`
- Role assignment managed by Admin; stored in user profile

### 3.2 EOD (End-of-Day) Submission
- Daily structured entry submitted by a Member
- Contains: tasks completed, time spent per task, notes
- Timestamped and linked to member's Task Sub-Group
- Traceable through the full approval chain

### 3.3 Multi-Level Approval Workflow

```
EOD States:
Submitted (Pending Review) → Approved
                           → Rejected
                           → Need Correction
```

- Team Lead is the **sole** approval authority
- Department Heads have read-only visibility (no approval authority)

### 3.4 Organizational Hierarchy

```
Organization
└── Department (e.g., Development)
    ├── Task Group: India
    │   ├── Task Sub-Group: Dev
    │   │   └── Members
    │   └── Task Sub-Group: QA
    │       └── Members
    └── Task Group: International
        └── (mirrors India structure)
```

- Each Member belongs to **exactly one** Task Sub-Group
- Each Team Lead oversees one or more Sub-Groups within a single Task Group
- Structure drives approval routing and reporting scope

### 3.5 Audit Trail & Compliance
- Every user action is recorded in an **immutable** audit log
- Logged: actor identity, timestamp, action detail
- No role (including Admin) can modify or delete audit records
- Accessible to Admins and Department Heads

---

## 4. User Roles & Permissions

| Role | Responsibilities | Key Features | Approval Authority |
|---|---|---|---|
| **Admin** | System-wide config, user management, org structure | User CRUD, role assignment, dept/task group creation, system settings, full audit log access | N/A — Administrative only |
| **Department Head** | Department oversight, team performance visibility | Read-only EOD view, dept-wide dashboards, analytics & reports, member performance summaries | Reporting visibility only — cannot approve/reject |
| **Team Lead** | Manage task group/sub-group, review and approve EODs | EOD approval queue, approve/reject/request correction, team dashboard, sub-group management | **SOLE AUTHORITY** for EOD approval at team level |
| **Member** | Submit daily EOD reports, track personal task history | EOD submission form, personal history view, status tracking, notifications | None — Submission only |

> **CRITICAL:** Only the Team Lead can approve or reject EOD reports. The Department Head has visibility and reporting access but **no** approval authority.

---

## 5. Core Feature Modules

All modules are secured by JWT authentication and enforce RBAC at API and UI levels.

| # | Feature Module | Description | Primary Roles |
|---|---|---|---|
| 1 | **Login & Authentication** | JWT-based login; role detection on auth; session management and secure token refresh | All Roles |
| 2 | **Role-Based Dashboards** | Personalized dashboards per role: EOD status for Members, approval queue for TLs, analytics for Dept Heads | All Roles |
| 3 | **EOD Entry & Submission** | Daily task log form with task name, description, hours spent, and date; supports draft and submit states | Member |
| 4 | **Work Log** | Structured persistent record of all task entries per member per day — supports analytics, productivity tracking, and future reporting | Member, Team Lead, Admin |
| 5 | **Approval Workflow** | Multi-state workflow: Submitted → Approved / Rejected / Need Correction. TL is sole approval authority | Team Lead |
| 6 | **Organisation Management** | Tree-view editor for Departments, Task Groups, Task Sub-Groups. Drag-and-drop hierarchy management | Admin |
| 7 | **User Management** | CRUD for users, role assignment, department/task group mapping, activation/deactivation | Admin |
| 8 | **Reports & Analytics** | Five structured report types with date-range filters and data export | Dept Head, Admin, Team Lead |
| 9 | **Notifications (Web)** | In-app real-time notification centre via SignalR. No page refresh required | All Roles |
| 10 | **Audit Trail & Logging** | Immutable logs of all user actions with actor identity, timestamp, and action detail | Admin, Dept Head |

---

## 6. Work Log

The Work Log is the **persistent data layer** behind every EOD submission. Each EOD submission creates one or more Work Log entries — one per task — stored independently for granular querying.

> Work Log records are **write-once** on submission. Edits (via 'Need Correction' flow) create a new versioned entry; the original is preserved in the audit trail.

### Work Log Fields

| Field | Description | Analytics Value |
|---|---|---|
| Member ID | Unique identifier linking the log to a specific employee | Per-user productivity aggregation |
| Task Group / Sub-Group | Org hierarchy context of the work entry | Team-level effort breakdowns |
| Task Name | Title of the task worked on | Used in Daily EOD and Productivity reports |
| Task Description | Free-text detail about the work done | Context for TL review and audits |
| Hours Spent | Numeric value of effort in hours (decimal supported) | Core metric for all productivity and summary reports |
| Work Date | Calendar date the work was performed | Enables date-range filtering in all report types |
| Submission Timestamp | System-generated date/time when EOD was submitted | Used in Missing Submission and Approval reports |
| Approval Status | Current state: Pending / Approved / Rejected / Need Correction | Drives Approval Report and compliance dashboards |

> The Work Log is the **single source of truth** for all five report types. Design with analytics in mind from day one.

---

## 7. Audit Trail & Logging

Audit records are **immutable** — no role, including Admin, can modify or delete them. Stored separately from operational data to prevent tampering.

### Audit Event Types

| Event Type | What Gets Logged | Triggered By | Compliance Value |
|---|---|---|---|
| User Login / Logout | User ID, role, IP address, timestamp, session duration | All Roles | Access traceability |
| EOD Submitted | Member ID, date, task list, hours, sub-group, submission timestamp | Member | Effort capture proof |
| EOD Edited / Resubmitted | Before/after task details, editor ID, reason (if correction), timestamp | Member | Change history |
| Approval Action | EOD ID, TL action (Approved/Rejected/Need Correction), TL ID, comment, timestamp | Team Lead | Decision accountability |
| User Created / Modified | Target user ID, changed fields, admin actor ID, timestamp | Admin | User management trail |
| Org Structure Changed | Entity changed (Dept/Group/Sub-Group), old vs new values, admin ID, timestamp | Admin | Configuration history |
| Notification Sent | Notification type, recipient, trigger event, delivery timestamp | System | Communication audit |

### Audit Log Access & Filtering

- **Admin** — Full audit log access; filter by user, date range, event type, department
- **Department Head** — View audit events within their department scope only
- **Team Lead / Member** — No audit log access

Available filters: Date range, Event type, User/Role, Department, Task Group

Export: CSV for external compliance review

---

## 8. Reporting Requirements

All reports support date-range filtering and data export (CSV/PDF). Data is sourced from Work Log entries and Audit Trail records.

### Report Types

| Report Name | Description | Accessible By | Key Use |
|---|---|---|---|
| **Daily EOD Report** | Lists all EOD submissions for a selected date/range. Shows member name, task group, tasks, hours, approval status | Admin, Dept Head, Team Lead | Daily visibility & compliance tracking |
| **User Productivity Report** | Aggregates total hours per employee over a period. Highlights high/low contributors and effort distribution | Admin, Dept Head, Team Lead | Performance monitoring & resource planning |
| **Approval Report** | Tracks EOD approval turnaround times per TL. Shows count of Approved/Rejected/Need Correction and avg review time | Admin, Dept Head | TL accountability & SLA measurement |
| **Department Summary** | Consolidated effort at dept level — total hours, active members, task group breakdown, weekly/monthly trends | Admin, Dept Head | Management-level effort visibility |
| **Missing Submission Report** | Identifies members who did not submit an EOD on any given working day | Admin, Dept Head, Team Lead | Compliance & early intervention |

### Report Access Matrix

| Report | Admin | Dept Head | Team Lead | Member | Scope |
|---|---|---|---|---|---|
| Daily EOD Report | ✓ | ✓ | ✓ (team only) | ✗ | Team / Dept / All |
| User Productivity | ✓ | ✓ | ✓ (team only) | ✗ | Team / Dept / All |
| Approval Report | ✓ | ✓ | ✗ | ✗ | Dept / All |
| Department Summary | ✓ | ✓ | ✗ | ✗ | Dept / All |
| Missing Submission | ✓ | ✓ | ✓ (team only) | ✗ | Team / Dept / All |

> **NOTE:** The Missing Submission Report is critical for future analytics — it forms the baseline dataset for attendance compliance, trend analysis, and predictive workload modelling.

---

## 9. Notification Module (Web)

Real-time, in-browser alerts powered by **SignalR (ASP.NET Core)**. Web-only — no mobile push, no email in v1.

### Notification Triggers

| Trigger Event | Notified Role(s) | Message |
|---|---|---|
| Member submits EOD | Team Lead | `<Member> submitted their EOD for <date>. Pending your review.` |
| TL approves EOD | Member | `Your EOD for <date> has been Approved by <TL>.` |
| TL rejects EOD | Member | `Your EOD for <date> has been Rejected. Please review TL comments.` |
| TL requests correction | Member | `Your EOD for <date> needs correction. See TL comments and resubmit.` |
| EOD not submitted by cutoff | Member, Team Lead | `Reminder: EOD not yet submitted for today. Please submit before cutoff.` |
| TL has pending EODs > 24 hrs | Team Lead | `You have EOD(s) pending review for over 24 hours.` |

### Notification Centre (In-App UI)

A persistent **bell icon** in the navigation bar visible to all logged-in users.

- Real-time delivery via SignalR WebSocket — no page refresh required
- Unread notifications displayed with a badge count on the bell icon
- Panel shows notifications ordered by most recent first, with timestamp and read/unread state
- Clicking a notification navigates directly to the relevant EOD or approval record
- Notifications can be marked as read individually or all at once
- Notification history retained for **30 days**; older entries archived
- No email or SMS delivery in v1 — web-only (email deferred to v2)

> **Infrastructure requirement:** SignalR requires persistent WebSocket connections. WebSocket support must be enabled on the hosting environment **before Phase 4 development begins**.

---

## 10. User Journey Flows

### Primary Flow — EOD Submission & Approval

```
Member
  └─► Fills EOD Form
        └─► Submits
              ├─► Auto-saved
              ├─► Audit Trail Logged (Timestamp)
              └─► Notification → Team Lead

Team Lead
  └─► Reviews EOD
        ├─► APPROVE  → Status: Approved  → Notification → Member
        ├─► REJECT   → Status: Rejected  → Notification → Member
        └─► NEED CORRECTION → Status: Need Correction → Notification → Member
              └─► Member edits & resubmits (audit log captures both versions)

Department Head
  └─► Read-Only Visibility at all stages
        └─► Generates Reports & Analytics
```

### Secondary Flows

**Admin — Org Setup:**
Login → Org Management → Create Department → Add Task Group → Create Task Sub-Group → Assign Team Lead → Add Members → (all changes audit-logged)

**Department Head — Reporting:**
Login → Department Dashboard → Select date range → Choose report type → Review results → Export
*(Read-only; no modifications possible)*

**Member — Correction Flow:**
Receives 'Need Correction' notification → Opens flagged EOD → Edits as requested → Resubmits
*(Audit log captures both the original and corrected submission with version history)*

---

## 11. Development Phases

Phases are sequential; durations to be defined in the project plan.

| Phase | Key Deliverables | Dependencies |
|---|---|---|
| **Phase 1 — Foundation** | JWT authentication, role-based access, DB schema, org hierarchy CRUD, basic user management | Requirements sign-off, DB provisioning |
| **Phase 2 — Core Modules** | EOD submission form, approval workflow engine, TL approval queue, status transitions, audit logging, work log capture | Phase 1 complete |
| **Phase 3 — Dashboards & Reporting** | Role-specific dashboards, all 5 report types, export features | Phase 2 complete, sample data |
| **Phase 4 — Notifications & Audit** | Web-based real-time notifications (SignalR), in-app notification centre, audit trail UI, compliance logs | Phase 2 complete, SignalR setup |
| **Phase 5 — QA & UAT** | End-to-end testing, bug fixes, performance testing, user acceptance, deployment readiness | All phases complete |

> Phases 3 and 4 may partially overlap once Phase 2 core modules are stable and approved by QA.

---

## 12. Success Metrics

| KPI | Target | Measures |
|---|---|---|
| **EOD Submission Rate** | ≥ 95% of working days have an EOD submitted per active member within the reporting window | Daily effort capture discipline |
| **Approval Turnaround Time** | ≥ 90% of submitted EODs reviewed and actioned by Team Lead within 24 hours | Workflow responsiveness & TL accountability |
| **Audit Log Coverage** | 100% of state-changing actions (submissions, approvals, edits) captured in the audit trail with no gaps | Full compliance and accountability traceability |

---

## 13. Assumptions & Constraints

### Assumptions

- Each member belongs to **exactly one** Task Sub-Group; cross-group assignments are out of scope for v1
- A Team Lead manages one or more Task Sub-Groups but always within a **single** Task Group
- EOD reports are submitted **once per calendar day** per member; multiple submissions per day not supported in v1
- Org hierarchy (Departments, Task Groups, Sub-Groups) is pre-configured by Admin before go-live
- All users access the system via a supported **web browser**; no mobile native app required for v1
- Work Log entries are the **authoritative data source** for all reporting and analytics
- The Missing Submission Report uses working-day calendars; **public holidays must be configurable by Admin**

### Constraints

- Authentication uses **JWT only**; OAuth/SSO integration deferred to a future release
- Department Head **cannot** modify EOD records or approval statuses — this is a **hard system constraint**, not a configurable permission
- Audit log records are **immutable**; no role, including Admin, can delete or alter them
- Notifications are **web-only** in v1; no email, SMS, or push notification channels
- API endpoint specifications and database schema details are **excluded** from this BRD (documented separately)
- Real-time notifications require SignalR; infrastructure team must provision WebSocket support **prior to Phase 4**
- Report export formats in v1 are limited to **CSV**; PDF export deferred to a later release

---

*This document is a living reference for the Development and QA teams. All sections should be reviewed and signed off by project stakeholders before development begins. Updates must be version-controlled and communicated to all team members.*

*© 2025 Internal Use Only — Development & QA Reference*
