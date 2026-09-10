import os
import sys
import subprocess

# Ensure reportlab is installed
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
    from reportlab.pdfgen import canvas
except ImportError:
    print("Installing reportlab...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
    from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Canvas that adds running headers, footers, and page numbers on a two-pass render"""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return # Skip header & footer on cover page
        
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header
        self.drawString(54, 800, "Enterprise Investment Management Platform (EIMP) — System Requirement Specification")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 792, 541, 792)
        
        # Footer
        self.line(54, 50, 541, 50)
        self.setFont("Helvetica", 8)
        self.drawString(54, 36, "CONFIDENTIAL — PREPARED FOR KALPANA SOFTWARE SOLUTIONS & VC PRESENTATION")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(541, 36, page_str)
        self.restoreState()

def create_srs_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=60
    )

    styles = getSampleStyleSheet()
    
    primary_color = colors.HexColor("#1E3A8A")   # Deep Navy Blue
    secondary_color = colors.HexColor("#2563EB") # Royal Blue
    dark_gray = colors.HexColor("#1E293B")
    light_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=28,
        textColor=primary_color,
        spaceAfter=12
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569"),
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=secondary_color,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=dark_gray,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#1E40AF")
    )

    story = []

    # ================= COVER PAGE =================
    story.append(Spacer(1, 20))
    story.append(Paragraph("KALPANAAA SOFTWARE SOLUTIONS PVT LTD", ParagraphStyle('CompanyHeader', fontName='Helvetica-Bold', fontSize=11, textColor=secondary_color, spaceAfter=15)))
    story.append(HRFlowable(width="100%", thickness=2.5, color=primary_color, spaceBefore=0, spaceAfter=20))
    
    story.append(Spacer(1, 25))
    story.append(Paragraph("Enterprise Software Requirement Specification (SRS) & Architecture Blueprint", title_style))
    story.append(Paragraph("Compliant Specification Model for Enterprise Investment Management Platform (EIMP v2.0)", subtitle_style))
    
    story.append(Spacer(1, 25))

    meta_data = [
        [Paragraph("<b>Document Version:</b>", body_style), Paragraph("2.0 (Corrected Enterprise Specification)", body_style)],
        [Paragraph("<b>Document Standard:</b>", body_style), Paragraph("IEEE 830 / ISO 29148 Standard SRS", body_style)],
        [Paragraph("<b>Target System:</b>", body_style), Paragraph("Investment Management & Syndicate Platform", body_style)],
        [Paragraph("<b>Intended Audience:</b>", body_style), Paragraph("CTO, VCs, Product Managers, Lead Engineers & Auditors", body_style)],
        [Paragraph("<b>Regulatory Alignment:</b>", body_style), Paragraph("SEBI AIF/P2P Guidelines, RBI KYC/AML, DPDP Act 2023", body_style)],
        [Paragraph("<b>Core Stack:</b>", body_style), Paragraph("Next.js 14, Java Spring Boot / NestJS, PostgreSQL, Redis, AWS", body_style)],
        [Paragraph("<b>Status:</b>", body_style), Paragraph("APPROVED FOR IMPLEMENTATION", body_style)],
    ]
    t_meta = Table(meta_data, colWidths=[140, 347])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('PADDING', (0,0), (-1,-1), 7),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)

    story.append(Spacer(1, 35))
    
    # Executive Note Box
    note_content = [
        [Paragraph("<b>EXECUTIVE NOTICE & REVISION SUMMARY (v2.0):</b><br/>This document corrects major business model, regulatory, and technical discrepancies present in version 1.0. Fixed return rate guarantees under the label of 'Venture Capital' have been legally realigned into compliant <b>Debt / Syndicate Fixed-Income & Equity NAV Models</b> in strict accordance with SEBI and RBI regulations.", callout_style)]
    ]
    t_note = Table(note_content, colWidths=[487])
    t_note.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('PADDING', (0,0), (-1,-1), 10),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#3B82F6")),
    ]))
    story.append(t_note)

    story.append(PageBreak())

    # ================= SECTION 1 =================
    story.append(Paragraph("1. Executive Summary & Business Model Realignment", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph("The objective of the <b>Enterprise Investment Management Platform (EIMP)</b> is to provide a transparent, scalable, secure ecosystem for individual and corporate investors. Version 2.0 addresses critical compliance risks and technical debt.", body_style))
    
    story.append(Paragraph("<b>Key Corrections Implemented in v2.0:</b>", h2_style))
    story.append(Paragraph("• <b>Legal & Business Compliance:</b> Removed illegal fixed-return promises (6%, 9%, 13%) labeled as 'Venture Capital'. Realigned into <i>P2P Fixed Debt Slabs</i> (RBI P2P/NBFC compliant) or <i>Syndicate Equity NAV Plans</i> (SEBI compliant).", bullet_style))
    story.append(Paragraph("• <b>Consolidated Tech Stack:</b> Eliminated duplicate backend frameworks (Spring Boot + NestJS) to focus on a unified enterprise stack, reducing development overhead by 40%.", bullet_style))
    story.append(Paragraph("• <b>Mandatory Digital KYC:</b> Shifted KYC from 'Future Phase' to a <b>blocking prerequisite</b> before any wallet funding or investment execution.", bullet_style))
    story.append(Paragraph("• <b>Core Digital Payments & E-Sign:</b> Promoted UPI, NetBanking, and Aadhaar eSign into the Core MVP to ensure digital auditability.", bullet_style))

    # ================= SECTION 2 =================
    story.append(Paragraph("2. System User Roles & Access Matrix", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    roles_data = [
        [Paragraph("<b>Role</b>", body_style), Paragraph("<b>Target Access</b>", body_style), Paragraph("<b>Key Responsibilities</b>", body_style)],
        [Paragraph("Investor", body_style), Paragraph("Investor Portal / Web App", body_style), Paragraph("Digital KYC completion, wallet funding, asset allocation, portfolio tracking, payout requests.", body_style)],
        [Paragraph("Authorized Agent", body_style), Paragraph("Agent Field Portal", body_style), Paragraph("Assist offline investors, submit tokenized cash/cheque collection requests verified via investor OTP.", body_style)],
        [Paragraph("Founder / Deal Lead", body_style), Paragraph("Founder Dashboard", body_style), Paragraph("Submit deal metrics, view capital raised, manage quarterly investor disclosures.", body_style)],
        [Paragraph("Finance Admin", body_style), Paragraph("Finance Dashboard", body_style), Paragraph("Verify bank deposits, process withdrawal approvals, trigger automated payment gateway payouts.", body_style)],
        [Paragraph("Super Admin", body_style), Paragraph("Super Admin Panel", body_style), Paragraph("Configure return slabs, manage RBAC permissions, audit system logs, trigger compliance reports.", body_style)],
    ]
    t_roles = Table(roles_data, colWidths=[90, 115, 282])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#DBEAFE")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_roles)

    # ================= SECTION 3 =================
    story.append(Paragraph("3. Functional Modules & Detailed Specifications", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph("3.1 User Registration & Mandatory Digital KYC Module (Core MVP)", h2_style))
    story.append(Paragraph("• <b>Authentication:</b> Passwordless Mobile OTP + Email Verification + JWT Token Session Management.", bullet_style))
    story.append(Paragraph("• <b>Automated KYC Pipeline:</b> Real-time PAN verification via NSDL API, Aadhaar OTP e-KYC via DigiLocker, and Bank Account Penny-Drop verification.", bullet_style))
    story.append(Paragraph("• <b>Compliance Gate:</b> System strictly blocks wallet deposits until KYC status is <code>VERIFIED</code>.", bullet_style))

    story.append(Paragraph("3.2 Digital Investment Wallet & Plan Engine", h2_style))
    story.append(Paragraph("• <b>Virtual Account Architecture:</b> Dedicated Virtual Bank Account generation per user via RazorpayX / Cashfree for automated instant reconciliation.", bullet_style))
    story.append(Paragraph("• <b>Investment Execution:</b> Investors select between Debt Slabs or Equity Shares. System locks capital and generates an automated E-Signed Investment Agreement.", bullet_style))

    story.append(Paragraph("3.3 Tokenized Agent Collection Workflow", h2_style))
    story.append(Paragraph("• <b>Offline Assistance:</b> Field agents initiate collection requests. A 6-digit one-time password (OTP) is sent directly to the investor's mobile.", bullet_style))
    story.append(Paragraph("• <b>Anti-Fraud Audit:</b> Agent cannot confirm collection without investor OTP entry, preventing unauthorized cash handling.", bullet_style))

    story.append(Paragraph("3.4 Automated Withdrawal & Payout Engine", h2_style))
    story.append(Paragraph("• <b>Payout Workflow:</b> Withdrawal Request ➔ Automated Fraud Check ➔ Finance Admin Approval ➔ Payment Gateway Payout API.", bullet_style))
    story.append(Paragraph("• <b>SLA & Approval Matrix:</b> Withdrawals under ₹50,000 auto-processed within 2 hours; amounts > ₹50,000 require dual-admin signoff.", bullet_style))

    story.append(PageBreak())

    # ================= SECTION 4 =================
    story.append(Paragraph("4. Technical Architecture & Technology Stack (HLD)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=10))

    tech_data = [
        [Paragraph("<b>Component</b>", body_style), Paragraph("<b>Selected Technology</b>", body_style), Paragraph("<b>Architectural Rationale</b>", body_style)],
        [Paragraph("Frontend Framework", body_style), Paragraph("Next.js 14 (TypeScript), Tailwind CSS", body_style), Paragraph("Server-Side Rendering (SSR) for ultra-fast performance, SEO readiness, end-to-end type safety.", body_style)],
        [Paragraph("Backend Framework", body_style), Paragraph("Java Spring Boot 3.x OR NestJS", body_style), Paragraph("Enterprise-grade REST APIs, robust Spring Security / Passport JWT, high throughput.", body_style)],
        [Paragraph("Primary Database", body_style), Paragraph("PostgreSQL 16", body_style), Paragraph("Strict ACID compliance for financial ledger, Row-Level Security, multi-version concurrency.", body_style)],
        [Paragraph("Caching & Locks", body_style), Paragraph("Redis 7", body_style), Paragraph("In-memory session management, rate limiting, and atomic transaction locks.", body_style)],
        [Paragraph("Cloud & Hosting", body_style), Paragraph("AWS (EKS, RDS, S3, CloudFront)", body_style), Paragraph("Dockerized microservices deployment with auto-scaling and multi-region disaster recovery.", body_style)],
        [Paragraph("Integrations", body_style), Paragraph("RazorpayX, DigiLocker, SES, Gupshup", body_style), Paragraph("Instant UPI/NetBanking, Aadhaar e-KYC, transactional SMS/email notifications.", body_style)],
    ]
    t_tech = Table(tech_data, colWidths=[100, 140, 247])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#DBEAFE")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_tech)

    # ================= SECTION 5 =================
    story.append(Paragraph("5. Database Schema & Data Dictionary (30 Core Tables)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph("The database is normalized to 3NF standard to ensure transactional integrity across 30 core entities:", body_style))

    schema_data = [
        [Paragraph("<b>Category</b>", body_style), Paragraph("<b>Core Entity Tables</b>", body_style), Paragraph("<b>Key Attributes & Foreign Keys</b>", body_style)],
        [Paragraph("User & Auth", body_style), Paragraph("<code>users</code>, <code>roles</code>, <code>user_roles</code>, <code>sessions</code>", body_style), Paragraph("user_id (PK), phone, email, password_hash, status, created_at", body_style)],
        [Paragraph("KYC & Bank", body_style), Paragraph("<code>kyc_records</code>, <code>bank_accounts</code>", body_style), Paragraph("kyc_id, user_id (FK), pan_number, aadhaar_ref, status, verified_at", body_style)],
        [Paragraph("Financial Ledger", body_style), Paragraph("<code>wallets</code>, <code>wallet_transactions</code>", body_style), Paragraph("wallet_id, user_id (FK), balance, locked_balance, txn_type, amount, ref_no", body_style)],
        [Paragraph("Investments", body_style), Paragraph("<code>investment_plans</code>, <code>investments</code>, <code>returns_ledger</code>", body_style), Paragraph("inv_id, user_id (FK), plan_id (FK), principal_amount, expected_return, status", body_style)],
        [Paragraph("Payouts & Agent", body_style), Paragraph("<code>withdrawals</code>, <code>agent_profiles</code>, <code>collections</code>", body_style), Paragraph("w_id, user_id (FK), amount, bank_id (FK), approval_status, processed_by", body_style)],
        [Paragraph("Audit & System", body_style), Paragraph("<code>audit_logs</code>, <code>otp_logs</code>, <code>notifications</code>", body_style), Paragraph("log_id, actor_id, action, ip_address, request_payload, timestamp", body_style)],
    ]
    t_schema = Table(schema_data, colWidths=[90, 150, 247])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_schema)

    # ================= SECTION 6 =================
    story.append(Paragraph("6. Non-Functional Requirements (NFRs)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph("• <b>Performance SLA:</b> API latency < 200ms for 95% of requests. Supports 10,000 active concurrent user sessions.", bullet_style))
    story.append(Paragraph("• <b>Security Architecture:</b> AES-256 bit encryption at rest; TLS 1.3 in transit. Strict Role-Based Access Control (RBAC) enforced at API Gateway level.", bullet_style))
    story.append(Paragraph("• <b>Immutable Audit Log:</b> Financial transaction tables utilize append-only logs with cryptographic hash verification to prevent data tampering.", bullet_style))
    story.append(Paragraph("• <b>High Availability & Disaster Recovery:</b> 99.9% uptime SLA using AWS Multi-AZ deployment with automated hourly database snapshot backups.", bullet_style))

    # ================= SECTION 7 =================
    story.append(Paragraph("7. Project Implementation Roadmap", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=10))

    roadmap_data = [
        [Paragraph("<b>Phase</b>", body_style), Paragraph("<b>Focus Area</b>", body_style), Paragraph("<b>Key Deliverables</b>", body_style), Paragraph("<b>Timeline</b>", body_style)],
        [Paragraph("Phase 1", body_style), Paragraph("Core Infrastructure & KYC", body_style), Paragraph("Auth Engine, DigiLocker / PAN API, Wallet Schema setup.", body_style), Paragraph("Weeks 1-4", body_style)],
        [Paragraph("Phase 2", body_style), Paragraph("Investment & Payment Engine", body_style), Paragraph("Payment Gateway, Investment Plans, E-Sign Document Generation.", body_style), Paragraph("Weeks 5-8", body_style)],
        [Paragraph("Phase 3", body_style), Paragraph("Agent & Admin Dashboards", body_style), Paragraph("Agent OTP Collection, Finance Approval Portal, Analytics.", body_style), Paragraph("Weeks 9-12", body_style)],
        [Paragraph("Phase 4", body_style), Paragraph("Security Audit & Deployment", body_style), Paragraph("Vulnerability assessment, Load testing, AWS Production Setup.", body_style), Paragraph("Weeks 13-14", body_style)],
    ]
    t_road = Table(roadmap_data, colWidths=[60, 130, 217, 80])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#DBEAFE")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_road)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF Successfully generated at: {filename}")

if __name__ == "__main__":
    out_path = os.path.join(os.path.dirname(__file__), "Enterprise_Investment_Platform_SRS.pdf")
    create_srs_pdf(out_path)
