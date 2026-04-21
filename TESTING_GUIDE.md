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
| Offline app shell (SW precache) | ✅ vite-plugin-pwa injectManifest | Mobile |
| Local draft recovery (offline save) | ✅ localStorage-backed, custom forms | Mobile |
| Offline-aware save pill | ✅ Unified via useSaveState | Mobile |
| Haptic feedback on key actions | ✅ Submit / approve / reject / photo | Mobile |
| GPS-stamped photos | ✅ navigator.geolocation on capture | Mobile |
| Template name shown on custom reports | ✅ Everywhere a kind label appears | Mobile |
| Card condensation (mobile) | ✅ Drops redundant creator lines | Mobile |
| Autocomplete/inputMode/autoCap hints | ✅ Form renderer + kind forms | Mobile |
| Install banner (Chromium + iOS) | ✅ 14-day dismiss TTL | Mobile |
| Mobile bottom nav bar | ✅ Tech + PM roles only | Mobile |
| Resume draft card | ✅ Top of /app for non-PM/admin | Mobile |
| Pull-to-refresh | ✅ My Reports page | Mobile |
| Long-press photo → action sheet | ✅ Share / Maps / Delete | Mobile |
| Template builder desktop-only gate | ✅ Friendly mobile screen | Mobile |
| Voice dictation | ✅ Web Speech API on textareas | Mobile |
| Barcode / QR scanner | ✅ Ticket / mix / truck # on concrete form | Mobile |
| Push notifications (infra) | ✅ SW handler + Convex action + schema | Mobile |

---

## Known Limitations / Workarounds

1. **No Google OAuth yet.** Use email/password to sign up. Google OAuth will be added when you provide a Google Cloud OAuth client.

2. **Project team assignment UI is minimal.** Admin can create projects, but the UI to assign specific users to projects (as tech/PM/observer) is not exposed yet. Because of this, **admin users see all projects** while non-admin users may see an empty project list until assignments are wired.

3. **Only concrete field reports** are supported in M3. The "New report" button defaults to `concrete_field`. Other test types (nuclear density, proof roll, DCP, pile load) show an "unsupported kind" error if manually navigated to.

4. **Offline support is partial.**
   - The service worker precaches the app shell so the app can *open* offline (verify in a production build: `npm run build && npx vite preview`).
   - Draft form edits in custom templates are stashed to `localStorage` on every change; on next mount you'll see a toast to restore unsaved edits.
   - The kind-specific forms (concrete, DCP, etc.) still surface an offline pill but rely on Convex's in-memory queue — closing the tab while offline may drop those in-flight saves. A full IndexedDB write queue is a future step.

5. **Push notifications need VAPID keys before they send.** Infrastructure is wired end-to-end (subscription registry, SW push handler, Convex action, submit/reject/approve triggers). To enable delivery:
   - Run `npx web-push generate-vapid-keys` on any machine.
   - Set `VITE_VAPID_PUBLIC_KEY` in the frontend env (same public key).
   - Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in Convex dashboard env (`mailto:you@domain.com` for subject).
   - The "Enable" button appears in the Profile page once the public key is exposed.
   - Without keys, `sendToUser` no-ops silently — mutations keep working.

6. **Some camera features are browser-gated.**
   - **QR / barcode scanner** uses `BarcodeDetector`: Chrome (desktop + Android) and iOS Safari 17+. Hidden otherwise.
   - **Voice dictation** uses `SpeechRecognition` / `webkitSpeechRecognition`: Chrome, Edge, iOS Safari. Hidden in Firefox mobile.
   - **GPS on photos** depends on the user granting location permission. Denial is silent — photos still upload, just without a stamp.

7. **Bottom nav hides for admin users.** Admins see the full sidebar drawer (they have 8+ admin-only pages). Techs and PMs get the bottom nav with a center FAB.

8. **Template builder is blocked below 768px** with a "Best on desktop" screen — the 4-column layout doesn't fit and we'd rather refuse than half-render. Preview / list are fine on mobile.

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

---

### Team Allocation (Admin → Allocation)

PMs and directors use this page to see where every tech/PM is deployed across active projects and decide who has capacity to move to a different project.

#### Test: Roster renders the right people

1. Sign in as **admin**
2. Navigate to **Admin → Allocation** (hard-hat icon in the admin tab bar)
3. Confirm the stat chips show: total **Techs**, **Unassigned** (techs + PMs with zero active projects), and **Active assignments** (total count across everyone)
4. Confirm the table lists every active member with role `admin`, `pm`, or `tech` (clients are excluded)
5. For each row, the **Assigned projects** cell shows one chip per active project the person is on; each chip shows the project name and the project-role (tech / pm / observer)

#### Test: Filters and sort

