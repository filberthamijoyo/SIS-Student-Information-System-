import React, { useState, useEffect } from 'react';
import { majorChangeService } from '../services/majorChangeService';
import { academicAPI } from '../services/api';
import type { MajorChangeRequest as MajorChange } from '../types';
import { FileAttachment } from './FileAttachment';

interface MajorChangeRequestProps {
  currentUser: {
    id: number;
    fullName: string;
    major?: string;
    department?: string;
    yearLevel?: number;
  };
}

interface Major {
  code: string;
  name: string;
  school: string;
}

const AVAILABLE_MAJORS: Major[] = [
  { code: 'CS', name: 'Computer Science', school: 'School of Science and Engineering' },
  { code: 'DS', name: 'Data Science', school: 'School of Science and Engineering' },
  { code: 'EE', name: 'Electrical Engineering', school: 'School of Science and Engineering' },
  { code: 'MATH', name: 'Mathematics', school: 'School of Science and Engineering' },
  { code: 'ECON', name: 'Economics', school: 'School of Management and Economics' },
  { code: 'FIN', name: 'Finance', school: 'School of Management and Economics' },
  { code: 'MKTG', name: 'Marketing', school: 'School of Management and Economics' },
];

const MajorChangeRequest: React.FC<MajorChangeRequestProps> = ({ currentUser }) => {
  const [myRequests, setMyRequests] = useState<MajorChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [requestedMajor, setRequestedMajor] = useState('');
  const [requestedSchool, setRequestedSchool] = useState('');
  const [currentSchool, setCurrentSchool] = useState('');
  const [gpa, setGpa] = useState('');
  const [unitsCompleted, setUnitsCompleted] = useState('');
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadMyRequests();
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch GPA
      try {
        const gpaResponse = await academicAPI.getGPA();
        if (gpaResponse.data.success && gpaResponse.data.data) {
          const gpaValue = gpaResponse.data.data.cumulativeGPA || 0;
          setGpa(gpaValue.toFixed(2));
        }
      } catch (err) {
        console.error('Failed to load GPA:', err);
      }

      // Note: Progress/units completed removed - planning feature deprecated

      // Set current school from user's department or major
      // Map major to school based on AVAILABLE_MAJORS
      if (currentUser.major) {
        const currentMajorInfo = AVAILABLE_MAJORS.find(m => m.name === currentUser.major);
        if (currentMajorInfo) {
          setCurrentSchool(currentMajorInfo.school);
        } else if (currentUser.department) {
          // Fallback to department if major not found in list
          setCurrentSchool(currentUser.department);
        }
      } else if (currentUser.department) {
        setCurrentSchool(currentUser.department);
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      const requests = await majorChangeService.getMyRequests(currentUser.id);
      setMyRequests(requests);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMajorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMajor = AVAILABLE_MAJORS.find(m => m.name === e.target.value);
    if (selectedMajor) {
      setRequestedMajor(selectedMajor.name);
      setRequestedSchool(selectedMajor.school);
    }
  };

  const isEligible = (): { eligible: boolean; reason: string } => {
    const gpaNum = parseFloat(gpa);
    const unitsNum = parseInt(unitsCompleted);

    if (isNaN(gpaNum) || isNaN(unitsNum)) {
      return { eligible: false, reason: 'Please enter valid GPA and units completed' };
    }

    if (gpaNum >= 3.0) {
      return { eligible: true, reason: 'Meets GPA requirement (≥ 3.0)' };
    }

    if (unitsNum >= 6) {
      return { eligible: true, reason: 'Meets units requirement (≥ 6 units completed)' };
    }

    return {
      eligible: false,
      reason: 'Must have GPA ≥ 3.0 OR ≥ 6 units completed'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!requestedMajor || !requestedSchool) {
      setError('Please select a major');
      return;
    }

    if (requestedMajor === currentUser.major) {
      setError('Selected major is the same as your current major');
      return;
    }

    const gpaNum = parseFloat(gpa);
    const unitsNum = parseInt(unitsCompleted);

    if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4.0) {
      setError('Please enter a valid GPA (0.00 - 4.00)');
      return;
    }

    if (isNaN(unitsNum) || unitsNum < 0) {
      setError('Please enter valid units completed');
      return;
    }

    try {
      setLoading(true);
      await majorChangeService.submitRequest({
        student_id: currentUser.id,
        requested_major: requestedMajor,
        requested_school: requestedSchool,
        gpa: gpaNum,
        units_completed: unitsNum,
        supporting_documents: supportingFile ? supportingFile.name : undefined
      });

      setSuccess('Major change request submitted successfully!');
      // Reset form
      setRequestedMajor('');
      setRequestedSchool('');
      setGpa('');
      setUnitsCompleted('');
      setSupportingFile(null);
      loadMyRequests();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const eligibility = isEligible();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Major Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Current Major</label>
            <p className="mt-1 text-lg font-medium text-gray-900">{currentUser.major || 'Not declared'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Current School</label>
            <p className="mt-1 text-lg font-medium text-gray-900">{currentUser.department || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Year Level</label>
            <p className="mt-1 text-lg font-medium text-gray-900">Year {currentUser.yearLevel || 1}</p>
          </div>
        </div>
      </div>

      {/* Request Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Major Change Request</h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Major Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requested Major <span className="text-red-500">*</span>
              </label>
              <select
                value={requestedMajor}
                onChange={handleMajorSelect}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a major...</option>
                {AVAILABLE_MAJORS.filter(m => m.name !== currentUser.major).map((major) => (
                  <option key={major.code} value={major.name}>
                    {major.name} ({major.school})
                  </option>
                ))}
              </select>
            </div>

            {/* Current School (auto-filled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current School <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={currentSchool}
                readOnly
                disabled={loadingData}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                placeholder={loadingData ? 'Loading...' : 'N/A'}
              />
            </div>

            {/* Requested School (auto-filled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requested School
              </label>
              <input
                type="text"
                value={requestedSchool}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>

            {/* GPA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current GPA <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4.00"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                required
                disabled={loadingData}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                placeholder={loadingData ? 'Loading...' : '0.00'}
              />
              <p className="text-xs text-gray-500 mt-1">Your current GPA (automatically filled)</p>
            </div>

            {/* Units Completed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Units Completed <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={unitsCompleted}
                onChange={(e) => setUnitsCompleted(e.target.value)}
                required
                disabled={loadingData}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                placeholder={loadingData ? 'Loading...' : '0'}
              />
              <p className="text-xs text-gray-500 mt-1">Total units completed (automatically filled)</p>
            </div>

            {/* Eligibility Checker */}
            {gpa && unitsCompleted && (
              <div className={`p-4 rounded-lg ${eligibility.eligible ? 'bg-green-50 border-l-4 border-green-500' : 'bg-yellow-50 border-l-4 border-yellow-500'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {eligibility.eligible ? (
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${eligibility.eligible ? 'text-green-800' : 'text-yellow-800'}`}>
                      {eligibility.eligible ? 'Eligible for Major Change' : 'Eligibility Check'}
                    </h3>
                    <p className={`text-sm mt-1 ${eligibility.eligible ? 'text-green-700' : 'text-yellow-700'}`}>
                      {eligibility.reason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Supporting Documents */}
            <FileAttachment
              label="Supporting Documents (optional)"
              value={supportingFile}
              onChange={setSupportingFile}
              maxSizeMB={10}
              helperText="Upload any supporting documents for your major change request (PDF, DOC, DOCX, images)"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Major Change Request'}
            </button>
          </div>
        </form>
      </div>

      {/* Request History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Request History</h3>
          <button
            onClick={loadMyRequests}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          {myRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No previous requests found</p>
          ) : (
            myRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">
                      {request.current_major} → {request.requested_major}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {request.current_school} → {request.requested_school}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">GPA:</span>
                    <span className="ml-2 font-medium text-gray-900">{request.gpa.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Units:</span>
                    <span className="ml-2 font-medium text-gray-900">{request.units_completed}</span>
                  </div>
                </div>

                {request.supporting_documents && (
                  <div className="mb-3 bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Supporting Documents:</span> {request.supporting_documents}
                    </p>
                  </div>
                )}

                {request.approval_decision && (
                  <div className={`mb-3 rounded p-3 ${request.status === 'APPROVED' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                    <p className={`text-sm ${request.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                      <span className="font-medium">Decision:</span> {request.approval_decision}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                  <span>Submitted: {new Date(request.request_date).toLocaleDateString()}</span>
                  {request.decision_date && (
                    <span>Decided: {new Date(request.decision_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MajorChangeRequest;
