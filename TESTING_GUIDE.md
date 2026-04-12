# Bedrock — User Manual & Testing Guide

> **Last updated:** Roles, Permissions & Client Portal
> This document is updated after every milestone. Use it to know what's built, how to run it, and what to test.

---

## How to Run

```bash
cd bedrock

# First time only: install dependencies
npm install

# Start both frontend + backend (opens browser automatically)
npm run dev
```

This runs two processes in parallel:
- **Frontend:** Vite dev server at `http://localhost:5173`
- **Backend:** `convex dev` watching `convex/` for changes and syncing to the cloud deployment

If you need to run them separately:
```bash
npm run dev:frontend   # Vite only
npm run dev:backend    # Convex only
```

---

## Quick Start (First Time)

1. Open `http://localhost:5173`
2. Click **Sign in**
3. **Sign up** with an email + password (toggle "Sign up" link under the form)
4. After sign-up, you land on `/app` — you'll see the **"Set up your organization"** card
5. Enter an organization name (e.g., "Building & Earth Sciences") and click **Create organization**
6. You're now the **admin** of your org. You see the Dashboard with your name + role.

---

## What's Built (by Milestone)

### M1 — Foundation

**What it is:** Auth, routing, org tenancy, shadcn UI.

**Nothing to test manually** beyond the sign-up flow above. M1 is infrastructure.

---

### M2 — Projects & Clients

**What it is:** Admin panel for managing clients (EPC/GC companies), client contacts, projects, team assignments, and user invitations.

#### Test: Create a Client

1. Navigate to **Admin** (top nav, shield icon — only visible to admins)
2. Click the **Clients** tab
3. Click **Add client**
4. Enter a company name (e.g., "Skanska USA") and optional notes
5. Click **Add client**
6. The client appears in the table

#### Test: Add Client Contacts

1. On the Clients page, click a client row
2. A **Contacts** card expands below
3. Click **Contact** button
4. Fill in name, email, phone, title → **Add contact**
5. The contact appears in the table (these are the people who will receive reports in M5)

#### Test: Create a Project

1. Go to **Admin → Projects** tab
2. Click **New project** (requires at least one client to exist first)
3. Select a client, enter project name, job number, city/state
4. Click **Create project**
5. The project appears in the list

#### Test: View Project Detail

1. Go to **Projects** (top nav)
2. Click a project row → you land on the project detail page
3. You see three tabs: **Reports** (empty until M3 reports exist), **Team** (empty), **Recipients** (empty unless configured)

#### Test: Invite a Team Member

1. Go to **Admin → Users** tab
2. Click **Invite**
3. Enter a name, email, and role (tech, pm, admin, client) → **Send invitation**
4. The invitation appears in the "Invitations" table with status **pending**
5. **To test claiming:** Open a private/incognito browser, go to `http://localhost:5173/sign-in`, sign up with the **exact same email** you invited
6. After sign-up, you should see **"You've been invited!"** → click **Accept invitation**
7. You're now a member of the org with the assigned role

