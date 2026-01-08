import { Link } from 'react-router-dom';
import {
  Plus,
  Minus,
  Calendar,
  Clock,
  FileText,
  BookOpen,
  ShoppingCart,
} from 'lucide-react';

const enrollmentOptions = [
  {
    category: 'Course Enrollment',
    items: [
      {
        path: '/enrollments/add',
        label: 'Add Courses',
        icon: Plus,
        description: 'Enroll in new courses for the current term',
      },
      {
        path: '/enrollments/drop',
        label: 'Drop Courses',
        icon: Minus,
        description: 'Withdraw from enrolled courses',
      },
      {
        path: '/cart',
        label: 'Shopping Cart',
        icon: ShoppingCart,
        description: 'Manage your course shopping cart',
      },
    ],
  },
  {
    category: 'Academic Information',
    items: [
      {
        path: '/enrollments/term-information',
        label: 'Term Information',
        icon: FileText,
        description: 'View important dates and deadlines for the current term',
      },
      {
        path: '/enrollments/exam-schedules',
        label: 'Exam Schedules',
        icon: Calendar,
        description: 'View examination schedules and locations',
      },
      {
        path: '/enrollments/class-schedule',
        label: 'Class Schedule',
        icon: Clock,
        description: 'View your weekly class schedule',
      },
    ],
  },
];

export function EnrollmentsLanding() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Course Enrollment</h1>
        <p className="text-muted-foreground">
          Manage your course enrollments, view schedules, and access academic information
        </p>
      </div>

      {/* Enrollment Options by Category */}
      <div className="space-y-8">
        {enrollmentOptions.map((category) => (
          <div key={category.category}>
            <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
              {category.category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.items.map((option) => {
                const Icon = option.icon;
                return (
                  <Link
                    key={option.path}
                    to={option.path}
                    className="group bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {option.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-8 bg-muted/50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/my-courses"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <BookOpen className="w-4 h-4" />
            View My Courses
          </Link>
          <Link
            to="/course-search"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <BookOpen className="w-4 h-4" />
            Search Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
