import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, Loader2, AlertCircle, RefreshCw, Search, Filter, X } from 'lucide-react';
import { enrollmentAPI } from '../services/api';
import { formatLocation } from '../utils/locationFormatter';

interface ExamSchedule {
  id: number;
  courseCode: string;
  courseName: string;
  examDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  term: string;
  year: number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateShort = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 'TBD';
  if (start && end) return `${start.substring(0, 5)} – ${end.substring(0, 5)}`;
  return start?.substring(0, 5) || end?.substring(0, 5) || 'TBD';
};

export function ExamSchedules() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: examSchedules,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery<ExamSchedule[]>({
    queryKey: ['exam-schedules'],
    queryFn: async () => {
      const response = await enrollmentAPI.getExamSchedules(true, true);
      return response.data.data ?? [];
    },
  });

  // Filter and group exams
  const { filteredExams, groupedExams } = useMemo(() => {
    if (!examSchedules) return { filteredExams: [], groupedExams: {} };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filtered = examSchedules.filter((exam) => {
      // Search filter
      const validLocation = exam.location && exam.location !== exam.courseCode;
      const matchesSearch = 
        exam.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (validLocation && exam.location.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Date filter
      const examDate = new Date(exam.examDate);
      examDate.setHours(0, 0, 0, 0);

      if (filterType === 'upcoming') {
        return examDate >= now;
      } else if (filterType === 'past') {
        return examDate < now;
      }
      return true;
    });

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.examDate);
      const dateB = new Date(b.examDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Group by date
    const grouped: Record<string, ExamSchedule[]> = {};
    filtered.forEach((exam) => {
      const dateKey = exam.examDate;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(exam);
    });

    return { filteredExams: filtered, groupedExams: grouped };
  }, [examSchedules, searchQuery, filterType]);

  const isUpcoming = (examDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const date = new Date(examDate);
    date.setHours(0, 0, 0, 0);
    return date >= now;
  };

  const isToday = (examDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const date = new Date(examDate);
    date.setHours(0, 0, 0, 0);
    return date.toDateString() === now.toDateString();
  };

  const isTomorrow = (examDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = new Date(examDate);
    date.setHours(0, 0, 0, 0);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDaysUntil = (examDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const date = new Date(examDate);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exam Schedules</h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage all exam schedules for the current term
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by course code, name, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All Exams
                </button>
                <button
                  onClick={() => setFilterType('upcoming')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'upcoming'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setFilterType('past')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'past'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Past
                </button>
              </div>
            </div>
          )}

          {/* Results Count */}
          {!isLoading && examSchedules && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredExams.length} of {examSchedules.length} exam{examSchedules.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading exam schedules...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-6 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Unable to load exam data.</p>
            <p className="text-sm mt-1">Please refresh the page or try again later.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredExams.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <CalendarDays className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || filterType !== 'all' ? 'No exams found' : 'No Exam Schedule Available'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No exam schedules have been published yet. Check back closer to the assessment period.'}
          </p>
        </div>
      )}

      {!isLoading && !error && filteredExams.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedExams)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, exams]) => {
              const dateObj = new Date(date);
              const isDateToday = isToday(date);
              const isDateTomorrow = isTomorrow(date);
              const upcoming = isUpcoming(date);

              return (
                <div key={date} className="space-y-3">
                  {/* Date Header */}
                  <div className={`sticky top-0 z-10 py-3 px-4 rounded-lg border ${
                    isDateToday
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : isDateTomorrow
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      : upcoming
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CalendarDays className={`w-5 h-5 ${
                          isDateToday
                            ? 'text-red-600 dark:text-red-400'
                            : isDateTomorrow
                            ? 'text-orange-600 dark:text-orange-400'
                            : upcoming
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <h2 className={`text-lg font-bold ${
                          isDateToday
                            ? 'text-red-900 dark:text-red-200'
                            : isDateTomorrow
                            ? 'text-orange-900 dark:text-orange-200'
                            : upcoming
                            ? 'text-blue-900 dark:text-blue-200'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {formatDate(date)}
                        </h2>
                        {isDateToday && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                            TODAY
                          </span>
                        )}
                        {isDateTomorrow && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                            TOMORROW
                          </span>
                        )}
                        {!isDateToday && !isDateTomorrow && upcoming && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                            {getDaysUntil(date)} {getDaysUntil(date) === 1 ? 'day' : 'days'} away
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {exams.length} exam{exams.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Exams for this date */}
                  <div className="space-y-3">
                    {exams.map((exam) => {
                      const examUpcoming = isUpcoming(exam.examDate);
                      const examToday = isToday(exam.examDate);

                      return (
                        <div
                          key={exam.id}
                          className={`bg-white dark:bg-gray-800 rounded-lg border p-6 hover:shadow-lg transition-all ${
                            examToday
                              ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                              : examUpcoming
                              ? 'border-blue-200 dark:border-blue-800'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center ${
                              examToday
                                ? 'bg-red-500 text-white'
                                : examUpcoming
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-400 text-white'
                            }`}>
                              <Clock className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {exam.courseCode}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                    {exam.courseName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {examToday && (
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      TODAY
                                    </span>
                                  )}
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    examUpcoming
                                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    EXAM
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                  <span className="text-gray-600 dark:text-gray-400">Time:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {formatTime(exam.startTime, exam.endTime)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                  <span className="text-gray-600 dark:text-gray-400">Location:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {exam.location && exam.location !== exam.courseCode ? formatLocation(exam.location) : 'TBD'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
