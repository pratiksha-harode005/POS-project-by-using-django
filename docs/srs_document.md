# Enterprise Software Requirement Specification (SRS) & System Architecture Document
**Project:** Enterprise Investment Management Platform (EIMP v2.0)  
**Standard:** IEEE 830 / ISO 29148 Standard Software Specification  
**Company:** Kalpanaaa Software Solutions Pvt Ltd  
**Date:** August 2026  

---

> [!IMPORTANT]
> **EXECUTIVE REVISION NOTICE (v2.0):**  
> This updated specification corrects critical business model, regulatory, and architectural flaws present in v1.0. Fixed return rate guarantees (6%, 9%, 13%) previously labeled as 'Venture Capital' have been legally realigned into compliant **Debt / Syndicate Fixed-Income & Equity NAV Models** in strict accordance with SEBI and RBI regulations.

---

## 1. Executive Summary & Business Realignment

The **Enterprise Investment Management Platform (EIMP)** provides a secure, transparent, multi-tenant ecosystem for individual and corporate investors. Version 2.0 addresses compliance risks, workflow vulnerabilities, and tech stack bloat.

### 1.1 Key Corrections Made in Version 2.0
* **Legal & Business Compliance:** Replaced illegal fixed-return promises labeled as 'Venture Capital' with compliant *P2P Fixed Debt Slabs* (RBI P2P/NBFC compliant) or *Syndicate Equity NAV Plans* (SEBI compliant).
* **Tech Stack Rationalization:** Consolidated duplicate backend frameworks (`Spring Boot` + `NestJS`) into a single enterprise stack, reducing development overhead.
* **Mandatory Digital KYC:** Promoted KYC from a 'Future Feature' to a **blocking prerequisite** before any wallet funding or investment execution.
* **Core Digital Payments & E-Sign:** Promoted UPI, NetBanking, and Aadhaar Digital E-Sign into the Core MVP.

---

## 2. System User Roles & Access Control

| Role | Target Portal | Key Responsibilities |
| :--- | :--- | :--- |
| **Investor** | Investor Portal (Web App) | Digital KYC completion, wallet funding, asset allocation, portfolio tracking, payout requests. |
| **Authorized Agent** | Agent Field Portal | Assist offline investors, submit tokenized cash/cheque collection requests verified via investor OTP. |
| **Founder / Deal Lead** | Founder Dashboard | Submit deal metrics, view capital raised, manage quarterly investor disclosures and performance updates. |
| **Finance Admin** | Finance Dashboard | Verify bank deposits, process withdrawal approvals, trigger automated payment gateway payouts. |
| **Super Admin** | Super Admin Panel | Configure return slabs, manage RBAC permissions, audit system logs, trigger compliance reports. |

---

## 3. Functional Specifications (Core MVP Modules)

### 3.1 User Registration & Mandatory Digital KYC
* **Authentication:** Passwordless Mobile OTP + Email Verification + JWT Token Session Management.
* **Automated KYC Pipeline:** Real-time PAN verification via NSDL API, Aadhaar OTP e-KYC via DigiLocker, and Bank Account Penny-Drop verification.
* **Compliance Gate:** System strictly blocks wallet deposits until KYC status is set to `VERIFIED`.

### 3.2 Digital Investment Wallet & Plan Engine
* **Virtual Account Architecture:** Dedicated Virtual Bank Account generation per user via RazorpayX / Cashfree for automated instant reconciliation.
* **Investment Execution:** Investors select between Debt Slabs or Equity Shares. System locks capital and generates an automated E-Signed Investment Agreement.

### 3.3 Tokenized Agent Collection Workflow
* **Offline Assistance:** Field agents initiate collection requests. A 6-digit OTP is sent directly to the investor's mobile number.
* **Anti-Fraud Audit:** Agent cannot confirm collection without investor OTP entry, preventing unauthorized cash handling.

