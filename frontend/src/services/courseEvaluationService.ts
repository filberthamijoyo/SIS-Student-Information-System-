import axios from 'axios';
import type {
  CourseEvaluation,
  SubmitEvaluationData,
  CourseStats,
  PendingEvaluation
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const courseEvaluationService = {
  async submitEvaluation(data: SubmitEvaluationData): Promise<CourseEvaluation> {
    const response = await axios.post(`${API_BASE_URL}/course-evaluation/submit`, data, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getMyEvaluations(studentId: number): Promise<CourseEvaluation[]> {
    const response = await axios.get(`${API_BASE_URL}/course-evaluation/my-evaluations/${studentId}`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getCourseStats(courseId: number): Promise<CourseStats> {
    const response = await axios.get(`${API_BASE_URL}/course-evaluation/course-stats/${courseId}`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getPendingEvaluations(studentId: number): Promise<PendingEvaluation[]> {
    const response = await axios.get(`${API_BASE_URL}/course-evaluation/pending/${studentId}`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  }
};
