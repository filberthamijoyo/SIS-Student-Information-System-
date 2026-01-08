import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { academicCalendarService } from '../services/academicCalendarService';
import type { AcademicEvent, AddDropStatus } from '../types';
import { formatSemester } from '../utils/semesterFormatter';

const AcademicCalendar: React.FC = () => {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<AcademicEvent[]>([]);
  const [addDropStatus, setAddDropStatus] = useState<AddDropStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedTerm, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, upcomingData, statusData] = await Promise.all([
        academicCalendarService.getEvents(selectedTerm || undefined, selectedYear),
        academicCalendarService.getUpcomingEvents(5),
        academicCalendarService.getAddDropStatus()
      ]);
      setEvents(eventsData);
      setUpcomingEvents(upcomingData);
      setAddDropStatus(statusData);
      setError(null);
    } catch (err) {
      setError('Failed to load calendar data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType: string): string => {
    const colors: Record<string, string> = {
      'TERM_START': 'bg-blue-500 text-white',
      'TERM_END': 'bg-blue-500 text-white',
      'ADD_DROP': 'bg-purple-500 text-white',
      'EXAM': 'bg-orange-500 text-white',
      'FINAL_EXAM': 'bg-orange-600 text-white',
      'HOLIDAY': 'bg-green-500 text-white',
      'BREAK': 'bg-green-400 text-white'
    };
    return colors[eventType] || 'bg-gray-500 text-white';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysDifference = (startDate: string, endDate?: string): number => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getEventsForDate = (day: number): AcademicEvent[] => {
    return events.filter((event) => {
      const eventStart = new Date(event.start_date);
      const eventEnd = event.end_date ? new Date(event.end_date) : eventStart;
      const checkDate = new Date(currentYear, currentMonth, day);

      return checkDate >= new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()) &&
             checkDate <= new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return day === today.getDate() &&
           currentMonth === today.getMonth() &&
           currentYear === today.getFullYear();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Add/Drop Status Banner */}
      {addDropStatus && (
        <div className={`mb-6 p-4 rounded-lg ${addDropStatus.isOpen ? 'bg-green-50 border-l-4 border-green-500' : 'bg-yellow-50 border-l-4 border-yellow-500'}`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {addDropStatus.isOpen ? (
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${addDropStatus.isOpen ? 'text-green-800' : 'text-yellow-800'}`}>
                {addDropStatus.isOpen ? 'Add/Drop Period is OPEN' : 'Add/Drop Period is CLOSED'}
              </h3>
              {addDropStatus.period && (
                <p className={`text-sm mt-1 ${addDropStatus.isOpen ? 'text-green-700' : 'text-yellow-700'}`}>
                  {addDropStatus.period.name} ({formatDate(addDropStatus.period.start_date)} - {formatDate(addDropStatus.period.end_date!)})
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Academic Calendar</h2>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow' : 'text-gray-700'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar' ? 'bg-white text-blue-600 shadow' : 'text-gray-700'
                }`}
              >
                Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Terms</option>
              <option value="FALL">Term 1</option>
              <option value="SPRING">Term 2</option>
              <option value="SUMMER">Summer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Events List/Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {viewMode === 'list' ? 'All Events' : 'Calendar View'}
            </h3>

            {viewMode === 'list' ? (
              <div className="space-y-4">
                {events.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No events found for the selected filters.</p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(event.event_type)} mr-3`}>
                              {event.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatSemester(event.term)} {event.year}
                            </span>
                          </div>
                          <h4 className="text-lg font-medium text-gray-900 mb-1">{event.name}</h4>
                          {event.description && (
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                          )}
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(event.start_date)}</span>
                            {event.end_date && (
                              <>
                                <span className="mx-2">→</span>
                                <span>{formatDate(event.end_date)}</span>
                                <span className="ml-2 text-xs text-gray-400">
                                  ({getDaysDifference(event.start_date, event.end_date)} days)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {monthNames[currentMonth]} {currentYear}
                  </h3>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {dayNames.map((day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 auto-rows-fr">
                    {generateCalendarDays().map((day, index) => {
                      const dayEvents = day ? getEventsForDate(day) : [];
                      return (
                        <div
                          key={index}
                          className={`min-h-[100px] p-2 border-r border-b border-gray-200 dark:border-gray-700 ${
                            day === null ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                          } ${isToday(day || 0) ? 'ring-2 ring-primary ring-inset' : ''}`}
                        >
                          {day !== null && (
                            <>
                              <div className={`text-sm font-medium mb-1 ${
                                isToday(day) ? 'text-primary font-bold' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {day}
                              </div>
                              <div className="space-y-1 overflow-y-auto max-h-[70px]">
                                {dayEvents.map((event, eventIndex) => (
                                  <div
                                    key={eventIndex}
                                    className={`text-xs px-1.5 py-0.5 rounded truncate ${getEventTypeColor(event.event_type)} cursor-pointer hover:opacity-80`}
                                    title={`${event.name}\n${event.description || ''}`}
                                  >
                                    {event.name}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Today Button */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => {
                      const today = new Date();
                      setCurrentMonth(today.getMonth());
                      setCurrentYear(today.getFullYear());
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Today
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{event.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(event.start_date)}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${getEventTypeColor(event.event_type)}`}>
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Types</h3>
            <div className="space-y-2">
              {[
                { type: 'TERM_START', label: 'Term Start/End', color: 'bg-blue-500' },
                { type: 'ADD_DROP', label: 'Add/Drop Period', color: 'bg-purple-500' },
                { type: 'EXAM', label: 'Exams', color: 'bg-orange-500' },
                { type: 'HOLIDAY', label: 'Holidays', color: 'bg-green-500' }
              ].map(({ type, label, color }) => (
                <div key={type} className="flex items-center">
                  <span className={`w-4 h-4 ${color} rounded mr-2`}></span>
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendar;