1. Type a project name or job number in the search box — only rows with that project should remain
2. Set **All roles → Techs only** — PM and admin rows disappear
3. Set **All load levels → Unassigned (0 projects)** — only people with zero active assignments remain (great for "who's free?")
4. Set **All load levels → Heavy load (3+)** — only people on 3+ projects remain (great for "who's stretched?")
5. Click the **Name** header to toggle A→Z / Z→A; click **Load** to toggle ascending/descending

#### Test: Reassign flow (the whole point)

1. On the Allocation page, click a project chip on any tech's row
2. You should be taken to that project's detail page with the **Team** tab pre-selected and the **Manage team** dialog open
3. Remove that tech from this project (trash icon)
4. Navigate back to **Admin → Allocation** — the chip should be gone and the load count decremented
5. Now click the **Reassign…** link at the end of their chip list — it takes you to the Projects list so you can pick the new project, then Manage team → Add them

#### Test: Closed / on-hold projects do not count

1. Mark a project as closed or on-hold from **Admin → Projects**
2. On the Allocation page, any assignments to that project should no longer appear as chips, and the load count should drop
3. Reopen the project; the chip reappears

#### Test: Non-admin access is blocked

1. Sign in as **PM** or **tech** (without `canViewAllocation` granted)
2. Navigate to `/app/allocation` directly in the URL bar
3. You should be redirected to `/app`
4. The "Allocation" link should not appear in the sidebar

> **Note:** The page moved from `/app/admin/techs` to `/app/allocation` so non-admins who've been granted `canViewAllocation` can reach it without entering the admin subtree.

---

### Per-user Permissions (Admin → Users → Permissions column)

Execs can grant or revoke four specific permissions for any PM or tech without changing their role. This is the mechanism for one PM to gain cross-project visibility while others stay scoped to their assignments.

The toggles are:
- **See all projects** (`canViewAllProjects`) — view every project org-wide, not just assigned ones
- **Manage project team** (`canManageTeam`) — add/remove techs on projects they can see
- **View allocation page** (`canViewAllocation`) — access `/app/allocation`
- **Approve / reject reports** (`canApproveReports`) — access the Review Queue, approve/reject. PM role default: on.

Rules:
- **Admin** always has all four permissions, regardless of toggles
- **Client** never has these permissions (UI shows "—")
- **PM** / **tech** default to role defaults; an explicit toggle overrides the default (e.g. you can explicitly revoke `canApproveReports` from a PM)

#### Test: Grant cross-project visibility to a PM

1. Sign in as **admin**, open **Admin → Users**
2. Find a member with role **pm** (or change a tech to pm for this test) and click their **Permissions** button (shows either "Default", "N granted", or "N granted · custom")
3. Turn on **See all projects** and **View allocation page**, click **Save**
4. The button label should update to show more grants and "· custom"
5. Sign out, sign in as that PM
6. The sidebar should now show **Allocation** (was hidden before)
7. On **Projects**, you should see every active project in the org, not just ones you're assigned to

#### Test: Revoke a default permission

1. As admin, open a PM's permissions
2. **Approve / reject reports** shows as on (role default)
3. Click the toggle once — it goes off and is now "Custom" (explicit deny)
4. Click **Save**
5. Sign in as that PM — the **Review Queue** link and approve/reject buttons should be hidden; the `listReviewQueue` query should return FORBIDDEN if called directly

#### Test: Reset to role defaults

1. As admin, open a PM with custom permissions set
2. Click **Reset all** (clears all explicit overrides)
3. Click **Save**
4. The button label returns to "1 granted" (just the PM role default for `canApproveReports`)
5. Individual rows can also be reset with their per-row "Reset to role default" link

#### Test: Admin can't edit their own permissions

1. Your own row should show "Full access" in the Permissions column with no edit button
2. This is because admin always has all permissions — the toggles would be no-ops

#### Test: Backend enforces permissions

Even if a user edits HTML to try to show a hidden button, the Convex mutation rejects the call. Verify by:
1. As a PM without `canManageTeam`, open a project detail page
2. The "Manage team" button is hidden
3. If you force-open the Manage team dialog via devtools and click Add, the `projects.assign` mutation returns `FORBIDDEN: MISSING_PERMISSION / canManageTeam`

---

### Custom Test Templates (form builder)

A PM or admin can build their own test forms for edge-case tests that don't fit the five built-in kinds. Templates are available org-wide; custom reports go through the same draft → submit → review → approve → deliver lifecycle and ship as a PDF just like built-in tests.

Permission required: `canManageTestTemplates`. Default on for **admin** and **PM**. Admins can revoke from any PM via **Admin → Users → Permissions**.

#### Test: Build a template

