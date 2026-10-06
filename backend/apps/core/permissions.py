from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = str(getattr(request.user, 'role', '')).upper()
        return role == 'ADMIN' or request.user.is_superuser or request.user.is_staff


IsAdminRole = IsAdminUser


class IsEmployeeRole(permissions.BasePermission):
    """Allows access to Employees, Team Leads, and Admins."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = str(getattr(request.user, 'role', '')).upper()
        return role in ['EMPLOYEE', 'TEAM_LEAD', 'ADMIN'] or request.user.is_superuser or request.user.is_staff


class IsTeamLeadRole(permissions.BasePermission):
    """Allows access to Team Leads, Managers, and Admins."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = str(getattr(request.user, 'role', '')).upper()
        return role in ['TEAM_LEAD', 'MANAGER', 'ADMIN'] or request.user.is_superuser or request.user.is_staff


class IsManagerRole(permissions.BasePermission):
    """Allows access strictly to Managers and Admins."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = str(getattr(request.user, 'role', '')).upper()
        return role in ['MANAGER', 'ADMIN'] or request.user.is_superuser or request.user.is_staff


class IsFinanceRole(permissions.BasePermission):
    """Allows access strictly to Finance and Admins."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = str(getattr(request.user, 'role', '')).upper()
        return role in ['FINANCE', 'ADMIN'] or request.user.is_superuser or request.user.is_staff


class IsVendorUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = str(getattr(request.user, 'role', '')).upper()
        return role == 'VENDOR' or request.user.is_superuser or request.user.is_staff


class HasRolePermission(permissions.BasePermission):
    """Allows access to specified roles set on the view as `allowed_roles`."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        allowed_roles = getattr(view, 'allowed_roles', [])
        return request.user.role in allowed_roles or request.user.role == 'ADMIN'
