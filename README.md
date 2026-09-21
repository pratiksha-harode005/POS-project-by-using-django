# 🏢 KSS Procurement OS

**KSS Procurement OS** is an enterprise-grade Procurement Management Operating System built with a **Django REST Framework** backend and a **React + TypeScript + Vite** frontend.

---

## 📐 System Architecture

```
KSS-PROCUREMENT-OS/
├── backend/                # Django REST Framework API & Business Logic
└── frontend/               # React + TypeScript Single Page Application (SPA)
```

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Python 3.10+ / Django / Django REST Framework (DRF)
- **Database:** PostgreSQL (Primary Database)
- **Background Tasks:** Celery
- **Authentication:** Token / JWT Authentication & Role-Based Access Control (RBAC)

### Frontend
- **Framework & Tooling:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, PostCSS, Autoprefixer
- **UI Components & Icons:** Lucide React, Custom Layout Components
- **Data Visualization:** Recharts
- **HTTP Client:** Axios
- **Routing:** React Router v6

---

## 📁 Repository Structure

### Backend (`/backend`)
```
backend/
├── apps/
│   ├── authentication/        # User login, JWT token serializers & authentication APIs
│   ├── users/                 # Custom user models, user management, permissions
│   ├── core/                  # Shared base models, pagination, permissions
│   ├── procurement/           # Core procurement workflows (Pending implementation)
│   ├── request_management/     # Purchase requests (Pending implementation)
│   ├── rfq_management/         # Request for Quotations (Pending implementation)
│   ├── vendor_management/      # Vendor onboarding & tracking (Pending implementation)
│   ├── invoice_management/     # Invoice processing (Pending implementation)
│   ├── payment_management/     # Payment processing (Pending implementation)
│   ├── budget_management/      # Budget allocation & tracking (Pending implementation)
│   └── notification_management/# In-app & automated alerts (Pending implementation)
├── config/                     # Django settings, WSGI, URLs, Celery config
├── requirments/                # Dependency manifests (base.txt, dev.txt, prod.txt)
├── db.sqlite3                  # Local development SQLite database
└── manage.py                   # Django CLI management entrypoint
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── api/                    # API clients and HTTP endpoints (client.ts, authApi.js, userApi.js)
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Primitive UI components (Button, Input, Loader)
│   │   ├── layout/             # Top-level Navbar, Sidebar, Footer
│   │   └── portal/             # Shared portal components (PortalLayout, ActionModal, Stepper)
│   ├── context/                # React Context providers (AuthContext)
│   ├── features/               # Module views (auth, dashboard, users)
│   ├── hooks/                  # Custom React hooks (useAuth, useFetch)
│   ├── pages/                  # Public landing & marketing pages (Home, About, Features, Contact)
│   ├── portals/                # Role-specific portals:
│   │   ├── admin/              # Admin dashboard, request oversight, system config, records
│   │   ├── finance/            # Finance portal views
│   │   ├── manager/            # Manager portal views
│   │   ├── teamlead/           # Team Lead portal views
│   │   └── vendor/             # Vendor portal views
│   ├── routes/                 # Application router and protected route guards
│   ├── store/                  # Global state management
│   ├── App.tsx                 # Root React component
│   └── main.tsx                # Client entrypoint
├── package.json                # Node dependencies & scripts
├── tailwind.config.js          # Tailwind CSS styling configuration
└── vite.config.js              # Vite build setup
```

---

## 👥 Role-Based Portals

The platform defines distinct access portals tailored to user roles:

1. **Admin Portal (`/portals/admin`)**: System configuration, global user & request management, records.
2. **Manager Portal (`/portals/manager`)**: Purchase request approvals and high-level budget oversight.
3. **Team Lead Portal (`/portals/teamlead`)**: Team request submissions, departmental tracking.
4. **Finance Portal (`/portals/finance`)**: Invoice verification, budget releases, payment execution.
5. **Vendor Portal (`/portals/vendor`)**: RFQ responses, bid submissions, invoice uploads.

---

## 🚀 Quickstart Guide

### 1. Backend Setup

```bash
cd backend

# 1. Create and activate a Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirments/dev.txt

# 3. Apply database migrations
python manage.py migrate

# 4. Start the Django development server
python manage.py runserver
```

The backend server runs at `http://127.0.0.1:8000/`.

---

### 2. Frontend Setup

```bash
cd frontend

# 1. Install Node dependencies
npm install

# 2. Start the Vite development server
npm run dev
```

The frontend application runs at `http://localhost:5173/`.

---

## 🛡️ Git & Safety Guidelines

When contributing to this repository, adhere strictly to the team standards:

- **Branching:** Work on your designated branch (e.g., `Poobi`). **Never push directly to `main`**.
- **Pull Requests:** Submit PRs for all feature merges into `main`.
- **Database Safety:** Treat shared databases with care. Never execute `flush`, `drop`, or destructive resets.
- **Code Integrity:** Preserve existing features and ensure changes are backward-compatible.
- **Pre-commit Checks:** Always verify `git diff` and test your code locally before pushing.
