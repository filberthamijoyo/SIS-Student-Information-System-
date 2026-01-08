import axios from 'axios';
import type {
  MajorChangeRequest,
  SubmitMajorChangeData,
  DecideMajorChangeData
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const majorChangeService = {
  async submitRequest(data: SubmitMajorChangeData): Promise<MajorChangeRequest> {
    const response = await axios.post(`${API_BASE_URL}/major-change/request`, data, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getMyRequests(studentId: number): Promise<MajorChangeRequest[]> {
    const response = await axios.get(`${API_BASE_URL}/major-change/my-requests/${studentId}`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getPendingRequests(): Promise<MajorChangeRequest[]> {
    const response = await axios.get(`${API_BASE_URL}/major-change/pending-requests`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async decideRequest(requestId: number, data: DecideMajorChangeData): Promise<MajorChangeRequest> {
    const response = await axios.put(
      `${API_BASE_URL}/major-change/decide/${requestId}`,
      data,
      { headers: getAuthHeader() }
    );
    return response.data.data;
  }
};
