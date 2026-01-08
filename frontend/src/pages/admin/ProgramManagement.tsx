import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  BookOpen,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api, { adminAPI } from '../../services/api';
import { Modal, ModalFooter } from '../../components/ui/Modal';

interface Requirement {
  id: number;
  category: string;
  name: string;
  credits: number;
  description?: string;
}

interface Program {
  id: number;
  code: string;
  name: string;
  department: string;
  degree: string;
  totalCredits: number;
  description?: string;
  requirements?: Requirement[];
  studentCount?: number;
}

export function ProgramManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProgram, setExpandedProgram] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const queryClient = useQueryClient();

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ['admin-programs'],
    queryFn: async () => {
      const response = await api.get('/admin/programs');
      return response.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminAPI.updateProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      setEditingProgram(null);
    },
  });

  const filteredPrograms = programs?.filter(
    (program) =>
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (programId: number) => {
    setExpandedProgram(expandedProgram === programId ? null : programId);
  };

  const getDegreeBadge = (degree: string) => {
    const styles = {
      BACHELOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      MASTER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      DOCTORATE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[degree as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {degree}
      </span>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      CORE: 'text-blue-600 dark:text-blue-400',
      MAJOR: 'text-purple-600 dark:text-purple-400',
      ELECTIVE: 'text-green-600 dark:text-green-400',
      GENERAL_ED: 'text-orange-600 dark:text-orange-400',
      OTHER: 'text-gray-600 dark:text-gray-400',
    };
    return colors[category as keyof typeof colors] || colors.OTHER;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Program Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage academic programs and degree requirements
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Program
        </button>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search programs by name, code, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Showing {filteredPrograms?.length || 0} of {programs?.length || 0} programs
        </div>
      </div>

      {/* Programs List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrograms?.map((program) => {
            const isExpanded = expandedProgram === program.id;
            return (
              <div
                key={program.id}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                {/* Program Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">
                          {program.name}
                        </h3>
                        {getDegreeBadge(program.degree)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono">{program.code}</span>
                        <span>•</span>
                        <span>{program.department}</span>
                        <span>•</span>
                        <span>{program.totalCredits} Credits Required</span>
                        {program.studentCount !== undefined && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {program.studentCount} Students
                            </span>
                          </>
                        )}
                      </div>
                      {program.description && (
                        <p className="mt-3 text-sm text-foreground">{program.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleExpand(program.id)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand requirements'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingProgram(program)}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                        title="Edit program"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                        title="Delete program"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Requirements (Expanded) */}
                {isExpanded && program.requirements && (
                  <div className="border-t border-border bg-muted/30 p-6">
                    <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Degree Requirements
                    </h4>

                    <div className="space-y-3">
                      {program.requirements.map((req) => (
                        <div
                          key={req.id}
                          className="bg-card border border-border rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-sm font-semibold ${getCategoryColor(
                                    req.category
                                  )}`}
                                >
                                  {req.category.replace(/_/g, ' ')}
                                </span>
                                <h5 className="font-medium text-foreground">{req.name}</h5>
                              </div>
                              {req.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {req.description}
                                </p>
                              )}
                            </div>
                            <div className="ml-4 text-right">
                              <div className="text-sm font-semibold text-foreground">
                                {req.credits} Credits
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {program.requirements.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="mx-auto h-12 w-12 opacity-50" />
                        <p className="mt-2 text-sm">No requirements defined yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredPrograms?.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No programs found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search criteria
          </p>
        </div>
      )}

      {/* Edit Program Modal */}
      {editingProgram && (
        <EditProgramModal
          program={editingProgram}
          isOpen={!!editingProgram}
          onClose={() => setEditingProgram(null)}
          onSave={(data) => {
            updateMutation.mutate({ id: editingProgram.id, data });
          }}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Edit Program Modal Component
interface EditProgramModalProps {
  program: Program;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}

function EditProgramModal({
  program,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: EditProgramModalProps) {
  const [formData, setFormData] = useState({
    name: program.name || '',
    description: program.description || '',
    total_credits: program.totalCredits || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Program"
      description="Update program information"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Program Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Total Credits Required <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.total_credits}
            onChange={(e) =>
              setFormData({ ...formData, total_credits: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Program Details (Read-only)</p>
          <div className="space-y-1">
            <p>Code: {program.code}</p>
            <p>Department: {program.department}</p>
            <p>Degree: {program.degree}</p>
          </div>
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
