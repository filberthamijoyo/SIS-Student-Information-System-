import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyCourses } from '../hooks/useMyCourses';
import {
  BookOpen,
  Clock,
  MapPin,
  User,
  Loader2,
  AlertCircle,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { formatLocation } from '../utils/locationFormatter';

export function MyCourses() {
  const [currentTermOnly, setCurrentTermOnly] = useState(false);
  const { data: enrollments, isLoading, error } = useMyCourses({ currentTermOnly });

  const confirmedEnrollments = enrollments?.filter((e) => e.status === 'CONFIRMED') || [];
  const waitlistedEnrollments = enrollments?.filter((e) => e.status === 'WAITLISTED') || [];
  const totalCredits = confirmedEnrollments.reduce((sum, enrollment) => sum + enrollment.course.credits, 0);

  const formatTime = (start?: string, end?: string) => {
    if (!start && !end) return 'TBD';
    if (start && end) return `${start} – ${end}`;
    return start || end || 'TBD';
  };

  const friendlyDay = (day: string) => day.charAt(0) + day.slice(1).toLowerCase();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your courses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Unable to load courses.</p>
            <p className="text-sm">Please refresh the page or try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Courses</h1>
        <p className="text-muted-foreground">
          View and manage your enrolled courses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">Confirmed Courses</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{confirmedEnrollments.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">Total Credits</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalCredits}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">Waitlisted</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">{waitlistedEnrollments.length}</p>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => setCurrentTermOnly(!currentTermOnly)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            currentTermOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground hover:bg-muted'
          }`}
        >
          {currentTermOnly ? 'Current Term Only' : 'All Terms'}
        </button>
      </div>

      {/* Confirmed Enrollments */}
      {confirmedEnrollments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Confirmed Enrollments</h2>
          <div className="space-y-4">
            {confirmedEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <Link
                          to={`/courses/${enrollment.course.id}`}
                          className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-1 block"
                        >
                          {enrollment.course.code} · {enrollment.course.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-4 h-4" />
                            <span>{enrollment.course.credits} credits</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{enrollment.course.department}</span>
                          </div>
                          {enrollment.course.instructor && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{enrollment.course.instructor}</span>
                            </div>
                          )}
                          {enrollment.course.year && enrollment.course.semester && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {enrollment.course.year}-{enrollment.course.semester}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Slots */}
                    {enrollment.course.timeSlots.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {enrollment.course.timeSlots
                          .filter((slot) => !slot.type || !slot.type.toUpperCase().includes('EXAM'))
                          .map((slot, index) => (
                            <div
                              key={index}
                              className="flex flex-wrap items-center gap-4 text-sm bg-muted/50 rounded-lg p-3"
                            >
                              {slot.dayOfWeek && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium text-foreground">
                                    {friendlyDay(slot.dayOfWeek)}
                                  </span>
                                </div>
                              )}
                              {(slot.startTime || slot.endTime) && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-foreground">
                                    {formatTime(slot.startTime, slot.endTime)}
                                  </span>
                                </div>
                              )}
                              {slot.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-foreground">
                                    {formatLocation(slot.location)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waitlisted Enrollments */}
      {waitlistedEnrollments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Waitlisted Courses</h2>
          <div className="space-y-4">
            {waitlistedEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="bg-card border border-border rounded-lg p-6 opacity-75"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-yellow-500/10 text-yellow-600 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/courses/${enrollment.course.id}`}
                      className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-1 block"
                    >
                      {enrollment.course.code} · {enrollment.course.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        <span>{enrollment.course.credits} credits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{enrollment.course.department}</span>
                      </div>
                      {enrollment.course.instructor && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{enrollment.course.instructor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {confirmedEnrollments.length === 0 && waitlistedEnrollments.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Courses Enrolled</h3>
          <p className="text-muted-foreground mb-6">
            You haven't enrolled in any courses yet. Start by searching for courses.
          </p>
          <Link
            to="/course-search"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Search Courses
          </Link>
        </div>
      )}
    </div>
  );
}





