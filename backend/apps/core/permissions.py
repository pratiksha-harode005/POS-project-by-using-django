from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')


IsAdminRole = IsAdminUser


class IsEmployeeRole(permissions.BasePermission):
    """Allows access to Employees, Team Leads, and Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in ['EMPLOYEE', 'TEAM_LEAD', 'ADMIN']
        )


class IsTeamLeadRole(permissions.BasePermission):
    """Allows access strictly to Team Leads and Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in ['TEAM_LEAD', 'ADMIN']
        )


class IsManagerRole(permissions.BasePermission):
    """Allows access strictly to Managers and Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in ['MANAGER', 'ADMIN']
        )


class IsFinanceRole(permissions.BasePermission):
    """Allows access strictly to Finance and Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in ['FINANCE', 'ADMIN']
        )


class IsVendorUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'VENDOR')


class HasRolePermission(permissions.BasePermission):
    """Allows access to specified roles set on the view as `allowed_roles`."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        allowed_roles = getattr(view, 'allowed_roles', [])
        return request.user.role in allowed_roles or request.user.role == 'ADMIN'