> **Tip:** Non-admin users won't see the Admin nav link. Techs will only see projects they're assigned to (assignment UI is in Admin → Projects, but the assignment dialog hasn't been built yet — for now the admin can see all projects).

---

### M3 — Concrete Field Reports

**What it is:** Full report lifecycle for concrete field testing (ASTM C143/C231/C1064/C31). Includes auto-saving forms, photo capture, cylinder tracking, and submit-for-review flow.

#### Test: Create a Concrete Field Report

1. Go to **Projects** → click a project
2. Click **New report** (top right)
3. You're redirected to a new draft report page with a report number (e.g., `CMT-2026-00001`)
4. The status shows **Draft**

#### Test: Fill In the Form (Auto-Saves)

The form has three sections. Fill in any fields — **every change auto-saves after 1 second** (no save button needed):

**Pour Information:**
- Mix design #, design strength (psi), supplier, ticket #, truck #, cubic yards, placement location

**Test Results:**
- Slump (inches), air content (%), air method (pressure/volumetric), concrete temp (°F), ambient temp (°F), unit weight (pcf), admixture notes

**Weather & Location:**
- Temp, conditions, wind, station from/to, location note

> **Verify auto-save:** Fill in a few fields, then refresh the page. Your data should persist.

#### Test: Add Photos

1. Scroll to the **Photos** section
2. Click **Add photo**
3. Select an image file (on mobile, this opens the camera)
4. The photo uploads and appears in a grid
5. Hover over a photo to see the delete button

> **On desktop:** The file picker opens. On a real phone, `capture="environment"` opens the rear camera directly.

#### Test: Add Cylinder Sets

1. Scroll to the **Cylinder Sets** section
2. Click **Add set** — creates "Set A" with status "cast"
3. Inside the set card, enter a cylinder number (auto-suggested, e.g., "A-1")
4. Select a break age (7, 14, 28, or 56 days)
5. Click the **+** button to add the cylinder
6. Repeat for more cylinders (the number auto-increments)
7. You can add multiple sets (Set B, Set C...)

> **Note:** Cylinder break results (strength psi) are filled in later by the lab — that flow ships in a future milestone. For now, cylinders show "pending".

#### Test: Submit for Review

1. Fill in the required fields: **Mix design #, Supplier, Ticket #, Placement location** (others are optional)
2. Click **Submit for review** (top right)
3. If required fields are missing, you get a toast error listing them
4. On success: status changes to **Submitted**, the form becomes read-only, and the submit button disappears
5. The report appears in the project's Reports tab with status "Submitted"

#### Test: My Reports List

1. Go to **My Reports** (top nav)
2. You see all your draft + rejected reports
3. Click a report number to open it

---

### M4 — Review Queue + Approval

**What it is:** PM/admin-side review workflow. PMs can claim submitted reports, approve with a drawn signature, or reject with comments. Techs can fix rejected reports and re-submit.

#### Test: Access the Review Queue

1. Sign in as a **PM** or **admin** user
2. You'll see **Review Queue** in the top nav (techs and clients don't see this)
3. Click **Review Queue** → you see a table of all submitted + in-review reports across the org

> **Tip:** To test this properly, you need at least one submitted report. Create and submit one from M3's test flow first.

#### Test: Claim a Report for Review

1. In the Review Queue, find a report with status **Submitted**
2. Click the **Claim** button
3. The status changes to **In Review** and your name appears in the Reviewer column
4. Two new buttons appear: **Approve** and **Reject**

#### Test: Approve a Report with Signature

1. On a claimed (In Review) report, click **Approve**
2. A dialog opens with a **signature pad** — draw your signature with mouse or finger
3. Optionally add comments
4. Click **Approve & sign**
5. The report status changes to **Approved**
6. Navigate to the report detail page (`/app/reports/$id`) — you'll see an **Approval** section at the bottom showing:
   - Who approved and when
   - The signature image
   - Any comments

#### Test: Reject a Report

1. On a claimed report, click **Reject**
2. Enter a rejection reason (required) → click **Reject with comments**
3. The report status changes to **Rejected**
4. As the tech who created it: open **My Reports** → you'll see it with "Rejected" status
5. Click into it — you'll see the rejection reason in a red banner at the top
6. The form is editable again — fix the issue and click **Submit for review** to re-submit

#### Test: Full Review Cycle

1. **Tech:** Create a report → fill in fields → submit
2. **PM:** Open Review Queue → claim → reject with "Missing air content reading"
3. **Tech:** Open My Reports → see rejected report with reason → add the air content → re-submit
4. **PM:** Claim again → sign → approve
5. **Tech/PM:** Open the report → see the approval with signature at the bottom

---

### M5 — PDF Generation + Client Portal

**What it is:** When a PM approves a report, the system automatically generates a branded PDF (server-side via `@react-pdf/renderer`), creates magic-link portal tokens for each default recipient on the project, and marks the report as "Delivered". Clients can view the full report and download the PDF via the portal — no login required.

#### Prerequisites for Testing M5

Before testing delivery, you need **client contacts set as default recipients** on a project:

1. Go to **Admin → Clients** → click a client → **add a contact** (name + email)
2. Go to **Admin → Projects** — note: the create-project dialog doesn't yet have a recipient picker. To set default recipients, you can create a new project and manually test with the backend, or accept that portal tokens won't be minted (the PDF will still generate).

> **Note:** For the demo, even without recipients configured, the PDF generation and report status transition still work. You just won't have portal links.

#### Test: Automatic Delivery After Approval