1. Sign in as admin (or a PM with `canManageTestTemplates` on). The sidebar shows **Templates** below Allocation.
2. Click **Templates → New template**. You're taken to a builder with an auto-named "Untitled template".
3. Rename the title (top-left input) to something like **"Aggregate Sieve Analysis"**.
4. Click field types on the left palette to add them to the canvas. Each type is available:
   - Heading (section divider)
   - Short text, Paragraph
   - Number (with unit / min / max)
   - Date
   - Dropdown (with options editor)
   - Checkbox
   - Pass / fail (with optional pass criterion)
   - Photos (with optional minimum count)
   - Readings table (with column editor)
5. Click a field on the canvas — the right inspector shows its settings. Edit label, help text, required flag, plus type-specific config (unit for Number, options for Dropdown, columns for Table).
6. Drag the grip handle on any field to reorder.
7. Duplicate a field by hovering and clicking the copy icon; delete with the trash icon.
8. Toggle **Preview** (top-right) to see what a tech will see, rendered with the real form inputs. This is not a static mockup — it uses the same FormRenderer as the tech-facing page.
9. Click **Save**. You're redirected to the Templates list and see the new template with its field count.

#### Test: Use a template on a project

1. Open any active project's detail page.
2. Click **New report**. The menu now has the built-in kinds at the top and a **Custom** section at the bottom listing every active template by name.
3. Click your template — a draft custom report is created with the fields snapshotted onto it.
4. Fill in values across all field types. Auto-save fires on a 600ms debounce after each change.
5. Upload a photo via any Photo field — the file is uploaded to Convex storage and the preview thumbnail appears inline.
6. Add rows to a Readings table — cells render as correct input types per column.
7. Toggle a Pass / Fail / N/A pill — the color matches the state.
8. Submit for review.

#### Test: Template snapshotting (no retroactive edits)

1. Build a template, save it, and submit a custom report using it.
2. Go back to **Templates → [your template]** and add or remove a field. Save.
3. Navigate back to the original submitted report — it still shows the fields as they were at creation time. The submission is not retroactively changed.

#### Test: PDF delivery

1. Review queue: claim the custom report, approve it with a signature.
2. Deliver it. The generated PDF should include:
   - Template name as a section header
   - Each field rendered with label + value
   - Pass/fail cells as colored pills (green / red / gray)
   - Readings tables as bordered tables with column headers
   - Photos inline in the layout
   - Site conditions + creator + approval signature block (same as any other report)

#### Test: Permissions + access

1. As admin, open a PM's permissions and toggle **canManageTestTemplates** off.
2. That PM should lose the **Templates** link in the sidebar.
3. Visiting `/app/templates` directly should redirect them to `/app`.
4. The backend mutation (`testTemplates.create` / `update` / `setStatus` / `clone`) returns `FORBIDDEN: MISSING_PERMISSION` if called directly.
5. Custom templates still appear in a project's **New report** picker for any tech (they just can't build templates themselves).

#### Test: Archive / restore / duplicate

1. On the Templates list, click the archive icon on any template → it moves to the Archived section (visible via the "Show archived" checkbox).
2. Archived templates don't appear in project New-report pickers, but existing submissions still render fine.
3. Click restore on an archived row to return it to Active.
4. Click the copy icon on any row to create an "(copy)" duplicate — useful for forking a working template.

---

### Template Builder — 10× UX Upgrades

The builder ships with several advanced interactions that make it feel like a pro tool. All are opt-in — none block the basic "click a field type, fill the inspector" flow.

#### Starter gallery

- Opens automatically for a freshly-created, untitled, empty template.
- Accessible any time via the **Starters** button in the top toolbar.
- Picking a starter replaces the current fields. Undo (⌘Z) restores them.
- 6 starters ship out of the box: Blank, Concrete slump quick check, Daily safety walk, Nuclear density (5 readings), Inspector punch item, Pre-pour concrete checklist.

#### Slash menu (keyboard-first insert)

1. With the builder open, press `/` anywhere outside a text field.
2. A popover appears anchored to the palette; type to filter ("num", "pho", "pass").
3. Arrow keys navigate, **Enter** inserts the highlighted type at the end of the canvas (or after the selected field).
4. Also available via the `+` icon on any field card's hover actions — drops a new field after that one.

#### Inline label editing

- Click the label text on any canvas field card; it turns into an input in place.
- **Enter** commits, **Esc** cancels, blur also commits.
- Works for both field labels and heading text.

#### Full keyboard shortcuts

| Shortcut | Action |
|---|---|
| `/` | Open slash menu at palette |
| `↑` / `↓` | Move selection between fields |
| `⌘` + `↑` / `↓` | Move the selected field up/down in the list |
| `Enter` | Open inline label editor on the selected field (click also works) |
| `⌘Z` / `⌘⇧Z` | Undo / redo — 80-step history, coalesces fast edits |
| `⌘D` | Duplicate selected field |
| `Del` / `Backspace` | Delete selected field |
| `⌘S` | Force save immediately |
| `Esc` | Deselect |

