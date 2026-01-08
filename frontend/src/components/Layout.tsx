import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Student Navigation Items
  const studentNavItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/courses', label: 'Courses' },
    { path: '/enrollments', label: 'My Enrollments' },
    { path: '/academic/grades', label: 'My Grades' },
    { path: '/academic/transcript', label: 'Transcript' },
    { path: '/financial', label: 'Financial' },
    { path: '/personal', label: 'Personal Info' },
    { path: '/applications', label: 'Applications' },
    { path: '/campus', label: 'Campus Info' },
    { path: '/academic-calendar', label: 'Academic Calendar' },
    { path: '/add-drop', label: 'Add/Drop Courses' },
    { path: '/major-change', label: 'Major Change' },
    { path: '/evaluations', label: 'Course Evaluations' },
  ];

  // Faculty Navigation Items
  const facultyNavItems = [
    { path: '/faculty', label: 'Faculty Dashboard' },
    { path: '/faculty/courses', label: 'My Courses' },
    { path: '/faculty/grades', label: 'Grade Submission' },
    { path: '/campus', label: 'Campus Info' },
  ];

  // Admin Navigation Items
  const adminNavItems = [
    { path: '/admin', label: 'Admin Dashboard' },
    { path: '/admin/users', label: 'User Management' },
    { path: '/admin/courses', label: 'Course Management' },
    { path: '/admin/enrollments', label: 'Enrollments' },
    { path: '/campus', label: 'Campus Info' },
  ];

  const getNavItems = () => {
    if (user?.role === 'INSTRUCTOR') return facultyNavItems;
    if (user?.role === 'ADMIN') return adminNavItems;
    return studentNavItems;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">
                    CUHKSZ SIS
                  </h1>
                  <p className="text-xs text-gray-500">Student Information System</p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
                {navItems.slice(0, 6).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                {navItems.length > 6 && (
                  <div className="relative group">
                    <button className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                      More
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        {navItems.slice(6).map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-4 py-2 text-sm ${
                              isActive(item.path)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-sm text-right">
                <div className="font-semibold text-gray-900">{user?.fullName}</div>
                <div className="text-xs text-gray-500">
                  {user?.role === 'INSTRUCTOR' ? 'Faculty' : user?.role}
                  {user?.userIdentifier && ` • ${user.userIdentifier}`}
                </div>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2024 The Chinese University of Hong Kong, Shenzhen. All rights reserved.</p>
            <p className="mt-1">Student Information System v2.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
