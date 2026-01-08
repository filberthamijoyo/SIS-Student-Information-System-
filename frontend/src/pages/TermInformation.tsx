import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, Calendar, AlertCircle, Loader2, CalendarDays } from 'lucide-react';
import { academicCalendarService } from '../services/academicCalendarService';
import type { AcademicEvent } from '../types';
import { formatSemester } from '../utils/semesterFormatter';

type Semester = 'FALL' | 'SPRING' | 'SUMMER';

const IMPORTANT_KEYWORDS = ['TERM', 'ADD_DROP', 'EXAM', 'REGISTRATION', 'WITHDRAWAL'];
const DEADLINE_KEYWORDS = ['DEADLINE', 'WITHDRAWAL', 'ADD_DROP'];

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

const determineCurrentTerm = (): { semester: Semester; year: number; label: string } => {
  const today = new Date();
  const month = today.getMonth(); // 0-based
  const year = today.getFullYear();

  if (month >= 0 && month <= 4) {
    return { semester: 'SPRING', year, label: `${year} Term 2` };
  }
  if (month >= 5 && month <= 7) {
    return { semester: 'SUMMER', year, label: `${year} Summer` };
  }
  return { semester: 'FALL', year, label: `${year} Term 1` };
};

const eventLabelMap: Record<string, string> = {
  TERM_START: 'Term Begins',
  TERM_END: 'Term Ends',
  ADD_DROP: 'Add/Drop Period',
  COURSE_REGISTRATION: 'Course Registration',
  REGISTRATION: 'Registration',
  WITHDRAWAL_DEADLINE: 'Withdrawal Deadline',
  EXAM: 'Exam Period',
  FINAL_EXAM: 'Final Exams'
};

export function TermInformation() {
  const currentTerm = determineCurrentTerm();

  const {
    data: termEvents,
    isLoading: eventsLoading,
    error: eventsError
  } = useQuery<AcademicEvent[]>({
    queryKey: ['term-events', currentTerm.semester, currentTerm.year],
    queryFn: () =>
      academicCalendarService.getEvents(currentTerm.semester, currentTerm.year)
  });

  const {
    data: addDropStatus,
    isLoading: statusLoading,
    error: statusError
  } = useQuery({
    queryKey: ['add-drop-status'],
    queryFn: academicCalendarService.getAddDropStatus
  });

  const { data: holidays, isLoading: holidaysLoading } = useQuery<AcademicEvent[]>({
    queryKey: ['term-holidays', currentTerm.semester, currentTerm.year],
    queryFn: () =>
      academicCalendarService.getHolidays(currentTerm.semester, currentTerm.year)
  });

  const importantDates = useMemo(
    () =>
      (termEvents ?? []).filter((event) =>
        IMPORTANT_KEYWORDS.some((keyword) => event.event_type.includes(keyword))
      ),
    [termEvents]
  );

  const deadlineEvents = useMemo(
    () =>
      (termEvents ?? []).filter((event) =>
        DEADLINE_KEYWORDS.some((keyword) => event.event_type.includes(keyword))
      ),
    [termEvents]
  );

  const holidayEvents = useMemo(
    () => holidays ?? (termEvents ?? []).filter((event) => event.event_type === 'HOLIDAY'),
    [holidays, termEvents]
  );

  const isLoading = eventsLoading || statusLoading || holidaysLoading;
  const hasError = eventsError || statusError;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Term Information</h1>
        <p className="text-muted-foreground">
          Live academic calendar data for the current term, including registration windows,
          deadlines, and holiday breaks.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-muted-foreground bg-card border border-border rounded-lg p-4 mb-6">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading term details...</span>
        </div>
      )}

      {hasError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Unable to load academic calendar data.</p>
            <p className="text-sm">Please refresh or try again later.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Info className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {currentTerm.label}
              </h2>
              <p className="text-muted-foreground">
                Academic Year {currentTerm.year} · {formatSemester(currentTerm.semester)}
              </p>
            </div>
          </div>

          {addDropStatus && (
            <div
              className={`rounded-lg p-4 mb-6 ${
                addDropStatus.isOpen
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 mt-0.5 text-green-600" />
                <div>
                  <p
                    className={`font-semibold ${
                      addDropStatus.isOpen ? 'text-green-800' : 'text-amber-800'
                    }`}
                  >
                    Add/Drop Period {addDropStatus.isOpen ? 'Open' : 'Closed'}
                  </p>
                  {addDropStatus.period ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {addDropStatus.period.name} ·{' '}
                      {formatDate(addDropStatus.period.start_date)} –{' '}
                      {addDropStatus.period.end_date
                        ? formatDate(addDropStatus.period.end_date)
                        : 'TBD'}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      The next add/drop window has not been scheduled yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Important Dates</h3>
              </div>
              {importantDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No dates available for this term yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {importantDates.map((event) => (
                    <li key={event.id} className="text-sm">
                      <p className="font-medium text-foreground">
                        {eventLabelMap[event.event_type] || event.name}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(event.start_date)}
                        {event.end_date && ` – ${formatDate(event.end_date)}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-lg font-semibold text-foreground">Deadlines & Reminders</h3>
              </div>
              {deadlineEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No deadline-specific events found for this term.
                </p>
              ) : (
                <ul className="space-y-3">
                  {deadlineEvents.map((event) => (
                    <li key={event.id} className="text-sm">
                      <p className="font-medium text-foreground">{event.name}</p>
                      <p className="text-muted-foreground">
                        {formatDate(event.start_date)}
                        {event.end_date && ` – ${formatDate(event.end_date)}`}
                      </p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Holidays & Breaks</h3>
          </div>
          {holidayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No holidays have been published for this term yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {holidayEvents.map((holiday) => (
                <div
                  key={holiday.id}
                  className="border border-border rounded-lg p-4 bg-muted/30"
                >
                  <p className="font-medium text-foreground">{holiday.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(holiday.start_date)}
                    {holiday.end_date && ` – ${formatDate(holiday.end_date)}`}
                  </p>
                  {holiday.description && (
                    <p className="text-xs text-muted-foreground mt-2">{holiday.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