All shortcuts respect focus — they don't fire while you're typing in an input.

#### Auto-save + undo

- Every change debounces into a save 1200ms after typing stops. The **Saved N ago** pill in the toolbar shows the age.
- When dirty, the pill is amber with "Unsaved changes". Saving shows a pulsing dot. Errors show an amber triangle.
- Undo/redo buttons in the toolbar reflect history availability — disabled when empty.

#### Live split-pane preview

- Right pane always-on (when viewport ≥ 1280px). Below that, toggle via the **panel-right** icon in the toolbar.
- Renders the form exactly as a tech will see it via the same `FormRenderer` used in production.
- **Desktop** and **Phone** mode toggle — phone is a 390px-wide device frame with a notch and rounded chrome.
- **Sample** toggle fills the form with plausible values (e.g. "Slump 4.5 in", "Compaction 97.2%") so the preview looks like a filled-out report, not an empty skeleton.

#### Smart field-type inference

- Name a text field "Test date" and the canvas shows an amber "Make this a Date field" chip next to the label.
- Click the chip to swap the field kind in place, preserving label/help/required.
- Runs on label keywords: `date/scheduled/when` → Date, `photo/image/picture` → Photo, `pass/fail/accept/reject` → Pass-fail, `psi/pcf/in/°F/compaction/slump/...` → Number, `select/choose/type/category/status` → Dropdown.
- Fires only on a mismatch (e.g. won't suggest Date on an existing Date field).

#### Duplicate-label detection

- If two non-heading fields share the same trimmed label, both show a red **DUP** badge in the card header. Rename one to clear.

#### Collapsible sections

- Every level-1 heading has a chevron. Click to collapse everything below it (until the next level-1 heading).
- Collapse state is reflected in the preview pane too — so a "complete hidden" section in the canvas shows as just the heading in the preview.

#### Field library (reusable blocks)

1. Click **Blocks** in the toolbar → switch to **Save current**.
2. Name it (e.g. "Site conditions block") and save.
3. Later, on any other template, click **Blocks → Browse** and **Insert** — ids are re-keyed automatically so inserting twice doesn't collide.
4. Delete from the library via the trash icon (hover a row).

#### AI generator (requires GEMINI_API_KEY)

1. Click **AI draft** in the toolbar.
2. Describe the test ("density test with 5 readings and pass/fail per point").
3. Press **Generate** or `⌘Enter` — the dialog swaps to a live streaming panel:
   - **Status chip** (amber, pulsing) announces the stage: *Thinking through the form…* → *Drafting fields…*
   - **Thinking** panel shows Gemini 2.5 Pro's **thought summaries** streaming in real time (monospace, auto-scrolling). This is Gemini's own reasoning — you're watching it plan the form out loud.
   - **Fields detected** panel shows each field label appearing as an emerald pill with a checkmark the moment the label is parsed from the streaming JSON.
4. When the stream completes, the dialog closes automatically and the fields land on the canvas with a **staggered entrance animation** — each card pulses amber and slides in 120ms after the previous one. Undo (`⌘Z`) restores the previous template.

**Tech details:** backend is a Convex httpAction at `/api/generate-template-stream` that proxies to the Google GenAI SDK (`gemini-2.5-pro`, `responseMimeType: "application/json"`, `thinkingConfig.includeThoughts: true`). The stream is SSE; the client consumes it with `fetch` + `ReadableStream` + a Bearer token from `useAuthToken()`.
4. The result replaces the current fields. **Undo** (⌘Z) restores them.
5. **Example prompts** appear as clickable chips under the textarea.
6. If the API key isn't set in Convex, the toast reads "Set GEMINI_API_KEY in your Convex deployment to enable AI generation".

> **Configuring the API key (one-time setup):** In your Convex deployment dashboard → Settings → Environment Variables → add `GEMINI_API_KEY=sk-ant-…`. The action reads the variable server-side only — it never ships to the browser.

#### Per-field-type color system

- Each field kind has an accent color that shows up on the palette chip, the canvas card's left rail, the slash-menu icon, and the inspector header.
- Heading: slate · Short text: sky · Paragraph: indigo · Number: emerald · Date: violet · Dropdown: amber (brand) · Checkbox: cyan · Pass/fail: orange · Photos: rose · Readings table: teal.
- Selected fields get a soft ring in the accent color. Light and dark mode both tested.

#### Usage counts

- Templates list shows a **Usage** column — number of custom reports that referenced each template. "Unused" in muted italic when zero.
- Count is live — once a tech creates a custom report from a template, its usage increments immediately.