### 3.4 Automated Withdrawal & Payout Engine
* **Payout Workflow:** Withdrawal Request ➔ Automated Fraud Check ➔ Finance Admin Approval ➔ Payment Gateway Payout API.
* **SLA & Approval Matrix:** Withdrawals under ₹50,000 auto-processed within 2 hours; amounts > ₹50,000 require dual-admin signoff.

---

## 4. Technical Architecture & Technology Stack (HLD)

```
[ Next.js 14 Frontend ] ──(HTTPS/REST)──> [ API Gateway / Nginx ]
                                                    │
                                           [ Java Spring Boot API ]
                                                    │
                   ┌────────────────────────────────┴────────────────┐
                   ▼                                                 ▼
        [ PostgreSQL 16 DB ]                                  [ Redis 7 Cache ]
       (ACID Transactions)                                  (Session / Locks)
```

| Component | Selected Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (TypeScript), Tailwind CSS | Server-Side Rendering (SSR) for speed, SEO readiness, unified type safety. |
| **Backend** | Java Spring Boot 3.x OR NestJS | Enterprise REST APIs, Spring Security / Passport JWT, high transaction throughput. |
| **Primary Database** | PostgreSQL 16 | Strict ACID compliance for financial ledger, Row-Level Security, multi-version concurrency. |
| **Cache & Locks** | Redis 7 | In-memory session management, rate limiting, and atomic transaction locks. |
| **Cloud Hosting** | AWS (EKS, RDS, S3, CloudFront) | Dockerized microservices deployment with auto-scaling and multi-region disaster recovery. |
| **Integrations** | RazorpayX, DigiLocker, SES, Gupshup | Instant UPI/NetBanking gateway, Aadhaar e-KYC, transactional SMS/Email notifications. |

---

## 5. Database Schema & Data Dictionary (30 Core Tables)

| Category | Core Entity Tables | Key Attributes & Foreign Keys |
| :--- | :--- | :--- |
| **User & Auth** | `users`, `roles`, `user_roles`, `sessions` | user_id (PK), phone, email, password_hash, status, created_at |
| **KYC & Bank** | `kyc_records`, `bank_accounts` | kyc_id, user_id (FK), pan_number, aadhaar_ref, status, verified_at |
| **Financial Ledger** | `wallets`, `wallet_transactions` | wallet_id, user_id (FK), balance, locked_balance, txn_type, amount, ref_no |
| **Investments** | `investment_plans`, `investments`, `returns_ledger` | inv_id, user_id (FK), plan_id (FK), principal_amount, expected_return, status |
| **Payouts & Agent** | `withdrawals`, `agent_profiles`, `collections` | w_id, user_id (FK), amount, bank_id (FK), approval_status, processed_by |
| **Audit & Logs** | `audit_logs`, `otp_logs`, `notifications` | log_id, actor_id, action, ip_address, request_payload, timestamp |

---

## 6. Non-Functional Requirements (NFRs)

* **Performance SLA:** API latency < 200ms for 95% of requests. Supports 10,000 active concurrent user sessions.
* **Security Architecture:** AES-256 bit encryption at rest; TLS 1.3 in transit. Strict Role-Based Access Control (RBAC) enforced at API Gateway level.
* **Immutable Audit Log:** Financial transaction tables utilize append-only logs with cryptographic hash verification to prevent data tampering.
* **High Availability:** 99.9% uptime SLA using AWS Multi-AZ deployment with automated hourly database snapshot backups.

---

## 7. Project Implementation Roadmap

| Phase | Focus Area | Key Deliverables | Timeline |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Core Infrastructure & KYC | Auth Engine, DigiLocker / PAN API, Wallet Schema setup. | Weeks 1-4 |
| **Phase 2** | Investment & Payment Engine | Payment Gateway, Investment Plans, E-Sign Document Generation. | Weeks 5-8 |
| **Phase 3** | Agent & Admin Dashboards | Agent OTP Collection, Finance Approval Portal, Analytics. | Weeks 9-12 |
| **Phase 4** | Security Audit & Deployment | Vulnerability assessment, Load testing, AWS Production Setup. | Weeks 13-14 |
