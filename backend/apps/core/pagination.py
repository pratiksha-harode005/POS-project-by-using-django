from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Standard pagination used for all primary data endpoints.
    max_page_size caps the frontend's page_size=10000 requests at 200 records,
    which is orders of magnitude faster for list serialization.
    Portal pages should use page_size=20-50 for best UX.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200   # Hard cap: prevents accidental full-DB fetches


class BulkPagination(PageNumberPagination):
    """
    For admin/reporting endpoints that legitimately need larger datasets.
    Still capped to prevent >500-record serialization penalties.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500
