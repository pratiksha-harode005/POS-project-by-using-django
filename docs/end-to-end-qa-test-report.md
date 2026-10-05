# KSS Procurement OS — End-to-End QA Test Report

**Report status:** Test plan prepared; full manual end-to-end execution pending  
**System:** KSS Procurement OS (React/Vite frontend, Django REST API, configured database)  
**Reference process:** *Dynamic website testing process.pdf* (SOP-02)  
**Prepared:** 03 October 2026

> This report follows the attached SOP's 12-step QA lifecycle. Build/system checks listed as completed below were run during this change. Business workflow scenarios are executable test cases, not claimed results; they require QA/staging accounts and test data.

## 1. Objective and scope

Validate the complete procurement application from login through request completion, covering role-based portals, request submission, approvals, sourcing, finance, payment, receipts, notifications, and audit history. Include the dedicated 13-stage Software/SaaS renewal journey, standard Software/SaaS requests, and the applicable hardware/vendor procurement path. Verify positive, negative, boundary, access-control, data-integrity, UI, regression, and release scenarios.

## 2. Overall results at preparation time

| Check | Result | Evidence / limitation |
|---|---|---|
| Django configuration/system check | **PASS** | `python manage.py check` — no issues reported. |
| Frontend production build | **PASS** | `npm.cmd run build` — TypeScript and Vite build completed. Existing chunk-size and mixed static/dynamic import warnings were reported. |
| Full role-based E2E execution | **NOT RUN** | Requires QA/staging environment and Team Lead, Manager, Finance, Admin, and Vendor test accounts. |
| API/database journey verification | **NOT RUN** | Requires running QA services and approved QA database access. |
| UAT/release approval/production smoke | **PENDING** | Must be completed by the designated business and release owners. |

No live or real payment was initiated. Mock payment cases below are for an isolated QA environment only.

## 3. SOP-02 execution sequence

| SOP step | QA activity | Deliverable / exit condition |
|---|---|---|
| 1. Requirements + acceptance criteria | Confirm role, permitted action, business rule, failure behavior, and boundary conditions for each flow below. | Acceptance criteria agreed; no ambiguous transition. |
| 2. Design + API + database check | Review portal route, API contract, role permissions, status mapping, and persisted entities/history. | Testable UI/API/data expectations identified. |
| 3. Development + unit test | Developer performs local checks and reviews changes/CI. | Developer checks recorded; no known blocking defect. |
| 4. Developer self-test | Check changed pages, API actions, validation, saved state, and errors locally. | Handoff notes and affected areas supplied to QA. |
| 5. Smoke testing | On QA build, verify startup, login, navigation, and basic critical request flow. | If a critical smoke check fails, stop and return build for correction. |
| 6. Functional + UI/UX testing | Execute cases in this report, including positive, negative, boundary, business-rule, responsive, and accessibility checks. | Results/evidence captured per case. |
| 7. API + database testing | Verify auth, roles, methods, response/error schema, and saved values/history after actions. | API and read-only QA data checks reconcile. |
| 8. Integration + E2E testing | Trace browser → API → backend → database → next role's queue for full user journeys. | All critical journeys reach expected terminal state. |
| 9. Security + performance + compatibility + accessibility | Verify access boundaries, safe errors, agreed response/load targets, supported browsers/devices, keyboard/focus/labels. | Risks/issues recorded; agreed checks pass. |
| 10. Regression testing | Rerun affected existing software and hardware flows after changes/fixes. | No unresolved blocking regression. |
| 11. UAT + release approval | Business users execute realistic scenarios; QA presents evidence and open defects. | Required sign-offs recorded; release criteria met. |
| 12. Production smoke + monitoring | After approved release, run safe read-only checks, monitor health, and follow fix/retest/regression/RCA process for incidents. | Monitoring owner and incident path active. |

## 4. Roles and test setup

Run in isolated QA/staging with the configured database and supported browsers. Prepare separate accounts for Employee (if enabled), Team Lead, Manager, Finance, Admin, and Vendor; use multiple departments to test data isolation. Prepare test requests for Software/SaaS, renewal, and hardware, plus seeded vendor/quotation, purchase order, goods receipt, invoice, and payment data where those modules are enabled. Record build/commit, environment, browser/version, viewport, role, test data IDs, tester, and execution date. Use unique IDs and synthetic personal/vendor/payment data. Never store passwords, access tokens, or sensitive payment data in evidence.

