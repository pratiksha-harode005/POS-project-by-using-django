import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import AboutPage from '../pages/AboutPage'
import FeaturesPage from '../pages/FeaturesPage'
import FeatureDetailPage from '../pages/FeatureDetailPage'
import CategoryDetailPage from '../pages/CategoryDetailPage'
import ContactPage from '../pages/ContactPage'
import LoginPage from '../features/auth/loginPage'
import ScrollToTop from '../components/common/ScrollToTop'

// Shared Portal Components
import { PortalLayout } from '../components/portal/PortalLayout'
import { SharedProfilePage } from '../components/portal/SharedProfilePage'
import { SharedNotificationsPage } from '../components/portal/SharedNotificationsPage'
import { ProcurementProvider } from '../context/ProcurementContext'

// Team Lead Portal Pages
import { TeamLeadDashboard } from '../portals/teamlead/TeamLeadDashboard'
import { MyRequestsPage } from '../portals/teamlead/MyRequestsPage'
import { CreateRequestPage } from '../portals/teamlead/CreateRequestPage'
import { RequestHistoryPage } from '../portals/teamlead/RequestHistoryPage'
import { PaymentStatusPage } from '../portals/teamlead/PaymentStatusPage'

// Manager Portal Pages
import { ManagerDashboard } from '../portals/manager/ManagerDashboard'
import { ManagerRequestDetailsPage } from '../portals/manager/ManagerRequestDetailsPage'
import { MyApprovalsPage } from '../portals/manager/MyApprovalsPage'
import { ApprovedRejectedPage } from '../portals/manager/ApprovedRejectedPage'
import { ManagerThreeWayMatchingPage } from '../portals/manager/ManagerThreeWayMatchingPage'
import { RecommendedToFinancePage } from '../portals/manager/RecommendedToFinancePage'
import { ManagerBudgetsPage } from '../portals/manager/ManagerBudgetsPage'
import { ManagerRFQsPage } from '../portals/manager/ManagerRFQsPage'

// Finance Portal Pages
import { FinanceDashboard } from '../portals/finance/FinanceDashboard'
import { FinanceBudgetPage } from '../portals/finance/FinanceBudgetPage'
import { PendingFinancialApprovalPage } from '../portals/finance/PendingFinancialApprovalPage'
import { FinancePaymentsPage } from '../portals/finance/FinancePaymentsPage'
import { FinancialReportsPage } from '../portals/finance/FinancialReportsPage'
import { FinancePurchaseRequestsPage } from '../portals/finance/FinancePurchaseRequestsPage'

// Admin Portal Pages
import { AdminDashboard } from '../portals/admin/AdminDashboard'
import { AdminRequestsPage } from '../portals/admin/AdminRequestsPage'
import { AdminVendorsPage } from '../portals/admin/AdminVendorsPage'
import { AdminVendorComparisonPage } from '../portals/admin/AdminVendorComparisonPage'
import { AdminRecordsPage } from '../portals/admin/AdminRecordsPage'
import { AdminSystemConfigPage } from '../portals/admin/AdminSystemConfigPage'

// Vendor Portal Pages
import {
  VendorCategoriesPage,
  VendorsInCategoryPage,
  VendorDashboard,
  VendorRFQsPage,
  VendorQuotationsPage,
  VendorPurchaseOrdersPage,
  VendorDeliveriesPage,
  VendorReceiptsPage,
  VendorInvoicesPage,
  VendorPaymentStatusPage,
  VendorDocumentsPage,
} from '../portals/vendor/VendorPortalPages'

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Marketing Pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/features/:featureId" element={<FeatureDetailPage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />

      {/* ── 1. TEAM LEAD PORTAL ── */}
      <Route path="/portal/team_lead/*" element={<PortalLayout><TeamLeadRoutes /></PortalLayout>} />

      {/* ── 2. MANAGER PORTAL ── */}
      <Route path="/portal/manager/*" element={<PortalLayout><ManagerRoutes /></PortalLayout>} />

      {/* ── 3. FINANCE PORTAL ── */}
      <Route path="/portal/finance/*" element={<PortalLayout><FinanceRoutes /></PortalLayout>} />

      {/* ── 4. ADMIN PORTAL ── */}
      <Route path="/portal/admin/*" element={<PortalLayout><AdminRoutes /></PortalLayout>} />

      {/* ── 5. VENDOR PORTAL ── */}
      <Route path="/portal/vendor/*" element={<PortalLayout><VendorRoutes /></PortalLayout>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

function TeamLeadRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<TeamLeadDashboard />} />
      <Route path="my-requests" element={<MyRequestsPage />} />
      <Route path="create-request" element={<CreateRequestPage />} />
      <Route path="request-history" element={<RequestHistoryPage />} />
      <Route path="payment-status" element={<PaymentStatusPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}

function ManagerRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<ManagerDashboard />} />
      <Route path="request-details" element={<ManagerRequestDetailsPage />} />
      <Route path="my-approvals" element={<MyApprovalsPage />} />
      <Route path="history" element={<ApprovedRejectedPage />} />
      <Route path="three-way-matching" element={<ManagerThreeWayMatchingPage />} />
      <Route path="recommended-finance" element={<RecommendedToFinancePage />} />
      <Route path="budgets" element={<ManagerBudgetsPage />} />
      <Route path="rfqs" element={<ManagerRFQsPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}

function FinanceRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<FinanceDashboard />} />
      <Route path="budget" element={<FinanceBudgetPage />} />
      <Route path="purchase-requests" element={<FinancePurchaseRequestsPage />} />
      <Route path="pending-approvals" element={<PendingFinancialApprovalPage />} />
      <Route path="history" element={<ApprovedRejectedPage />} />
      <Route path="three-way-matching" element={<ManagerThreeWayMatchingPage />} />
      <Route path="payments" element={<FinancePaymentsPage />} />
      <Route path="request-details" element={<ManagerRequestDetailsPage />} />
      <Route path="financial-reports" element={<FinancialReportsPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="requests" element={<AdminRequestsPage />} />
      <Route path="vendors" element={<AdminVendorsPage />} />
      <Route path="rfqs" element={<ManagerRFQsPage />} />
      <Route path="quotations" element={<AdminVendorComparisonPage />} />
      <Route path="vendor-comparison" element={<AdminVendorComparisonPage />} />
      <Route path="purchase-orders" element={<AdminRecordsPage />} />
      <Route path="receipts" element={<AdminRecordsPage />} />
      <Route path="contracts" element={<AdminRecordsPage />} />
      <Route path="users" element={<AdminSystemConfigPage />} />
      <Route path="roles-permissions" element={<AdminSystemConfigPage />} />
      <Route path="departments" element={<AdminSystemConfigPage />} />
      <Route path="workflows" element={<AdminSystemConfigPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="profile" element={<SharedProfilePage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}

function VendorRoutes() {
  return (
    <Routes>
      {/* Category & Vendor Selection landing pages */}
      <Route path="categories" element={<VendorCategoriesPage />} />
      <Route path="categories/:categoryId" element={<VendorsInCategoryPage />} />

      {/* Scoped Vendor Portal routes */}
      <Route path="vendor/:vendorId/dashboard" element={<VendorDashboard />} />
      <Route path="vendor/:vendorId/documents" element={<VendorDocumentsPage />} />
      <Route path="vendor/:vendorId/rfqs" element={<VendorRFQsPage />} />
      <Route path="vendor/:vendorId/quotations" element={<VendorQuotationsPage />} />
      <Route path="vendor/:vendorId/purchase-orders" element={<VendorPurchaseOrdersPage />} />
      <Route path="vendor/:vendorId/deliveries" element={<Navigate to="../purchase-orders" replace />} />
      <Route path="vendor/:vendorId/receipts" element={<VendorReceiptsPage />} />
      <Route path="vendor/:vendorId/invoices" element={<VendorInvoicesPage />} />
      <Route path="vendor/:vendorId/payment-status" element={<VendorPaymentStatusPage />} />
      <Route path="vendor/:vendorId/notifications" element={<SharedNotificationsPage />} />
      <Route path="vendor/:vendorId/profile" element={<SharedProfilePage />} />

      {/* Unscoped shortcuts — default to VND-HW-001 or categories */}
      <Route path="dashboard" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/dashboard" replace />} />
      <Route path="documents" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/documents" replace />} />
      <Route path="rfqs" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/rfqs" replace />} />
      <Route path="quotations" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/quotations" replace />} />
      <Route path="purchase-orders" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/purchase-orders" replace />} />
      <Route path="deliveries" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/purchase-orders" replace />} />
      <Route path="receipts" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/receipts" replace />} />
      <Route path="invoices" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/invoices" replace />} />
      <Route path="payment-status" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/payment-status" replace />} />
      <Route path="notifications" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/notifications" replace />} />
      <Route path="profile" element={<Navigate to="/portal/vendor/vendor/VND-HW-001/profile" replace />} />

      <Route path="*" element={<Navigate to="/portal/vendor/categories" replace />} />
    </Routes>
  )
}
