import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Download,
  Mail,
  User,
  GraduationCap,
} from 'lucide-react';
import api from '../../services/api';
import { CreateStudentModal } from '../../components/admin/CreateStudentModal';
import { EditStudentModal } from '../../components/admin/EditStudentModal';
import { EditStudentPersonalInfoModal } from '../../components/admin/EditStudentPersonalInfoModal';
import { UserCircle } from 'lucide-react';

interface User {
  id: number;
  userIdentifier: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMINISTRATOR';
  major?: string;
  yearLevel?: number;
  department?: string;
  createdAt: string;
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editingPersonalInfoStudentId, setEditingPersonalInfoStudentId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin-users', roleFilter],
    queryFn: async () => {
      const params = roleFilter !== 'ALL' ? { role: roleFilter } : {};
      const response = await api.get('/admin/users', { params });
      return response.data.data;
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.userIdentifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return <GraduationCap className="h-4 w-4" />;
      case 'INSTRUCTOR':
        return <User className="h-4 w-4" />;
      case 'ADMINISTRATOR':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      STUDENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      INSTRUCTOR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      ADMINISTRATOR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[role as keyof typeof styles]
        }`}
      >
        {getRoleIcon(role)}
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all user accounts in the system
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create User
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="INSTRUCTOR">Instructors</option>
              <option value="ADMINISTRATOR">Administrators</option>
            </select>
          </div>

          {/* Export */}
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Showing {filteredUsers?.length || 0} of {users?.length || 0} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Major/Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers?.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {user.fullName}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {user.userIdentifier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {user.major || user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {user.yearLevel || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {user.role === 'STUDENT' && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  // Fetch all students and find the one matching this user
                                  const studentsRes = await api.get('/admin/students');
                                  const students = studentsRes.data.data || [];
                                  const student = students.find((s: any) => 
                                    s.users?.id === user.id || 
                                    s.user?.id === user.id ||
                                    s.user_id === user.id
                                  );
                                  if (student) {
                                    setEditingStudentId(student.id);
                                  }
                                } catch (error) {
                                  console.error('Error fetching student ID:', error);
                                }
                              }}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                              title="Edit student"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  // Fetch all students and find the one matching this user
                                  const studentsRes = await api.get('/admin/students');
                                  const students = studentsRes.data.data || [];
                                  const student = students.find((s: any) => 
                                    s.users?.id === user.id || 
                                    s.user?.id === user.id ||
                                    s.user_id === user.id
                                  );
                                  if (student) {
                                    setEditingPersonalInfoStudentId(student.id);
                                  }
                                } catch (error) {
                                  console.error('Error fetching student ID:', error);
                                }
                              }}
                              className="p-2 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg transition-colors"
                              title="Edit personal info"
                            >
                              <UserCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </button>
                          </>
                        )}
                        <button
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers?.length === 0 && (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No users found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Student Modal */}
      <CreateStudentModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      
      {/* Edit Student Modal */}
      {editingStudentId && (
        <EditStudentModal
          isOpen={!!editingStudentId}
          onClose={() => setEditingStudentId(null)}
          studentId={editingStudentId}
        />
      )}

      {/* Edit Student Personal Info Modal */}
      {editingPersonalInfoStudentId && (
        <EditStudentPersonalInfoModal
          isOpen={!!editingPersonalInfoStudentId}
          onClose={() => setEditingPersonalInfoStudentId(null)}
          studentId={editingPersonalInfoStudentId}
        />
      )}
    </div>
  );
}
