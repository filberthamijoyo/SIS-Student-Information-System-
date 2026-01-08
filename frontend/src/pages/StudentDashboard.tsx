import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { campusAPI, enrollmentAPI } from '../services/api';
import { academicCalendarService } from '../services/academicCalendarService';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  BarChart3,
  UserCircle,
  Calendar,
  Bell,
  ChevronRight,
  ChevronLeft,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';
import type { AcademicEvent } from '../types';
import { formatLocation } from '../utils/locationFormatter';

export function StudentDashboard() {
  const { user } = useAuth();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Get current term enrollments for weekly schedule
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['my-enrollments', 'current-term'],
    queryFn: () => enrollmentAPI.getMyCourses(true).then(res => res.data.data),
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => campusAPI.getAnnouncements().then(res => res.data.data),
  });

  // Get academic calendar events for mini calendar
  const { data: calendarEvents } = useQuery({
    queryKey: ['academic-calendar-events', 'dashboard'],
    queryFn: () => academicCalendarService.getEvents(),
  });

  // Get exam schedules for upcoming exams widget
  // Show only exams for courses the student is enrolled in
  const { data: examSchedules } = useQuery({
    queryKey: ['exam-schedules', 'dashboard'],
    queryFn: async () => {
      const response = await enrollmentAPI.getExamSchedules(true, false);
      return response.data.data ?? [];
    },
  });

  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Calculate the start of the current week (Monday)
  const getWeekStart = (offset: number = 0) => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setDate(monday.getDate() + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Get the current week's Monday
  const weekStart = getWeekStart(currentWeekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Generate time slots from 8:00 to 21:00 in 30-minute intervals (to include tutorials until 20:50)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Convert time string (HH:MM) to minutes from 8:00
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 8 * 60; // 8:00 in minutes
    return totalMinutes - startMinutes;
  };

  // Convert minutes from 8:00 to percentage of day (8:00-21:00 = 13 hours = 780 minutes)
  const minutesToPercentage = (minutes: number): number => {
    // Clamp to 0-780 range (8:00-21:00)
    const clamped = Math.max(0, Math.min(780, minutes));
    return (clamped / 780) * 100;
  };

  // Check if two time ranges overlap
  const doClassesOverlap = (class1: any, class2: any): boolean => {
    const start1 = class1.startMinutes;
    const end1 = start1 + class1.durationMinutes;
    const start2 = class2.startMinutes;
    const end2 = start2 + class2.durationMinutes;
    
    // Two classes overlap if one starts before the other ends
    return (start1 < end2 && start2 < end1);
  };

  // Assign columns to overlapping classes
  const assignColumns = (classes: any[]): any[] => {
    if (classes.length === 0) return [];
    
    // Sort by start time
    const sorted = [...classes].sort((a, b) => a.startMinutes - b.startMinutes);
    
    // Track which classes have been assigned columns
    const assigned: any[] = [];
    
    sorted.forEach((cls) => {
      // Find all classes that overlap with this one
      const overlapping = assigned.filter(assignedCls => doClassesOverlap(cls, assignedCls));
      
      // Find available column (columns are 0-indexed)
      const usedColumns = new Set(overlapping.map(c => c.column));
      let column = 0;
      while (usedColumns.has(column)) {
        column++;
      }
      
      // Assign column
      cls.column = column;
      assigned.push(cls);
    });
    
    // Calculate maxColumns for each class by finding all classes that overlap with it
    sorted.forEach(cls => {
      // Find all classes that overlap with this one (including itself)
      const overlapping = sorted.filter(other => doClassesOverlap(cls, other));
      if (overlapping.length > 0) {
        const maxColumn = Math.max(...overlapping.map(c => c.column || 0));
        cls.maxColumns = maxColumn + 1;
      } else {
        cls.maxColumns = 1;
      }
    });
    
    return sorted;
  };

  const deriveSlotType = (slot: any, courseCode?: string, courseName?: string): string => {
    // Helper function to parse time string (handles both HH:MM:SS and HH:MM formats)
    const parseTime = (timeStr: string): number => {
      if (!timeStr) return 0;
      // Handle both "HH:MM:SS" and "HH:MM" formats
      const parts = timeStr.split(':').map(Number);
      if (parts.length >= 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    };

    // Check multiple field name variations for type
    // Prisma returns snake_case: 'type' field from time_slots table
    // BUT: We'll still check time patterns even if DB says LECTURE,
    // because the DB type might be incorrect
    const rawType = slot?.type || slot?.slot_type || slot?.slotType;
    let dbType: 'TUTORIAL' | 'LECTURE' | null = null;
    
    if (rawType && typeof rawType === 'string') {
      const normalized = rawType.toUpperCase().trim();
      if (normalized === 'TUTORIAL' || normalized === 'TUT' || normalized === 'T') {
        dbType = 'TUTORIAL';
      } else if (normalized === 'LECTURE' || normalized === 'LEC' || normalized === 'L') {
        dbType = 'LECTURE';
      }
    }
    
    // If DB explicitly says TUTORIAL, trust it (no need to check further)
    if (dbType === 'TUTORIAL') {
      return 'TUTORIAL';
    }
    // If DB says LECTURE, we'll still check time patterns below and override if needed

    // Get time values - Prisma returns snake_case: start_time, end_time
    // Handle both string and Date object formats
    let startTime = slot?.start_time || slot?.startTime || '';
    let endTime = slot?.end_time || slot?.endTime || '';
    
    // Convert Date objects to string if needed
    if (startTime instanceof Date) {
      startTime = startTime.toTimeString().substring(0, 8); // HH:MM:SS format
    }
    if (endTime instanceof Date) {
      endTime = endTime.toTimeString().substring(0, 8); // HH:MM:SS format
    }
    
    // Convert to string if not already
    startTime = String(startTime);
    endTime = String(endTime);
    
    if (!startTime || !endTime || startTime === 'undefined' || endTime === 'undefined') {
      return 'LECTURE'; // Default if no time info
    }

    // Parse times and calculate duration
    const startTotal = parseTime(startTime);
    const endTotal = parseTime(endTime);
    const duration = endTotal - startTotal;
    
    // Validate duration (should be positive)
    if (duration <= 0 || duration > 600) { // More than 10 hours is invalid
      return 'LECTURE'; // Invalid time data, default to lecture
    }
    
    // Get time string in HH:MM format for pattern matching
    const timeStr = startTime.length >= 5 ? startTime.substring(0, 5) : startTime;
    const hour = Math.floor(startTotal / 60);

    // Check course code/name patterns for tutorial indicators
    if (courseCode || courseName) {
      const codeUpper = (courseCode || '').toUpperCase();
      const nameUpper = (courseName || '').toUpperCase();
      
      // Check for tutorial indicators in course code or name
      if (codeUpper.includes('TUT') || codeUpper.includes('T-') || 
          nameUpper.includes('TUTORIAL') || nameUpper.includes('TUT ')) {
        return 'TUTORIAL';
      }
    }

    // Check location patterns (some tutorial rooms have specific patterns)
    const location = (slot?.location || '').toUpperCase();
    if (location.includes('TUT') || location.includes('TUTORIAL')) {
      return 'TUTORIAL';
    }

    // Primary detection: Duration-based
    // Tutorials in CUHK are typically 50 minutes (48-55 minutes)
    // Lectures are typically 80 minutes (75-85 minutes)
    if (duration >= 48 && duration <= 60) {
      return 'TUTORIAL';
    }
    
    // Secondary detection: Evening slots (17:00-21:00) that are shorter than 80 minutes
    // Evening tutorials are very common at CUHK
    // Be more aggressive: any evening slot less than 80 minutes is likely a tutorial
    if (hour >= 17 && hour <= 21) {
      if (duration > 0 && duration < 80) {
        return 'TUTORIAL';
      }
    }
    
    // Tertiary detection: Specific tutorial time slots
    // Common CUHK tutorial times: 18:00-18:50, 19:00-19:50, 20:00-20:50
    const tutorialStartTimes = [
      '18:00', '19:00', '20:00', 
      '18:30', '19:30', '20:30', 
      '17:00', '17:30', '17:50',
      '18:50', '19:50', '20:50' // Also check end times
    ];
    if (tutorialStartTimes.includes(timeStr)) {
      // If it starts at a tutorial time, it's almost certainly a tutorial
      // Even if duration is slightly off, trust the time pattern
      if (duration <= 70) {
        return 'TUTORIAL';
      }
    }
    
    // Quaternary detection: Any slot between 17:00-21:00 that's 50-70 minutes
    // This catches tutorials that might have slightly different durations
    if (hour >= 17 && hour <= 21 && duration >= 50 && duration <= 70) {
      return 'TUTORIAL';
    }

    // Default to LECTURE if none of the above match
    return 'LECTURE';
  };

  // Build weekly schedule from enrollments
  const buildWeeklySchedule = () => {
    if (!enrollments) return {};

    const schedule: Record<string, any[]> = {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': [],
      'Sunday': [],
    };

    // Helper to normalize day name from database format (MONDAY) to display format (Monday)
    const normalizeDayName = (day: string): string => {
      if (!day) return '';
      // Convert MONDAY -> Monday, TUESDAY -> Tuesday, etc.
      return day.charAt(0) + day.slice(1).toLowerCase();
    };

    const seenScheduleEntries = new Set<string>();

    enrollments.forEach((enrollment: any) => {
      // Handle both snake_case (time_slots) and camelCase (timeSlots) from Prisma
      const timeSlots = enrollment.courses?.time_slots || enrollment.courses?.timeSlots || [];
      
      if (timeSlots.length > 0) {
        timeSlots.forEach((slot: any) => {
          // Handle both snake_case and camelCase for day_of_week
          const dayOfWeek = slot.day_of_week || slot.dayOfWeek;
          const day = normalizeDayName(dayOfWeek);
          
          if (schedule[day]) {
            const startTime = slot.start_time || slot.startTime;
            const endTime = slot.end_time || slot.endTime;
            
            const courseCode = enrollment.courses?.course_code || enrollment.courses?.courseCode;
            const courseName = enrollment.courses?.course_name || enrollment.courses?.courseName;
            const slotType = deriveSlotType(slot, courseCode, courseName);
            
            // Debug logging for tutorial detection (log all slots to understand data structure)
            const parseTime = (timeStr: string): number => {
              if (!timeStr) return 0;
              const parts = timeStr.split(':').map(Number);
              return parts.length >= 2 ? parts[0] * 60 + parts[1] : 0;
            };
            const startTotal = parseTime(startTime);
            const endTotal = parseTime(endTime);
            const duration = endTotal - startTotal;
            
            // Log slots that might be tutorials but aren't detected, or all slots for debugging
            if (duration >= 48 && duration <= 60 && slotType !== 'TUTORIAL') {
              console.warn('Potential tutorial not detected:', {
                slotId: slot.id,
                courseCode,
                type: slot.type,
                startTime,
                endTime,
                duration,
                detectedType: slotType,
                allSlotKeys: Object.keys(slot),
                rawSlot: slot
              });
            }
            
            // // Log all detected tutorials
            // if (slotType === 'TUTORIAL') {
            //   console.log('✓ Tutorial detected:', {
            //     slotId: slot.id,
            //     courseCode,
            //     type: slot.type,
            //     startTime,
            //     endTime,
            //     duration,
            //     detectedType: slotType
            //   });
            // }

            const courseId = enrollment.course_id || enrollment.courseId || enrollment.courses?.id;
            const slotId = slot.id || slot.slot_id || slot.slotId;
            const dedupeKey = slotId
              ? `slot-${slotId}`
              : `course-${courseId || 'unknown'}-${day}-${startTime}-${endTime}-${slotType}`;

            if (seenScheduleEntries.has(dedupeKey)) {
              return;
            }

            seenScheduleEntries.add(dedupeKey);

            schedule[day].push({
              courseCode: enrollment.courses?.course_code || enrollment.courses?.courseCode,
              courseName: enrollment.courses?.course_name || enrollment.courses?.courseName,
              startTime,
              endTime,
              location: slot.location,
              instructor: enrollment.courses?.users?.full_name || enrollment.courses?.users?.fullName,
              startMinutes: timeToMinutes(startTime),
              durationMinutes: timeToMinutes(endTime) - timeToMinutes(startTime),
              type: slotType,
            });
          }
        });
      }
    });

    // Sort each day by start time and assign columns for overlapping classes
    Object.keys(schedule).forEach(day => {
      schedule[day].sort((a, b) => {
        return a.startMinutes - b.startMinutes;
      });
      // Assign columns to handle overlaps
      schedule[day] = assignColumns(schedule[day]);
    });

    return schedule;
  };

  const weeklySchedule = buildWeeklySchedule();
  const today = new Date();
  const isCurrentWeek = currentWeekOffset === 0;

  // Check if a date is today
  const isTodayDate = (dayName: string) => {
    if (!isCurrentWeek) return false;
    return dayName === today.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Format week range
  const formatWeekRange = () => {
    const start = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekOffset(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  // Reset to current week
  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  const quickAccessLinks = [
    { label: 'My Enrollments', icon: BookOpen, link: '/enrollments', color: 'from-blue-500 to-cyan-500' },
    { label: 'My Grades', icon: BarChart3, link: '/academic/grades', color: 'from-green-500 to-emerald-500' },
    { label: 'Transcript', icon: FileText, link: '/academic/transcript', color: 'from-orange-500 to-red-500' },
    { label: 'Personal Info', icon: UserCircle, link: '/personal', color: 'from-indigo-500 to-blue-500' },
    { label: 'Academic Calendar', icon: Calendar, link: '/academic-calendar', color: 'from-pink-500 to-rose-500' },
    { label: 'Exam Schedules', icon: CalendarDays, link: '/enrollments/exam-schedules', color: 'from-red-500 to-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Access */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickAccessLinks.map((item) => (
              <Link
                key={item.link}
                to={item.link}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Weekly Schedule */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Weekly Schedule
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={goToCurrentWeek}
                    className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors"
                    disabled={isCurrentWeek}
                  >
                    {isCurrentWeek ? 'This Week' : 'Current Week'}
                  </button>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Next week"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatWeekRange()}
                </p>
              </div>
              <div className="p-6">
                {enrollmentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !enrollments || enrollments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No enrollments for current term</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Enroll in courses to see them in your weekly schedule
                    </p>
                    <Link
                      to="/courses"
                      className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Browse Courses →
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg" style={{ maxHeight: '1200px' }}>
                    <div className="inline-block min-w-full">
                      {/* Table structure */}
                      <div className="relative">
                        {/* Header row with days */}
                        <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                          <div className="grid grid-cols-8" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                            {/* Empty corner cell */}
                            <div className="sticky left-0 z-30 border-r-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"></div>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                              const isToday = isTodayDate(day);
                              const dayDate = new Date(weekStart);
                              const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
                              dayDate.setDate(dayDate.getDate() + dayIndex);
                              
                    return (
                                <div
                                  key={day}
                                  className={`border-r border-gray-200 dark:border-gray-700 last:border-r-0 p-3 text-center ${
                                    isToday 
                                      ? 'bg-primary/10 dark:bg-primary/20 border-primary/50' 
                                      : 'bg-gray-50 dark:bg-gray-900'
                                  }`}
                                >
                                  <div className={`text-xs font-semibold uppercase mb-1 ${
                                    isToday ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                            {day.substring(0, 3)}
                          </div>
                                  <div className={`text-sm font-bold ${
                                    isToday ? 'text-primary' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {dayDate.getDate()}
                          </div>
                          {isToday && (
                            <div className="text-xs text-primary font-medium mt-1">Today</div>
                          )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time slots and schedule grid */}
                        <div className="relative">
                          <div className="grid grid-cols-8" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                            {/* Time column (fixed) */}
                            <div 
                              className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-r-2 border-gray-300 dark:border-gray-600 shadow-[2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.2)]"
                              style={{ height: '1040px' }}
                            >
                              {timeSlots.map((time) => {
                                // Show labels for every 30 minutes
                                const [, minutes] = time.split(':').map(Number);
                                const showLabel = minutes === 0 || minutes === 30;
                                // Each 30-minute slot = 40px (1040px total / 26 slots)
                                
                                return (
                                  <div
                                    key={time}
                                    className={`border-b flex items-start justify-end pr-2 pt-1 ${
                                      minutes === 0 
                                        ? 'border-gray-300 dark:border-gray-600' 
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                    style={{ height: '40px', minHeight: '40px' }}
                                  >
                                    {showLabel && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {time}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Day columns */}
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                              const classes = weeklySchedule[day] || [];
                              const isToday = isTodayDate(day);
                              
                              return (
                                <div
                                  key={day}
                                  className={`relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                                    isToday ? 'bg-primary/5 dark:bg-primary/10' : ''
                                  }`}
                                  style={{ height: '1040px' }}
                                >
                                  {/* Time grid lines - every 30 minutes */}
                                  {timeSlots.map((time) => {
                                    const [, minutes] = time.split(':').map(Number);
                                    return (
                                      <div
                                        key={time}
                                        className={`absolute left-0 right-0 border-b ${
                                          minutes === 0 
                                            ? 'border-gray-300 dark:border-gray-600' 
                                            : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                        style={{
                                          top: `${minutesToPercentage(timeToMinutes(time))}%`,
                                        }}
                                      />
                                    );
                                  })}

                                  {/* Course blocks - handle overlapping with side-by-side positioning */}
                                  {classes.map((cls, idx) => {
                                    const topPercent = minutesToPercentage(cls.startMinutes);
                                    const heightPercent = minutesToPercentage(cls.durationMinutes);
                                    // Check if type is TUTORIAL (case-insensitive)
                                    const isTutorial = cls.type?.toUpperCase() === 'TUTORIAL';
                                    
                                    // Calculate positioning for overlapping classes
                                    const column = cls.column || 0;
                                    const maxColumns = cls.maxColumns || 1;
                                    const gap = 2; // Gap between columns in pixels
                                    const padding = 4; // Left/right padding in pixels
                                    
                                    // Calculate width and left position for side-by-side layout
                                    let widthPercent: string;
                                    let leftPercent: string;
                                    
                                    if (maxColumns > 1) {
                                      // Multiple columns: divide space equally
                                      const totalGaps = gap * (maxColumns - 1);
                                      const totalPadding = padding * 2;
                                      const availableWidth = `calc(100% - ${totalPadding}px - ${totalGaps}px)`;
                                      const columnWidth = `calc(${availableWidth} / ${maxColumns})`;
                                      
                                      widthPercent = columnWidth;
                                      // Left position: column * (width + gap) + padding
                                      leftPercent = `calc(${column} * (${columnWidth} + ${gap}px) + ${padding}px)`;
                                    } else {
                                      // Single column: full width with padding
                                      widthPercent = `calc(100% - ${padding * 2}px)`;
                                      leftPercent = `${padding}px`;
                                    }
                                    
                                    // Calculate z-index based on start time and column for proper stacking
                                    const zIndex = 10 + (cls.startMinutes % 100) + column;
                                    
                                    // Calculate minimum height needed for content (in pixels)
                                    // Header row: ~16px, Course name: ~28px (2 lines max), Instructor: ~14px, Time: ~14px, Location: ~14px, Padding: 8px
                                    const minContentHeightPx = 16 + 28 + (cls.instructor ? 14 : 0) + 14 + (cls.location ? 14 : 0) + 8; // ~90px for full content
                                    const minContentHeightPercent = (minContentHeightPx / 1040) * 100; // Convert to percentage of grid
                                    
                                    // Use the larger of: actual time duration or minimum content height
                                    // This ensures content is visible, but may cause slight overlap for very short slots
                                    const finalHeightPercent = Math.max(heightPercent, minContentHeightPercent);
                                    
                                    return (
                                      <div
                                        key={`${cls.courseCode}-${cls.startTime}-${idx}`}
                                        className={`absolute rounded-lg px-1.5 py-1 border shadow-sm hover:shadow-md transition-all ${
                                          isTutorial
                                            ? 'bg-gradient-to-br from-purple-500/15 to-purple-500/10 dark:from-purple-500/25 dark:to-purple-500/15 border-purple-500/30'
                                            : 'bg-gradient-to-br from-primary/15 to-primary/10 dark:from-primary/25 dark:to-primary/15 border-primary/30'
                                        }`}
                                        style={{
                                          top: `${topPercent}%`,
                                          left: leftPercent,
                                          width: widthPercent,
                                          height: `${finalHeightPercent}%`,
                                          minHeight: `${minContentHeightPx}px`, // Ensure minimum pixel height
                                          zIndex: zIndex,
                                          overflowY: heightPercent < minContentHeightPercent ? 'auto' : 'visible', // Scroll only if needed
                                          overflowX: 'hidden',
                                        }}
                                      >
                                        <div className="flex items-start justify-between gap-1 mb-0.5">
                                          <div className="flex-1 min-w-0">
                                            <div className={`text-[10px] font-bold break-words leading-tight ${isTutorial ? 'text-purple-600 dark:text-purple-400' : 'text-primary'}`}>
                                              {cls.courseCode}
                                            </div>
                                          </div>
                                          <span className={`text-[9px] px-1 py-0.5 rounded font-semibold flex-shrink-0 whitespace-nowrap ${
                                            isTutorial
                                              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                              : 'bg-primary/20 text-primary dark:text-primary-foreground'
                                          }`}>
                                            {isTutorial ? 'Tut' : 'Lec'}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-gray-700 dark:text-gray-200 font-medium mb-0.5 leading-tight break-words line-clamp-2">
                                          {cls.courseName}
                                        </div>
                                        {cls.instructor && (
                                          <div className="text-[9px] text-gray-600 dark:text-gray-400 mb-0.5 leading-tight break-words">
                                            {cls.instructor}
                                          </div>
                                        )}
                                        <div className="text-[9px] text-gray-600 dark:text-gray-300 flex items-center mb-0.5">
                                          <Clock className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" />
                                          <span className="break-words">{cls.startTime.substring(0, 5)} - {cls.endTime.substring(0, 5)}</span>
                                        </div>
                                        {cls.location && (
                                          <div className="text-[9px] text-gray-500 dark:text-gray-400 flex items-center">
                                            <MapPin className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" />
                                            <span className="break-words">{formatLocation(cls.location)}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                      </div>
                    );
                  })}
                </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Upcoming Exams Widget */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <CalendarDays className="w-5 h-5 mr-2 text-red-500" />
                Upcoming Exams
              </h2>
              <Link to="/enrollments/exam-schedules" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="p-6">
              {!examSchedules || examSchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No upcoming exams</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Exam schedules will appear here when available
                  </p>
                </div>
              ) : (() => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                // Show all upcoming exams in the current term (not just 2 weeks)
                const upcomingExams = (examSchedules as any[])
                  .filter((exam: any) => {
                    const examDate = new Date(exam.examDate);
                    examDate.setHours(0, 0, 0, 0);
                    return examDate >= now; // Show all future exams in current term
                  })
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.examDate);
                    const dateB = new Date(b.examDate);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .slice(0, 5);

                if (upcomingExams.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No upcoming exams in the current term</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Exam schedules will appear here when available
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {upcomingExams.map((exam: any) => {
                      const examDate = new Date(exam.examDate);
                      const isToday = examDate.toDateString() === now.toDateString();
                      const isTomorrow = examDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
                      const daysUntil = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <Link
                          key={exam.id}
                          to="/enrollments/exam-schedules"
                          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all bg-gray-50/50 dark:bg-gray-900/50"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center ${
                              isToday 
                                ? 'bg-red-500 text-white' 
                                : isTomorrow
                                ? 'bg-orange-500 text-white'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              <div className="text-xs font-semibold uppercase">
                                {examDate.toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                              <div className="text-xl font-bold">
                                {examDate.getDate()}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {exam.courseCode}
                                </h3>
                                {(isToday || isTomorrow) && (
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                                    isToday
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                                  }`}>
                                    {isToday ? 'Today' : 'Tomorrow'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                                {exam.courseName}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                {exam.startTime && exam.endTime && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{exam.startTime.substring(0, 5)} - {exam.endTime.substring(0, 5)}</span>
                                  </div>
                                )}
                                {exam.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{formatLocation(exam.location)}</span>
                                  </div>
                                )}
                                {!isToday && !isTomorrow && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    {daysUntil} {daysUntil === 1 ? 'day' : 'days'} away
                                  </span>
                                )}
                              </div>
                            </div>
                            {isToday && (
                              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Academic Calendar - Mini Calendar Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Academic Calendar
                </h2>
                <Link to="/academic-calendar" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="p-6">
              {(() => {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                
                const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
                const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();
                
                const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
                const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
                const days: (number | null)[] = [];
                
                for (let i = 0; i < firstDay; i++) days.push(null);
                for (let day = 1; day <= daysInMonth; day++) days.push(day);
                
                const getEventsForDate = (day: number): AcademicEvent[] => {
                  if (!calendarEvents) return [];
                  return calendarEvents.filter((event) => {
                    const eventStart = new Date(event.start_date);
                    const eventEnd = event.end_date ? new Date(event.end_date) : eventStart;
                    const checkDate = new Date(calendarYear, calendarMonth, day);
                    return checkDate >= new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()) &&
                           checkDate <= new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
                  });
                };
                
                const isToday = (day: number | null): boolean => {
                  if (day === null) return false;
                  const today = new Date();
                  return day === today.getDate() &&
                         calendarMonth === today.getMonth() &&
                         calendarYear === today.getFullYear();
                };
                
                const getEventTypeColor = (eventType: string): string => {
                  const colors: Record<string, string> = {
                    'TERM_START': 'bg-blue-500',
                    'TERM_END': 'bg-blue-500',
                    'ADD_DROP': 'bg-purple-500',
                    'EXAM': 'bg-orange-500',
                    'FINAL_EXAM': 'bg-orange-600',
                    'HOLIDAY': 'bg-green-500',
                    'BREAK': 'bg-green-400'
                  };
                  return colors[eventType] || 'bg-gray-500';
                };
                
                const navigateMonth = (direction: 'prev' | 'next') => {
                  if (direction === 'prev') {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  } else {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }
                };
                
                return (
                  <div>
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {monthNames[calendarMonth]} {calendarYear}
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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
                      <div className="grid grid-cols-7">
                        {days.map((day, index) => {
                          const dayEvents = day ? getEventsForDate(day) : [];
                          return (
                            <div
                              key={index}
                              className={`min-h-[60px] p-1.5 border-r border-b border-gray-200 dark:border-gray-700 ${
                                day === null ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                              } ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''}`}
                            >
                              {day !== null && (
                                <>
                                  <div className={`text-xs font-medium mb-1 ${
                                    isToday(day) ? 'text-primary font-bold' : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {day}
                    </div>
                                  <div className="space-y-0.5">
                                    {dayEvents.slice(0, 2).map((event, eventIndex) => (
                                      <div
                                        key={eventIndex}
                                        className={`text-[10px] px-1 py-0.5 rounded truncate ${getEventTypeColor(event.event_type)} text-white`}
                                        title={event.name}
                                      >
                                        {event.name}
                  </div>
                                    ))}
                                    {dayEvents.length > 2 && (
                                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                        +{dayEvents.length - 2} more
                    </div>
                                    )}
                    </div>
                                </>
                              )}
                  </div>
                          );
                        })}
                    </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* News & Announcements */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-primary" />
                  News & Announcements
                </h2>
                <Link to="/campus" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="p-6">
                {announcements && announcements.length > 0 ? (
                  <div className="space-y-4">
                    {announcements.slice(0, 5).map((announcement: any) => (
                      <div key={announcement.id} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            announcement.type === 'URGENT'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                              : announcement.type === 'ACADEMIC'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {announcement.type}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                          {announcement.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(announcement.posted_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No announcements</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
