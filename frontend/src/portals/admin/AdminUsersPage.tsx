import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  X,
  Eye,
  Briefcase
} from 'lucide-react';
import { apiClient } from '../../api/client';

export interface UserRecord {
  id: string;
  rawId?: number;
  name: string;
  username?: string;
  email: string;
  role: 'TEAM_LEAD' | 'MANAGER' | 'FINANCE' | 'VENDOR' | 'ADMIN';
  department: string;
  departmentId?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLogin: string;
  avatar?: string;
  phone?: string;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [dbDepartments, setDbDepartments] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserRecord | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  // New user form state
  const [newUser, setNewUser] = useState<Partial<UserRecord>>({
    role: 'TEAM_LEAD',
    department: 'Engineering',
    status: 'ACTIVE'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [uRes, dRes] = await Promise.allSettled([
        apiClient.get('/users/'),
        apiClient.get('/departments/')
      ]);

      if (dRes.status === 'fulfilled') {
        const dData = Array.isArray(dRes.value.data) ? dRes.value.data : (dRes.value.data?.results || []);
        setDbDepartments(dData);
      }

      if (uRes.status === 'fulfilled') {
        const uData = Array.isArray(uRes.value.data) ? uRes.value.data : (uRes.value.data?.results || []);
        const mapped: UserRecord[] = uData.map((u: any) => {
          const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
          return {
            id: `USR-${u.id}`,
            rawId: u.id,
            name: fullName,
            username: u.username,
            email: u.email || `${u.username}@kss.com`,
            role: (u.role || 'TEAM_LEAD') as any,
            department: u.department_detail?.name || 'General',
            departmentId: u.department || null,
            status: u.is_active ? 'ACTIVE' : 'INACTIVE',
            createdAt: u.date_joined ? u.date_joined.split('T')[0] : '2026-01-01',
            lastLogin: u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Active Session',
            phone: u.phone || '+91 98765 43210'
          };
        });
        setUsers(mapped);
      }
    } catch (err) {
      console.warn('Failed to load users from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const departments = useMemo(() => {
    const list = Array.from(new Set(users.map(u => u.department))).filter(Boolean);
    return list.length > 0 ? list : dbDepartments.map(d => d.name);
  }, [users, dbDepartments]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;
      const matchesDept = selectedDepartment === 'ALL' || user.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'ALL' || user.status === selectedStatus;

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, searchTerm, selectedRole, selectedDepartment, selectedStatus]);