## 5. End-to-end journey map

### A. Login and role access

Open the application → authenticate with each test role → confirm role-specific landing page/navigation → open an allowed page → attempt a restricted page/action as another role → log out and verify protected pages require authentication.

**Expected:** correct identity/role and portal, protected routes and APIs reject unauthorized access, no cross-department data leakage, and logout clears access.

### B. Standard Software/SaaS request

Team Lead creates and submits request → Manager reviews and approves/rejects/sends back → where configured, Manager recommends Finance → Finance reviews and approves/rejects → authorized Team Lead processes mock payment → Team Lead submits payment justification → Manager verifies or sends back → Team Lead acknowledges → request reaches completed status with history/receipt.

**Expected:** only valid next actions appear; every transition is persisted and role-gated; approval/payment amounts reconcile; Manager verification alone does not complete the request.

### C. Software/SaaS renewal (13 stages)

Team Lead → Renewal Request → Manager Review → Manager Approval → Recommend to Finance → Finance Review → Finance Approval → Now Pay (Mock) → Payment Processed → Payment Justification → Manager Verifies Justification → Team Lead Acknowledgement → Request Completed.

**Expected:** renewal ID is sequential and linked to parent/original request; original remains unchanged; renewal is submitted as `TEAM_LEAD_SUBMITTED`; no active duplicate is allowed; renewal cannot be created before its subscription eligibility date; Finance recommendation/approval, mock payment, justification, verification, and acknowledgement enforce order; completion is `REQUEST_COMPLETED` and recorded once.

### D. Hardware/vendor procurement (where enabled)

Employee or Team Lead creates request → required Team Lead/Manager approval → sourcing/RFQ created → invited Vendor submits quotation → procurement/authorized role reviews and selects vendor → purchase order issued → goods received and verified → invoice recorded and checked against PO/receipt → authorized Finance processes payment → request/order history and reports reflect final state.

**Expected:** vendor sees only assigned RFQs; quotation and award preserve vendor/amount data; PO, receipt, invoice, and payment references are linked; three-way matching catches mismatches; unauthorized roles cannot alter another vendor's data or approve their own restricted actions.

### E. Admin, reporting, notifications, and records

Admin reviews authorized requests/configuration/records → relevant state changes generate the expected in-app notifications → recipients open the related record → dashboard, payment/financial reports, and history reflect persisted state and filters.

**Expected:** role scope is enforced; notifications link to the correct request and are not duplicated unexpectedly; reports agree with source records and respect filters/date ranges.

## 6. Core test case register

