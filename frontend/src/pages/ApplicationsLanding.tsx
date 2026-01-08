import { Link } from 'react-router-dom';
import {
  School,
  RotateCcw,
  Globe,
  ArrowRight,
  X,
  Plus,
  Mail,
} from 'lucide-react';

const applicationOptions = [
  {
    category: 'Student Records',
    items: [
      {
        path: '/applications/students-record/declare-major',
        label: 'Declare Major',
        icon: School,
        description: 'Declare your primary major field of study',
      },
      {
        path: '/applications/students-record/declare-minor',
        label: 'Declare Minor',
        icon: School,
        description: 'Declare a minor field of study',
      },
      {
        path: '/applications/students-record/declare-second-major',
        label: 'Declare Second Major',
        icon: School,
        description: 'Declare a second major field of study',
      },
      {
        path: '/applications/students-record/change-major',
        label: 'Change Major',
        icon: RotateCcw,
        description: 'Request to change your current major',
      },
      {
        path: '/applications/students-record/exchange-visiting',
        label: 'Exchange/Visiting',
        icon: Globe,
        description: 'Apply for exchange or visiting student programs',
      },
      {
        path: '/applications/students-record/resumption-of-study',
        label: 'Resumption of Study',
        icon: ArrowRight,
        description: 'Apply to resume your studies after a leave',
      },
      {
        path: '/applications/students-record/suspension',
        label: 'Suspension',
        icon: X,
        description: 'Request a temporary suspension of studies',
      },
      {
        path: '/applications/students-record/withdrawal',
        label: 'Withdrawal',
        icon: X,
        description: 'Request to withdraw from the university',
      },
    ],
  },
  {
    category: 'Course Management',
    items: [
      {
        path: '/applications/normal-addition',
        label: 'Normal Addition',
        icon: Plus,
        description: 'Add courses during the normal registration period',
      },
      {
        path: '/applications/late-course-add-drop',
        label: 'Late Course Add/Drop',
        icon: ArrowRight,
        description: 'Request to add or drop courses after the deadline',
      },
    ],
  },
];

export function ApplicationsLanding() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Applications & Petitions</h1>
        <p className="text-muted-foreground">
          Submit and manage academic applications, petitions, and requests
        </p>
      </div>

      {/* Application Options by Category */}
      <div className="space-y-8">
        {applicationOptions.map((category) => (
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
            to="/applications/my-applications"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Mail className="w-4 h-4" />
            View My Applications
          </Link>
        </div>
      </div>
    </div>
  );
}