1. Create and submit a concrete field report (per M3 flow)
2. As a PM, go to **Review Queue** → claim → approve with signature
3. After approval, **within a few seconds**, the report status automatically changes from "Approved" to **Delivered**
4. Navigate to the report detail page — you'll see:
   - A **Download PDF** button linking to the generated PDF
   - A **Portal Links** section showing each recipient with an "Open portal" link
   - View counts for each portal link

> **What happens under the hood:** The approve mutation schedules a delivery action via `ctx.scheduler.runAfter(0, ...)`. The action loads the full report bundle, renders a PDF using React-PDF, uploads it to Convex storage, mints a portal token per recipient, and marks the report delivered.

#### Test: Client Portal

1. From the delivered report detail page, click **Open portal** on any recipient's link
2. You're taken to `/r/{token}` — a **public page** (no sign-in required)
3. The page shows:
   - Organization name + "Report Portal" header
   - Report number, project, job #, date
   - Full test data (pour info, test results, weather, cylinders)
   - Approval signature
   - **Download PDF** button at the top
4. Click **Download PDF** to download the generated report

#### Test: Portal Link States

- **Valid link:** Shows the full report as described above
- **Expired link:** Shows "Link expired" message (tokens expire after 90 days)
- **Invalid/tampered link:** Shows "Report not found"

#### Test: View the Generated PDF

1. Click **Download PDF** (either from the report detail page or the portal)
2. The PDF opens in a new tab or downloads
3. It should contain:
   - Header: org name, project name, job #, report number
   - Pour information, test results, weather/location
   - Cylinder table (with "Pending" for unbroken cylinders)
   - Approval signature and date at the bottom
   - Footer with report number and portal URL

---

### M6 — Nuclear Density, Proof Roll, DCP

**What it is:** Three additional test types, all using the same pipeline as M3–M5 (create → fill → submit → review → approve → PDF → portal). The "New report" button on the project detail page now opens a dropdown to pick the report type.

#### Test: Create a New Report Type

1. Go to **Projects** → click a project
2. Click **New report** (dropdown) → pick **Nuclear Density**, **Proof Roll**, or **DCP**
3. You're redirected to a new draft with the correct kind

#### Test: Nuclear Density Report

1. Create a Nuclear Density report
2. Fill in the form: gauge model, serial number, material description, lift number
3. Scroll to **Density Readings** → add readings with test #, station, depth, wet/dry density, moisture, max dry density, opt moisture
4. The **compaction %** and **pass/fail** are computed server-side (95% threshold)
5. Submit → review → approve → delivery works the same as concrete
6. The PDF includes gauge info + a readings table with compaction percentages

#### Test: Proof Roll Report

1. Create a Proof Roll report
2. Fill in: equipment used, number of passes, area description, result (pass/fail/conditional)
3. If result is "fail" or "conditional": add failure zones and recommendations
4. This is the simplest test type — no child rows, just a single form
5. Submit → review → approve → delivery works identically

#### Test: DCP Report (Dynamic Cone Penetrometer)

1. Create a DCP report
2. Fill in test setup: test location, groundwater depth, hammer weight (select 17.6 or 10.1 lbs)
3. Scroll to **DCP Layers** → add layers with from/to depth and blow count
4. **DCP index (mm/blow)** and **estimated CBR %** are computed server-side using the ASTM D6951 correlation
5. The depth fields auto-advance (each layer starts where the last one ended)
6. Submit → full pipeline

#### Test: Kind Picker Dropdown

1. On a project detail page, click **New report**
2. You should see 4 options: Concrete Field Test, Nuclear Density, Proof Roll, DCP
3. Each creates the correct report type

---

### M7 — Pile Load Testing

**What it is:** The fifth and final test type. Pile load tests are structurally different from the other four — they're session-based tests conducted over hours with load increments applied over time, each recording settlement data. The UI is a session page where the tech adds increments as the test progresses.

#### Test: Create a Pile Load Report

1. Go to **Projects** → click a project
2. Click **New report** → select **Pile Load Test**
3. Fill in the pile information form:
   - **Test type:** Static (D1143) or Dynamic (D4945)
   - **Pile ID:** e.g., "P-07"
   - **Pile type:** e.g., '18" HP14x73 steel'
   - **Design load / max load (kips)**
   - **Result:** Pass / Fail / Inconclusive
   - **Failure criterion notes**

