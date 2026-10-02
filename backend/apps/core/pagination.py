import math
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from rest_framework.pagination import PageNumberPagination


class FastPaginator(Paginator):
    """
    High-performance Paginator that eliminates the redundant remote SQL COUNT(*) round-trip
    when page 1 contains fewer than or equal to per_page items.
    """
    def __init__(self, object_list, per_page, orphans=0, allow_empty_first_page=True):
        super().__init__(object_list, per_page, orphans, allow_empty_first_page)
        self._cached_count = None

    def validate_number(self, number):
        try:
            if isinstance(number, float) and not number.is_integer():
                raise ValueError
            number = int(number)
        except (TypeError, ValueError):
            raise PageNotAnInteger('That page number is not an integer')
        if number < 1:
            raise EmptyPage('That page number is less than 1')
        if number == 1:
            return 1
        if number > self.num_pages:
            raise EmptyPage('That page contains no results')
        return number

    def page(self, number):
        number = self.validate_number(number)
        if number == 1:
            records = list(self.object_list[0:self.per_page + 1])
            if len(records) <= self.per_page:
                self._cached_count = len(records)
                return self._get_page(records, 1, self)
            else:
                return self._get_page(records[:self.per_page], 1, self)
        return super().page(number)

    @property
    def count(self):
        if self._cached_count is not None:
            return self._cached_count
        self._cached_count = super().count
        return self._cached_count

    @property
    def num_pages(self):
        if self._cached_count is not None:
            if self._cached_count == 0 and not self.allow_empty_first_page:
                return 0
            hits = max(1, self._cached_count - self.orphans)
            return math.ceil(hits / self.per_page)
        return super().num_pages


class StandardPagination(PageNumberPagination):
    django_paginator_class = FastPaginator
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000

    def get_page_number(self, request, paginator):
        page_number = request.query_params.get(self.page_query_param, 1)
        if page_number == 'last':
            page_number = paginator.num_pages
        return page_number

