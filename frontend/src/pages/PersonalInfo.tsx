import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { personalAPI } from '../services/api';

type TabType = 'contact' | 'emergency' | 'address';

export function PersonalInfo() {
  const [activeTab, setActiveTab] = useState<TabType>('contact');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: personalInfo, isLoading } = useQuery({
    queryKey: ['personal-info'],
    queryFn: () => personalAPI.getPersonalInfo().then(res => res.data.data),
    onSuccess: (data) => {
      setFormData(data || {});
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      if (activeTab === 'contact') {
        return personalAPI.updatePersonalInfo(data);
      } else if (activeTab === 'emergency') {
        return personalAPI.updateEmergencyContact(data);
      } else {
        return personalAPI.updateAddress(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-info'] });
      setIsEditing(false);
      setSuccessMessage('Information updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const dataToSend: any = {};

    if (activeTab === 'contact') {
      dataToSend.phone = formData.phone;
      dataToSend.alternateEmail = formData.alternateEmail;
      dataToSend.preferredName = formData.preferredName;
    } else if (activeTab === 'emergency') {
      dataToSend.emergencyName = formData.emergencyName;
      dataToSend.emergencyRelation = formData.emergencyRelation;
      dataToSend.emergencyPhone = formData.emergencyPhone;
      dataToSend.emergencyEmail = formData.emergencyEmail;
    } else {
      dataToSend.permanentAddress = formData.permanentAddress;
      dataToSend.mailingAddress = formData.mailingAddress;
      dataToSend.city = formData.city;
      dataToSend.state = formData.state;
      dataToSend.postalCode = formData.postalCode;
      dataToSend.country = formData.country;
    }

    updateMutation.mutate(dataToSend);
  };

  const handleCancel = () => {
    setFormData(personalInfo || {});
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'contact', label: 'Contact Information' },
    { id: 'emergency', label: 'Emergency Contact' },
    { id: 'address', label: 'Address' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Personal Information</h1>
        <p className="mt-2 text-muted-foreground">Manage your contact details and emergency contacts</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-card rounded-lg shadow">
        <div className="border-b border-border">
          <nav className="-mb-px flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsEditing(false);
                  setFormData(personalInfo || {});
                }}
                className={`flex items-center py-4 px-6 text-center text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Contact Information Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Contact Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.user?.fullName || ''}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-md bg-muted/50 text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Contact registrar to change</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preferred Name
                    </label>
                    <input
                      type="text"
                      value={formData.preferredName || ''}
                      onChange={(e) => handleChange('preferredName', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-border rounded-md ${
                        isEditing ? 'bg-white' : 'bg-gray-50'
                      }`}
                      placeholder="Enter preferred name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      University Email
                    </label>
                    <input
                      type="email"
                      value={formData.user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-md bg-muted/50 text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Primary email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Alternate Email
                    </label>
                    <input
                      type="email"
                      value={formData.alternateEmail || ''}
                      onChange={(e) => handleChange('alternateEmail', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-border rounded-md ${
                        isEditing ? 'bg-white' : 'bg-gray-50'
                      }`}
                      placeholder="personal@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-border rounded-md ${
                        isEditing ? 'bg-white' : 'bg-gray-50'
                      }`}
                      placeholder="+86 123-4567-8900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-md bg-muted/50 text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Contact registrar to change</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Gender
                    </label>
                    <input
                      type="text"
                      value={formData.gender || ''}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-md bg-muted/50 text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Contact registrar to change</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={formData.nationality || ''}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-md bg-muted/50 text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Contact registrar to change</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact Tab */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Emergency Contact</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyName || ''}
                      onChange={(e) => handleChange('emergencyName', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-border rounded-md ${
                        isEditing ? 'bg-white' : 'bg-gray-50'
                      }`}
                      placeholder="Full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyRelation || ''}
                      onChange={(e) => handleChange('emergencyRelation', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-border rounded-md ${
                        isEditing ? 'bg-white' : 'bg-gray-50'
                      }`}
                      placeholder="Mother, Father, Spouse, etc."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyPhone || ''}
                      onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-border rounded-md ${
                        isEditing ? 'bg-white' : 'bg-gray-50'
                      }`}
                      placeholder="+86 123-4567-8900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.emergencyEmail || ''}
                      onChange={(e) => handleChange('emergencyEmail', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-border rounded-md ${
                        isEditing ? 'bg-white' : 'bg-gray-50'
                      }`}
                      placeholder="emergency@example.com"
                    />
                  </div>
                </div>

                <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        This contact will be notified in case of emergency. Please ensure the information is accurate and up to date.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Address Information</h3>

                <div className="space-y-6">
                  {/* Permanent Address */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Permanent Address</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Street Address
                        </label>
                        <textarea
                          value={formData.permanentAddress || ''}
                          onChange={(e) => handleChange('permanentAddress', e.target.value)}
                          disabled={!isEditing}
                          rows={2}
                          className={`w-full px-3 py-2 border border-border rounded-md ${
                            isEditing ? 'bg-white' : 'bg-gray-50'
                          }`}
                          placeholder="Enter full address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mailing Address */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Mailing Address</h4>
                    <div className="mb-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                          checked={formData.mailingAddress === formData.permanentAddress}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleChange('mailingAddress', formData.permanentAddress);
                            }
                          }}
                          disabled={!isEditing}
                        />
                        <span className="ml-2 text-sm text-muted-foreground">Same as permanent address</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Street Address
                        </label>
                        <textarea
                          value={formData.mailingAddress || ''}
                          onChange={(e) => handleChange('mailingAddress', e.target.value)}
                          disabled={!isEditing}
                          rows={2}
                          className={`w-full px-3 py-2 border border-border rounded-md ${
                            isEditing ? 'bg-white' : 'bg-gray-50'
                          }`}
                          placeholder="Enter mailing address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* City, State, Postal Code, Country */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-border rounded-md ${
                          isEditing ? 'bg-white' : 'bg-gray-50'
                        }`}
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-border rounded-md ${
                          isEditing ? 'bg-white' : 'bg-gray-50'
                        }`}
                        placeholder="State/Province"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode || ''}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-border rounded-md ${
                          isEditing ? 'bg-white' : 'bg-gray-50'
                        }`}
                        placeholder="Postal Code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={(e) => handleChange('country', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-border rounded-md ${
                          isEditing ? 'bg-white' : 'bg-gray-50'
                        }`}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-end space-x-4">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Information
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