#### Test: Add Load Increments

1. Scroll to the **Load Increments** section
2. Enter a load (kips), hold time (minutes), and net settlement (inches)
3. Click **Add increment** — the increment is recorded with a timestamp
4. Repeat for each load step (typical static test has 10-20 increments)
5. The table shows all increments with load, hold time, settlement, and applied time

#### Test: Full Pipeline

1. Fill in pile info + add several load increments
2. Submit → PM claims → PM signs + approves
3. The system auto-generates a PDF that includes:
   - Pile information table
   - Load increment table
   - A simple **load-settlement chart** (SVG scatter plot)
   - Weather/location, approval signature
4. Portal link works the same as other test types

> **Note:** High-frequency dial gauge readings (the `pileLoadReadings` table) support batch import from CSV in a future enhancement. For now, increments capture the summary data per load step.

---

### Mobile Polish — PWA, Wizard, Touch UX

**What it is:** Mobile-optimized experience for field techs on phones/tablets. PWA support for home-screen install, multi-step wizard for report forms, sticky submit button, and improved touch targets.

#### Test: PWA Install (Add to Home Screen)

1. Open `http://localhost:5173/app` on your phone (same network)
   - Or use Chrome DevTools → Toggle Device Toolbar to simulate mobile
2. In Chrome: tap the three-dot menu → **"Add to Home Screen"** or **"Install app"**
3. In Safari iOS: tap Share → **"Add to Home Screen"**
4. The app icon appears on your home screen with a "B" icon
5. Open it — it runs in standalone mode (no browser chrome)

#### Test: Multi-Step Wizard (Mobile Only)

1. Open a report on a phone-sized screen (< 640px width)
2. Instead of one long scrolling form, you see a **step indicator** (progress bar segments at the top)
3. Steps are:
   - **Step 1: Test Data** — the form for the specific test type
   - **Step 2: Photos** — photo capture + gallery
   - **Step 3: Cylinders / Readings / Layers** (varies by test type)
4. Use **Back / Next** buttons at the bottom to navigate between steps
5. Tap any segment in the progress bar to jump directly to that step
6. All auto-save still works — switching steps doesn't lose data

> **Desktop behavior is unchanged.** On screens >= 640px, all sections are visible at once (no wizard).

#### Test: Sticky Submit Button (Mobile)

1. On a phone-sized screen, open an editable report (draft or rejected)
2. Scroll down — notice the **"Submit for review"** button is fixed at the bottom of the screen
3. It stays visible no matter how far you scroll
4. On desktop, the submit button stays in the header (top right) as before

#### Test: Touch Targets

1. On a phone, buttons and interactive elements should be at least **44px** tall
2. Table rows have extra vertical padding on mobile for easier tapping
3. The sticky submit button is full-width and uses the `lg` size variant

---

## Feature Matrix

| Feature | Status | Milestone |
|---|---|---|
| Email/password sign-up & sign-in | ✅ | M1 |
| Google OAuth | ⬜ Deferred | — |
| First-user org bootstrap | ✅ | M2 |
| Invitation-based user onboarding | ✅ | M2 |
| Client CRUD (admin) | ✅ | M2 |
| Client contacts CRUD (admin) | ✅ | M2 |
| Project CRUD (admin) | ✅ | M2 |
| Project team assignments | ⬜ Admin UI exists, assignment dialog pending | M2 |
| Concrete field test form | ✅ Auto-saving, all ASTM fields | M3 |
| Photo capture + upload | ✅ Native camera input | M3 |
| Cylinder set + cylinder tracking | ✅ | M3 |
| Submit for review | ✅ draft → submitted | M3 |
| PM review queue | ✅ Claim, approve, reject | M4 |
| Approve with drawn signature | ✅ Signature pad + storage | M4 |
| Reject with comments + re-submit | ✅ Full cycle | M4 |
| PDF generation (server-side) | ✅ @react-pdf/renderer in Node action | M5 |
| Auto-delivery after approval | ✅ Scheduled action on approve | M5 |
| Client portal (magic link) | ✅ Public /r/:token page, no auth | M5 |
| Portal PDF download | ✅ Signed Convex storage URL | M5 |
| Email delivery to clients | ⬜ Needs Resend API key | M5+ |
| Nuclear density test | ✅ Form + density readings + PDF | M6 |
| Proof roll observation | ✅ Form + PDF | M6 |
| DCP test | ✅ Form + DCP layers + PDF | M6 |
| Report kind picker dropdown | ✅ 4 test types selectable | M6 |
| Server-computed compaction % | ✅ Nuclear density readings | M6 |
| Server-computed DCP index + CBR | ✅ DCP layers | M6 |
| Pile load test (static + dynamic) | ✅ Session-based, load increments | M7 |
| Load-settlement chart in PDF | ✅ SVG scatter plot | M7 |
| All 5 test types live | ✅ Phase 1 complete | M7 |
| PWA manifest (home screen install) | ✅ Standalone mode | Polish |
| Multi-step wizard on mobile | ✅ Step-by-step with progress bar | Polish |
| Sticky submit button (mobile) | ✅ Fixed at bottom, safe-area aware | Polish |
| 44px min touch targets | ✅ Global CSS rule | Polish |
| Safe-area padding (notched phones) | ✅ env(safe-area-inset-*) | Polish |

