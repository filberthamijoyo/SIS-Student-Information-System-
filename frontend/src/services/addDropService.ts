import axios from 'axios';
import type {
  AddDropRequest,
  SubmitRequestData,
  ApproveRequestData,
  RejectRequestData
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const addDropService = {
  async submitRequest(data: SubmitRequestData): Promise<AddDropRequest> {
    const response = await axios.post(`${API_BASE_URL}/add-drop/request`, data, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getMyRequests(): Promise<AddDropRequest[]> {
    const response = await axios.get(`${API_BASE_URL}/add-drop/my-requests`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getPendingRequests(): Promise<AddDropRequest[]> {
    const response = await axios.get(`${API_BASE_URL}/add-drop/pending-requests`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async approveRequest(requestId: number, data: ApproveRequestData): Promise<void> {
    const response = await axios.put(
      `${API_BASE_URL}/add-drop/approve/${requestId}`,
      data,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  async rejectRequest(requestId: number, data: RejectRequestData): Promise<void> {
    const response = await axios.put(
      `${API_BASE_URL}/add-drop/reject/${requestId}`,
      data,
      { headers: getAuthHeader() }
    );
    return response.data;
  }
};
