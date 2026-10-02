from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter
from apps.rfq_management.views import QuotationViewSet

quotations_alias_router = DefaultRouter()
quotations_alias_router.register(r'', QuotationViewSet, basename='rfq-quotations-alias')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/departments/', include('apps.users.urls')),
    path('api/requests/', include('apps.request_management.urls')),
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