For each case record **preconditions, test data, steps, expected result, actual result, status (Pass/Fail/Blocked), evidence, and defect ID**.

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| E2E-001 | P0 | Login, logout, protected route and API checks for every role | Correct portal opens; unauthenticated and wrong-role access is denied without exposing protected data. |
| E2E-002 | P0 | Create, view, update allowed fields, and submit a valid Software/SaaS request | Request and audit entry persist; assigned reviewer sees it; submitter sees current status. |
| E2E-003 | P0 | Manager approves a valid request | Approval, amount, actor, timestamp, and next owner are recorded; duplicate/stale action does not advance twice. |
| E2E-004 | P0 | Manager sends back; requester corrects and resubmits | Comments remain visible; only allowed fields change; workflow returns to the correct review stage. |
| E2E-005 | P0 | Complete Software/SaaS standard path through payment justification and acknowledgement | Every step requires the prior valid state; final record, payment/receipt, and history agree. |
| E2E-006 | P0 | Complete all 13 Software/SaaS renewal stages | Exact order above is shown and enforced; final status is `REQUEST_COMPLETED`; source request unchanged. |
| E2E-007 | P0 | Renewal attempted before expiry, from incomplete source, by wrong role, or while active renewal exists | API/UI rejects each invalid case; no child request or audit side effect is created. Expiry boundary matches UI eligibility rule. |
| E2E-008 | P0 | Finance attempts approval before Manager recommendation; Team Lead attempts payment before Finance approval | Invalid transition is rejected; status and amounts remain unchanged. |
| E2E-009 | P0 | Mock payment: success, missing/invalid amount, duplicate click, retry | Only authorized post-approval mock payment is recorded once; invalid requests fail safely; no real payment call occurs. |
| E2E-010 | P0 | Submit justification before payment, with missing data, then with valid data | Premature/incomplete submissions are rejected with useful validation; valid dossier and evidence are persisted. |
| E2E-011 | P0 | Manager verifies before submission, then verifies valid justification | Early verification is rejected; successful verification records manager/notes and awaits Team Lead acknowledgement. |
| E2E-012 | P0 | Team Lead acknowledges before verification, then acknowledges after verification | Early acknowledgement is rejected; valid acknowledgement completes once and does not duplicate receipt/payment. |
| E2E-013 | P0 | Submit valid RFQ response as invited Vendor; try from non-invited Vendor | Invited vendor can submit; unrelated vendor is denied; quotation is linked to correct RFQ/vendor. |
| E2E-014 | P0 | Compare PO, goods receipt, invoice, and payment with matching and mismatching values | Correct match proceeds; mismatch is flagged and cannot be silently marked verified/paid. |
| E2E-015 | P1 | Reject request, quotation, invoice, or approval with required reason | Rejection state/reason is visible, audited, notified, and blocks downstream processing. |
| E2E-016 | P1 | Try invalid IDs, malformed dates/amounts, missing required fields, stale state, and duplicate submissions | API returns expected validation/auth/conflict response; no partial or duplicate persisted records. |
| E2E-017 | P1 | Search, filters, pagination, refresh, dashboard, reports, history, and notifications | Results match server records and selected criteria; links open correct record; counts/amounts reconcile. |
| E2E-018 | P1 | Responsive and accessibility checks on login, request form, tables/cards, details, and modals | Supported viewport layout is usable; controls have labels, keyboard focus, visible errors, and accessible names. |
| E2E-019 | P1 | Performance and compatibility at agreed volume on supported browsers/devices | Record target, sample size, response timings, environment, browser/device, and outcome; no agreed threshold is silently assumed. |
| E2E-020 | P1 | Regression after changes to software renewal/payment and common request APIs | Existing software path, hardware sourcing path, role portals, reports, and records still behave as expected. |

## 7. API and database evidence checklist

For each mutating action verify HTTP method/route, authentication, role/department authorization, status code, response schema, validation message, and retry/idempotency behavior using an approved QA API client. After create/update/approve/recommend/pay/justify/verify/acknowledge and procurement actions, use read-only QA queries to confirm request status/stage, parent/original links, actor and timestamps, amounts, approval history, payment/receipt, vendor, RFQ/quotation, PO/receipt/invoice relationships, and notification references. Reconcile displayed UI values with API and stored records. Do not run destructive queries.

## 8. Defect handling and release gates

Stop QA and return the build if startup, login, authorization, or a critical path smoke check fails. For a failure, capture timestamp, role, request/entity ID, browser console/network response, backend correlation/log details, and read-only data state. Classify as UI, network/API, backend, database, configuration, or external service. After a fix rerun the failed case, related transitions, the affected E2E journey, and impacted regression cases.

Release recommendation requires: all P0 cases pass; no open critical/high-severity release blocker; required regression passes; evidence is attached; Team Lead, Manager, Finance, and applicable Admin/Vendor business users complete UAT; designated release owner signs off. Production smoke must remain safe and non-destructive: login, role portal access, read-only list/detail, health/log/metric observation. Do not create a production request or process payment for smoke.

## 9. Execution summary and sign-off

| Environment / build | Tester | Date | Passed | Failed | Blocked | Open defects | Decision |
|---|---|---|---:|---:|---:|---|---|
| Not executed — QA environment required | | | | | | | Pending |

| Sign-off role | Name | Decision | Date / evidence |
|---|---|---|---|
| QA Lead | | Pending | |
| Team Lead UAT | | Pending | |
| Manager UAT | | Pending | |
| Finance UAT | | Pending | |
| Admin / Vendor UAT (if applicable) | | Pending | |
| Release owner | | Pending | |
