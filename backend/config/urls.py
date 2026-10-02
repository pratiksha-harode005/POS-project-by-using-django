from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def api_root(request):
    return JsonResponse({
        "status": "online",
        "service": "KSS Procurement OS REST API Backend",
        "version": "1.0.0",
        "frontend_url": "http://localhost:5173/",
        "admin_panel": "/admin/",
        "endpoints": {
            "auth": "/api/auth/login/",
            "users": "/api/users/",
            "requests": "/api/requests/",
            "team_lead_requests": "/api/team-lead/requests/",
            "manager_requests": "/api/manager/requests/",
            "finance_requests": "/api/finance/requests/",
            "admin_requests": "/api/admin/requests/",
            "vendors": "/api/vendors/",
            "rfq": "/api/rfq/",
            "procurement": "/api/procurement/",
            "invoices": "/api/invoices/",
            "payments": "/api/payments/",
            "budgets": "/api/budgets/allocations/",
            "notifications": "/api/notifications/"
        }
    })


from rest_framework.routers import DefaultRouter
from apps.rfq_management.views import QuotationViewSet

quotations_alias_router = DefaultRouter()
quotations_alias_router.register(r'', QuotationViewSet, basename='rfq-quotations-alias')

urlpatterns = [
    path('', api_root, name='api-root-index'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/departments/', include('apps.users.urls')),
    path('api/requests/', include('apps.request_management.urls')),
    path('api/team-lead/requests/', include('apps.request_management.teamlead_urls')),
    path('api/manager/requests/', include('apps.request_management.manager_urls')),
    path('api/finance/requests/', include('apps.request_management.finance_urls')),
    path('api/admin/requests/', include('apps.request_management.admin_urls')),
    path('api/vendors/', include('apps.vendor_management.urls')),
    path('api/rfq/', include('apps.rfq_management.urls')),
    path('api/rfq-quotations/', include(quotations_alias_router.urls)),
    path('api/procurement/', include('apps.procurement.urls')),
    path('api/invoices/', include('apps.invoice_management.urls')),
    path('api/payments/', include('apps.payment_management.urls')),
    path('api/budgets/', include('apps.budget_management.urls')),
    path('api/budget/', include('apps.budget_management.urls')),
    path('api/notifications/', include('apps.notification_management.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