  const toggleUserStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setUsers(prev =>
      prev.map(u => (u.id === id ? { ...u, status: newStatus } : u))
    );
    const rawId = (user as any).rawId || id.replace(/^USR-/, '');
    try {
      await apiClient.patch(`/users/${rawId}/`, { is_active: newStatus === 'ACTIVE' });
    } catch (err) {
      console.warn('Failed to update user status in PostgreSQL:', err);
      fetchUsers();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    const nameParts = (newUser.name || '').trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    const baseUsername = newUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || `user_${Date.now()}`;

    const selectedDeptObj = dbDepartments.find(d => d.name === newUser.department);

    try {
      const res = await apiClient.post('/users/', {
        username: baseUsername,
        first_name: firstName,
        last_name: lastName,
        email: newUser.email,
        role: newUser.role || 'TEAM_LEAD',
        department: selectedDeptObj ? selectedDeptObj.id : null,
        phone: newUser.phone || '',
        is_active: newUser.status === 'ACTIVE',
        password: 'password123'
      });

      const u = res.data;
      const created: UserRecord = {
        id: `USR-${u.id}`,
        rawId: u.id,
        name: `${u.first_name} ${u.last_name}`.trim() || u.username,
        email: u.email,
        role: u.role,
        department: u.department_detail?.name || newUser.department || 'General',
        status: u.is_active ? 'ACTIVE' : 'INACTIVE',
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: 'Never',
        phone: u.phone || '+91 99999 00000'
      };

      setUsers(prev => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewUser({ role: 'TEAM_LEAD', department: dbDepartments[0]?.name || 'Engineering', status: 'ACTIVE' });
    } catch (err) {
      console.error('Failed to create user in PostgreSQL:', err);
      alert('Could not save user to PostgreSQL. Check console for details.');
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUsers(prev => prev.map(u => (u.id === editingUser.id ? editingUser : u)));
    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this user from the system?')) {
      const user = users.find(u => u.id === id);
      setUsers(prev => prev.filter(u => u.id !== id));
      if (user) {
        const rawId = (user as any).rawId || id.replace(/^USR-/, '');
        try {
          await apiClient.delete(`/users/${rawId}/`);
        } catch (err) {
          console.warn('Failed to delete user in PostgreSQL:', err);
          fetchUsers();
        }
      }
    }
  };

  const getRoleBadge = (role: UserRecord['role']) => {
    switch (role) {
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FINANCE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'TEAM_LEAD':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'VENDOR':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            User Management Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage organizational staff, departmental leads, finance personnel, and external vendor accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Provision New User
          </button>
        </div>
      </div>

      {/* Summary Stats (Only Operational User Roles - No Admin in list) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Managers</span>
          <p className="text-2xl font-bold text-blue-900 mt-1">{users.filter(u => u.role === 'MANAGER').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Finance</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{users.filter(u => u.role === 'FINANCE').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Team Leads</span>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{users.filter(u => u.role === 'TEAM_LEAD').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Vendors</span>
          <p className="text-2xl font-bold text-amber-900 mt-1">{users.filter(u => u.role === 'VENDOR').length}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by User ID, Name, Email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="MANAGER">Manager</option>
            <option value="FINANCE">Finance</option>
            <option value="TEAM_LEAD">Team Lead</option>
            <option value="VENDOR">Vendor</option>
          </select>

          <select
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {user.name}
                            <span className="text-xs text-slate-400 font-normal">({user.id})</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-700 text-xs flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {user.department}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {user.status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 text-xs">{user.createdAt}</td>

                    <td className="py-3 px-4 text-slate-500 text-xs">{user.lastLogin}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingUser(user)}
                          title="View Profile"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          title="Edit User"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          title={user.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                          className={`p-1.5 rounded-lg transition ${
                            user.status === 'ACTIVE'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {user.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg border border-indigo-200">
                  {viewingUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{viewingUser.name}</h3>
                  <p className="text-xs text-slate-500">{viewingUser.id} • Registered Member</p>
                </div>
              </div>
              <button onClick={() => setViewingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Official Email:</span>
                <span className="font-medium text-slate-800">{viewingUser.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Contact Number:</span>
                <span className="font-medium text-slate-800">{viewingUser.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">System Role:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getRoleBadge(viewingUser.role)}`}>
                  {viewingUser.role}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Department:</span>
                <span className="font-medium text-slate-800">{viewingUser.department}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Account Status:</span>
                <span
                  className={`font-semibold ${viewingUser.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-500'}`}
                >
                  {viewingUser.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Account Created:</span>
                <span className="text-slate-700">{viewingUser.createdAt}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Last System Activity:</span>
                <span className="text-slate-700">{viewingUser.lastLogin}</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit User Profile: {editingUser.name}</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="py-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TEAM_LEAD">Team Lead</option>
                  <option value="MANAGER">Manager</option>
                  <option value="FINANCE">Finance</option>
                  <option value="VENDOR">Vendor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={editingUser.department}
                  onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingUser.status}
                  onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision New User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Provision New User
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="py-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newUser.name || ''}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh.kumar@enterprise.in"
                  value={newUser.email || ''}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="MANAGER">Manager</option>
                    <option value="FINANCE">Finance</option>
                    <option value="VENDOR">Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newUser.status}
                    onChange={e => setNewUser({ ...newUser, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering & IT Infra"
                  value={newUser.department || ''}
                  onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={newUser.phone || ''}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