---

## Known Limitations / Workarounds

1. **No Google OAuth yet.** Use email/password to sign up. Google OAuth will be added when you provide a Google Cloud OAuth client.

2. **Project team assignment UI is minimal.** Admin can create projects, but the UI to assign specific users to projects (as tech/PM/observer) is not exposed yet. Because of this, **admin users see all projects** while non-admin users may see an empty project list until assignments are wired.

3. **Only concrete field reports** are supported in M3. The "New report" button defaults to `concrete_field`. Other test types (nuclear density, proof roll, DCP, pile load) show an "unsupported kind" error if manually navigated to.

4. **No offline support.** If you lose connectivity while filling in a form, the auto-save will fail silently. Refresh when back online — any previously saved data will be there.

5. **Cylinder break results** can't be recorded yet (lab intake flow is a future milestone). Cylinders show "pending" where the strength result will go.

6. **Report numbers are global per org per year** (e.g., CMT-2026-00001). They increment atomically. If you delete a draft, that number is consumed (not recycled).

7. **Approved reports say "Approved" but nothing happens after that yet.** PDF generation and email delivery to EPC/GC clients ship in M5. For now the status just sits at "Approved — pending delivery."

8. **Signature pad is mouse/touch only.** On desktop you draw with the mouse. On mobile/tablet you draw with your finger. There is no typed-signature fallback.

9. **No PE seal upload yet.** The data model supports it (M4 pre-modeled it), but the UI doesn't expose the seal upload. Coming when we confirm state-board requirements.

10. **Email delivery is not wired yet.** The infrastructure is built (reportDeliveries table, portal tokens), but actual email sending via Resend is deferred until you configure a Resend API key and sending domain. The portal link is the primary delivery mechanism for now.

11. **Default recipients on projects** must be configured for portal tokens to be minted. The project creation dialog doesn't yet have a recipient picker — you'd need to set this up via the backend or a follow-up admin UI enhancement.

12. **PDF styling is functional, not branded.** The PDF uses Helvetica and a clean layout. Pixel-matching to B&E's existing report templates requires their real PDF exemplars.

---

## Troubleshooting

**"Profile not set up" after sign-in:**
This means no org exists yet. You need to create one (the bootstrap card should appear). If you signed up with an email that was invited, the "Accept invitation" card should appear instead.

**"Waiting for an invitation" screen:**
The org exists but you haven't been invited. Ask the admin to go to Admin → Users → Invite and add your email.

**Form changes not saving:**
Check the browser console for errors. The auto-save fires 1 second after the last keystroke. If the Convex backend is disconnected, saves will queue and retry when reconnected.

**"UNSUPPORTED_KIND" error:**
You tried to create a report type other than `concrete_field`. Only concrete field tests are implemented in M3. The others come in M6/M7.

**Build errors after pulling changes:**
```bash
npm install          # in case new deps were added
npx convex dev --once  # push schema changes
npm run dev          # start fresh
```

---

### Roles, Permissions & Client Portal

**What it is:** Role-based permission enforcement across the entire app. Four roles: admin, pm, tech, client. Replaces the unused "viewer" role with "client" (login + dashboard for EPC/GC contacts). Adds rejection workflow polish (inline rejection reasons, resubmission notes, rejected badge).

