import React from 'react';
import AcademicCalendar from '../components/AcademicCalendar';

const AcademicCalendarPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-muted/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Academic Calendar</h1>
          <p className="mt-2 text-muted-foreground">
            View important academic dates, events, and add/drop periods
          </p>
        </div>

        {/* Academic Calendar Component */}
        <AcademicCalendar />
      </div>
    </div>
  );
};

export default AcademicCalendarPage;
