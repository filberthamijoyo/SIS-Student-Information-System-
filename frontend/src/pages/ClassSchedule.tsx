import { useMemo } from 'react';
import { Clock, Calendar, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useMyCourses } from '../hooks/useMyCourses';
import { formatLocation } from '../utils/locationFormatter';

const DAY_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
] as const;

const friendlyDay = (day: string) => day.charAt(0) + day.slice(1).toLowerCase();

const formatTime = (start?: string, end?: string) => {
  if (!start && !end) return 'TBD';
  if (start && end) return `${start} – ${end}`;
  return start || end || 'TBD';
};

interface ScheduleItem {
  courseCode: string;
  courseName: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  instructor?: string | null;
}

export function ClassSchedule() {
  const { data: enrollments, isLoading, error } = useMyCourses({ currentTermOnly: true });

  const scheduleByDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();

    (enrollments ?? []).forEach((enrollment) => {
      enrollment.course.timeSlots
        .filter((slot) => !slot.type || !slot.type.toUpperCase().includes('EXAM'))
        .forEach((slot) => {
          const dayKey = slot.dayOfWeek || 'UNASSIGNED';
          const existing = map.get(dayKey) ?? [];
          existing.push({
            courseCode: enrollment.course.code,
            courseName: enrollment.course.name,
            location: slot.location,
            startTime: slot.startTime,
            endTime: slot.endTime,
            instructor: enrollment.course.instructor
          });
          map.set(dayKey, existing);
        });
    });

    map.forEach((items, key) => {
      items.sort((a, b) => {
        const toMinutes = (time?: string) => {
          if (!time) return Number.MAX_SAFE_INTEGER;
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        return toMinutes(a.startTime) - toMinutes(b.startTime);
      });
      map.set(key, items);
    });

    return map;
  }, [enrollments]);

  const orderedDays = DAY_ORDER.filter((day) => scheduleByDay.has(day));
  const hasSchedule = orderedDays.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Class Schedule</h1>
        <p className="text-muted-foreground">
          Weekly view of your confirmed sections, pulled in real-time from the enrollment service.
        </p>
      </div>

      {isLoading && (
        <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading weekly schedule...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Unable to load schedule.</p>
            <p className="text-sm">Please refresh the page or try again later.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && !hasSchedule && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Classes Scheduled</h3>
          <p className="text-muted-foreground">
            None of your current enrollments include published meeting times yet. Check back later or
            confirm with your instructor.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {orderedDays.map((day) => (
          <div key={day} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">{friendlyDay(day)}</h2>
            </div>
            <div className="space-y-3">
              {scheduleByDay.get(day)!.map((classItem, index) => (
                <div
                  key={`${classItem.courseCode}-${index}`}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-[150px]">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {formatTime(classItem.startTime, classItem.endTime)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {classItem.courseCode} · {classItem.courseName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {classItem.instructor || 'Instructor TBA'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {classItem.location ? formatLocation(classItem.location) : 'Location TBA'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
