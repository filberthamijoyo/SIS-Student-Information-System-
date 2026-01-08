import axios from 'axios';
import type { AcademicEvent, AddDropStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const academicCalendarService = {
  async getEvents(term?: string, year?: number): Promise<AcademicEvent[]> {
    const params = new URLSearchParams();
    if (term) params.append('term', term);
    if (year) params.append('year', year.toString());

    const response = await axios.get(
      `${API_BASE_URL}/academic-calendar/events${params.toString() ? `?${params}` : ''}`,
      { headers: getAuthHeader() }
    );
    return response.data.data;
  },

  async getAddDropStatus(): Promise<AddDropStatus> {
    const response = await axios.get(`${API_BASE_URL}/academic-calendar/add-drop-status`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  },

  async getUpcomingEvents(limit = 5): Promise<AcademicEvent[]> {
    const response = await axios.get(
      `${API_BASE_URL}/academic-calendar/upcoming-events?limit=${limit}`,
      { headers: getAuthHeader() }
    );
    return response.data.data;
  },

  async getHolidays(term?: string, year?: number): Promise<AcademicEvent[]> {
    const params = new URLSearchParams();
    if (term) params.append('term', term);
    if (year) params.append('year', year.toString());

    const response = await axios.get(
      `${API_BASE_URL}/academic-calendar/holidays${params.toString() ? `?${params}` : ''}`,
      { headers: getAuthHeader() }
    );
    return response.data.data;
  }
};
