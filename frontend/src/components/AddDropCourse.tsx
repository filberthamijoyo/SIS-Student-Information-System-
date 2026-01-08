import React, { useState, useEffect } from 'react';
import { addDropService } from '../services/addDropService';
import { academicCalendarService } from '../services/academicCalendarService';
import { courseAPI, enrollmentAPI } from '../services/api';
import type { AddDropRequest } from '../types';

interface Course {
  id: number;
  course_code: string;
  course_name: string;
  department: string;
  credits: number;
  max_capacity: number;
  current_enrollment: number;
  instructor_id?: number;
  semester: string;
  year: number;
}

interface AddDropCourseProps {
  currentUser: {
    id: number;
    fullName: string;
    major?: string;
    yearLevel?: number;
  };
  initialTab?: TabType;
}

type TabType = 'add' | 'drop' | 'requests';

const AddDropCourse: React.FC<AddDropCourseProps> = ({ currentUser, initialTab = 'add' }) => {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [myRequests, setMyRequests] = useState<AddDropRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addDropOpen, setAddDropOpen] = useState(false);

  // Add course form state
  const [selectedAddCourse, setSelectedAddCourse] = useState<number | null>(null);
  const [addReason, setAddReason] = useState('');

  // Drop course form state
  const [selectedDropCourse, setSelectedDropCourse] = useState<number | null>(null);
  const [dropReason, setDropReason] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAddDropStatus();
    loadMyRequests();
    loadCourses();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const checkAddDropStatus = async () => {
    try {
      const status = await academicCalendarService.getAddDropStatus();
      setAddDropOpen(status.isOpen);
    } catch (err) {
      console.error('Failed to check add/drop status:', err);
    }
  };

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      const requests = await addDropService.getMyRequests();
      setMyRequests(requests);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setError('Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      // Fetch available courses
      const coursesResponse = await courseAPI.getAll();
      setAvailableCourses(coursesResponse.data.data || []);

      // Fetch enrolled courses
      const enrolledResponse = await enrollmentAPI.getMyCourses();
      setEnrolledCourses(enrolledResponse.data.data || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const handleSubmitAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddCourse || !addReason.trim()) {
      setError('Please select a course and provide a reason');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await addDropService.submitRequest({
        student_id: currentUser.id,
        course_id: selectedAddCourse,
        request_type: 'ADD',
        reason: addReason,
        is_late_request: !addDropOpen
      });
      setSuccess('Add request submitted successfully!');
      setAddReason('');
      setSelectedAddCourse(null);
      loadMyRequests();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDropRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDropCourse || !dropReason.trim()) {
      setError('Please select a course and provide a reason');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await addDropService.submitRequest({
        student_id: currentUser.id,
        course_id: selectedDropCourse,
        request_type: 'DROP',
        reason: dropReason,
        is_late_request: !addDropOpen
      });
      setSuccess('Drop request submitted successfully!');
      setDropReason('');
      setSelectedDropCourse(null);
      loadMyRequests();
      setTimeout(() => setSuccess(null), 3000);
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

  const filteredRequests = myRequests.filter(req => {
    const matchesStatus = !statusFilter || req.status === statusFilter;
    const matchesSearch = !searchTerm ||
      req.course_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.course_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredAvailableCourses = availableCourses.filter(course =>
    course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Warning Banner */}
      {!addDropOpen && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Add/Drop Period is Closed</h3>
              <p className="text-sm text-red-700 mt-1">
                The regular add/drop period has ended. You can still submit requests, but they will require special approval.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {[
              { id: 'add' as TabType, label: 'Add Course', icon: '➕' },
              { id: 'drop' as TabType, label: 'Drop Course', icon: '➖' },
              { id: 'requests' as TabType, label: 'My Requests', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-6 text-center text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Add Course Tab */}
          {activeTab === 'add' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request to Add a Course</h3>

              {/* Search */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search courses by code, name, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <form onSubmit={handleSubmitAddRequest}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4">
                    {filteredAvailableCourses.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No available courses found</p>
                    ) : (
                      filteredAvailableCourses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => setSelectedAddCourse(course.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddCourse === course.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {course.course_code} - {course.course_name}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{course.department}</p>
                              <div className="flex items-center mt-2 text-sm text-gray-500 space-x-4">
                                <span>{course.credits} credits</span>
                                <span>•</span>
                                <span>
                                  {course.current_enrollment}/{course.max_capacity} enrolled
                                </span>
                                {course.current_enrollment >= course.max_capacity && (
                                  <span className="text-red-600 font-medium">FULL</span>
                                )}
                              </div>
                            </div>
                            <input
                              type="radio"
                              checked={selectedAddCourse === course.id}
                              onChange={() => setSelectedAddCourse(course.id)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={addReason}
                    onChange={(e) => setAddReason(e.target.value)}
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please explain why you need to add this course..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedAddCourse}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Add Request'}
                </button>
              </form>
            </div>
          )}

          {/* Drop Course Tab */}
          {activeTab === 'drop' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request to Drop a Course</h3>

              <form onSubmit={handleSubmitDropRequest}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course to Drop <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {enrolledCourses.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">You are not currently enrolled in any courses</p>
                    ) : (
                      enrolledCourses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => setSelectedDropCourse(course.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedDropCourse === course.id
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-red-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {course.course_code} - {course.course_name}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{course.department}</p>
                              <div className="flex items-center mt-2 text-sm text-gray-500">
                                <span>{course.credits} credits</span>
                              </div>
                            </div>
                            <input
                              type="radio"
                              checked={selectedDropCourse === course.id}
                              onChange={() => setSelectedDropCourse(course.id)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please explain why you need to drop this course..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedDropCourse}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Drop Request'}
                </button>
              </form>
            </div>
          )}

          {/* My Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">My Add/Drop Requests</h3>
                <button
                  onClick={loadMyRequests}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="mb-4 flex space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No requests found</p>
                ) : (
                  filteredRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              request.request_type === 'ADD' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            } mr-2`}>
                              {request.request_type}
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900">
                            {request.course_code} - {request.course_name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{request.department}</p>
                        </div>
                      </div>

                      <div className="mt-3 bg-gray-50 rounded p-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Submitted: {new Date(request.request_date).toLocaleDateString()}</span>
                        {request.approved_date && (
                          <span>Processed: {new Date(request.approved_date).toLocaleDateString()}</span>
                        )}
                      </div>

                      {request.rejection_reason && (
                        <div className="mt-3 bg-red-50 border-l-4 border-red-500 p-3 rounded">
                          <p className="text-sm text-red-700">
                            <span className="font-medium">Rejection Reason:</span> {request.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDropCourse;
