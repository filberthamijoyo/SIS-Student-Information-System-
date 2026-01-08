import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Save, Loader2, User, Phone, Mail, MapPin, Calendar, Shield } from 'lucide-react';
import { adminAPI } from '../../services/api';

interface EditStudentPersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
}

type TabType = 'contact' | 'emergency' | 'address';

export function EditStudentPersonalInfoModal({ isOpen, onClose, studentId }: EditStudentPersonalInfoModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('contact');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch student personal info
  const { data: personalInfoData, isLoading } = useQuery({
    queryKey: ['admin-student-personal-info', studentId],
    queryFn: () => adminAPI.getStudentPersonalInfo(studentId).then(res => res.data.data),
    enabled: isOpen && !!studentId,
    onSuccess: (data) => {
      setFormData(data || {});
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateStudentPersonalInfo(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-student-personal-info', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      setIsEditing(false);
      setSuccessMessage('Personal information updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update personal information';
      setErrors({ general: errorMessage });
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = () => {
    // Save ALL fields from ALL tabs, not just the active tab
    const dataToSend: any = {};
    
    // Contact info fields
    if (formData.phone_number !== undefined) dataToSend.phoneNumber = formData.phone_number;
    if (formData.alternate_phone !== undefined) dataToSend.alternatePhone = formData.alternate_phone;
    if (formData.date_of_birth !== undefined) dataToSend.dateOfBirth = formData.date_of_birth;
    if (formData.gender !== undefined) dataToSend.gender = formData.gender;
    if (formData.nationality !== undefined) dataToSend.nationality = formData.nationality;
    if (formData.id_number !== undefined) dataToSend.idNumber = formData.id_number;
    if (formData.high_school !== undefined) dataToSend.highSchool = formData.high_school;
    if (formData.high_school_grad !== undefined) dataToSend.highSchoolGrad = formData.high_school_grad;
    
    // Emergency contact fields
    if (formData.emergency_name !== undefined) dataToSend.emergencyName = formData.emergency_name;
    if (formData.emergency_relation !== undefined) dataToSend.emergencyRelation = formData.emergency_relation;
    if (formData.emergency_phone !== undefined) dataToSend.emergencyPhone = formData.emergency_phone;
    if (formData.emergency_email !== undefined) dataToSend.emergencyEmail = formData.emergency_email;
    
    // Address fields
    if (formData.permanent_address !== undefined) dataToSend.permanentAddress = formData.permanent_address;
    if (formData.mailing_address !== undefined) dataToSend.mailingAddress = formData.mailing_address;
    if (formData.city !== undefined) dataToSend.city = formData.city;
    if (formData.state !== undefined) dataToSend.state = formData.state;
    if (formData.postal_code !== undefined) dataToSend.postalCode = formData.postal_code;
    if (formData.country !== undefined) dataToSend.country = formData.country;

    updateMutation.mutate(dataToSend);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(personalInfoData || {});
    setErrors({});
  };

  if (!isOpen) return null;

  const student = personalInfoData?.student;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 dark:bg-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-white" />
              <div>
                <h3 className="text-lg font-semibold text-white">Edit Student Personal Information</h3>
                {student && (
                  <p className="text-sm text-blue-100">
                    {student.user?.full_name} ({student.studentId})
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {successMessage && (
                  <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 rounded">
                    {successMessage}
                  </div>
                )}

                {errors.general && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
                    {errors.general}
                  </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => {
                        setActiveTab('contact');
                        setIsEditing(false);
                      }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'contact'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Contact Info
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('emergency');
                        setIsEditing(false);
                      }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'emergency'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Emergency Contact
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('address');
                        setIsEditing(false);
                      }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'address'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address
                      </div>
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                  {activeTab === 'contact' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={formData.phone_number || ''}
                            onChange={(e) => handleChange('phone_number', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alternate Phone
                          </label>
                          <input
                            type="tel"
                            value={formData.alternate_phone || ''}
                            onChange={(e) => handleChange('alternate_phone', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleChange('date_of_birth', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Gender
                          </label>
                          <select
                            value={formData.gender || ''}
                            onChange={(e) => handleChange('gender', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          >
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nationality
                          </label>
                          <input
                            type="text"
                            value={formData.nationality || ''}
                            onChange={(e) => handleChange('nationality', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ID Number
                          </label>
                          <input
                            type="text"
                            value={formData.id_number || ''}
                            onChange={(e) => handleChange('id_number', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            High School
                          </label>
                          <input
                            type="text"
                            value={formData.high_school || ''}
                            onChange={(e) => handleChange('high_school', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            High School Graduation Date
                          </label>
                          <input
                            type="date"
                            value={formData.high_school_grad ? new Date(formData.high_school_grad).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleChange('high_school_grad', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'emergency' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Emergency Contact Name
                          </label>
                          <input
                            type="text"
                            value={formData.emergency_name || ''}
                            onChange={(e) => handleChange('emergency_name', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Relation
                          </label>
                          <input
                            type="text"
                            value={formData.emergency_relation || ''}
                            onChange={(e) => handleChange('emergency_relation', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Emergency Phone
                          </label>
                          <input
                            type="tel"
                            value={formData.emergency_phone || ''}
                            onChange={(e) => handleChange('emergency_phone', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Emergency Email
                          </label>
                          <input
                            type="email"
                            value={formData.emergency_email || ''}
                            onChange={(e) => handleChange('emergency_email', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'address' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Permanent Address
                          </label>
                          <textarea
                            value={formData.permanent_address || ''}
                            onChange={(e) => handleChange('permanent_address', e.target.value)}
                            disabled={!isEditing}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mailing Address
                          </label>
                          <textarea
                            value={formData.mailing_address || ''}
                            onChange={(e) => handleChange('mailing_address', e.target.value)}
                            disabled={!isEditing}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.city || ''}
                            onChange={(e) => handleChange('city', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            State/Province
                          </label>
                          <input
                            type="text"
                            value={formData.state || ''}
                            onChange={(e) => handleChange('state', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            value={formData.postal_code || ''}
                            onChange={(e) => handleChange('postal_code', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={formData.country || ''}
                            onChange={(e) => handleChange('country', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={updateMutation.isPending}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