#### Test: Tech Permissions

1. Sign in as a **tech** user (invite one if needed — Admin → Users → Invite with role "Tech")
2. Assign the tech to a project (Admin → Projects → click project → Team tab → assign user)
3. The tech should **only see projects they are assigned to** in the Projects list
4. Navigate to an assigned project → create a report → fill in fields → submit
5. The tech should **not** see the Review Queue in the sidebar
6. The tech should **not** be able to edit a report created by another user (backend will reject)

#### Test: PM Permissions

1. Sign in as a **PM** user
2. PM can see assigned projects + the Review Queue
3. PM can claim a submitted report, then approve or reject it with a reason
4. PM **can edit a tech's draft** (fix a field, save — auto-save should work)
5. PM cannot access Admin pages

#### Test: Rejection Workflow

1. As a PM, reject a submitted report with a reason (e.g., "Wrong mix design number")
2. As the tech who created the report, go to **My Reports**
3. You should see a red **"Rejected: Wrong mix design number"** preview inline
4. The "My Reports" sidebar link should show a red **badge count** for rejected reports
5. Click into the report → you see the red rejection alert at the top
6. Fix the issue → click **Submit for review** → a dialog asks "What did you fix?" (optional)
7. Type a note (e.g., "Corrected mix design to BD-4500") → click **Resubmit**
8. The report goes back to "submitted" in the queue

#### Test: Client Portal (Login)

1. As an admin, go to **Admin → Users → Invite**
2. Select role **Client** → enter a name and email → Send invitation
3. In a separate browser, sign up with that email
4. Accept the invitation → you land on the **Client Dashboard** (`/app/client`)
5. The sidebar shows only "Your Reports" (no Projects, My Reports, Queue, Admin)
6. If there are approved/delivered reports for the client's company, they appear in the list
7. Click a report → see it in read-only mode (no edit controls, no submit button)
8. If the report has a PDF, the download button works

#### Test: Client Cannot Access Internal Pages

1. While signed in as a client, try navigating directly to `/app/reports`, `/app/queue`, or `/app/admin/users`
2. The backend should block these queries (FORBIDDEN error) — the pages will show errors or empty state
3. The client should be unable to create, edit, or submit any report

#### Test: Portal Magic Links (Still Work)

1. Access an approved report via its magic link (`/r/{token}`)
2. The report should still render correctly — no login required
3. If a report is somehow unapproved, the portal returns "not found"

---

### Executive Ops Dashboard

**What it is:** Operational metrics for B&E leadership. Shows on the main dashboard (`/app`) for admin users only. Four metric cards + a report volume breakdown by test kind.

#### Test: Admin Sees Ops Metrics

1. Sign in as **admin**
2. Navigate to the dashboard (`/app`)
3. You should see an **Ops Metrics** section above the existing stats cards
4. Four metric cards: **Reports Delivered**, **Avg Turnaround**, **Review Queue**, **Rejection Rate**
5. Below the cards: **Volume by Test Type** — horizontal bar chart showing delivered reports broken down by kind
6. Each card shows a value, unit/subtitle, and colored icon with hover effect
7. The existing stats cards (Active Projects, My Drafts, Review Queue) still appear below

#### Test: Non-Admin Users Don't See It

1. Sign in as **PM** or **tech**
2. Navigate to `/app`
3. The Ops Metrics section should **not** be visible
4. The existing dashboard (stats cards, recent drafts, projects) works normally

#### Test: Metrics Accuracy

1. As admin, approve and deliver a report
2. Return to the dashboard — **Reports Delivered** count should increment (real-time via Convex reactivity)
3. **Avg Turnaround** should reflect the time from field date to delivery
4. **Review Queue** count should match the number of submitted + in-review reports
5. If you reject a report, the **Rejection Rate** should update accordingly

#### Test: Empty State

1. If no reports have been delivered in the last 30 days, the metric cards show **0** (dimmed) for volume and **--** for turnaround
2. The Volume by Test Type section shows a centered empty message: "No reports delivered in the last 30 days."

#### Test: Mobile Responsiveness

1. View the dashboard on a mobile viewport
2. Metric cards should display in a 2-column grid
3. Bar chart labels should truncate cleanly on narrow screens
