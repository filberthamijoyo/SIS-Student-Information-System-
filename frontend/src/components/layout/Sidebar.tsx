import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart3,
  UserCircle,
  Mail,
  Info,
  Calendar,
  Edit3,
  RotateCcw,
  Star,
  ChevronRight,
  ShoppingCart,
  Users,
  GraduationCap,
  PieChart,
  TrendingUp,
  Plus,
  Minus,
  Clock,
  CalendarDays,
  FileCheck,
  School,
  Globe,
  ArrowRight,
  X,
  Search,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type NavItem = 
  | { path: string; label: string; icon?: any }
  | { separator: true; label: string }
  | { 
      path: string;
      label: string; 
      icon?: any; 
      children: Array<{ path: string; label: string; icon?: any }>;
    };

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const studentNavItems: NavItem[] = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/my-courses', label: 'My Courses', icon: BookOpen },
    { path: '/course-search', label: 'Course Search', icon: Search },
    { path: '/evaluations', label: 'Evaluations', icon: Star },
    { 
      path: '/enrollments',
      label: 'Enrollments', 
      icon: FileText,
      children: [
        { path: '/enrollments/add', label: 'Add', icon: Plus },
        { path: '/enrollments/drop', label: 'Drop', icon: Minus },
        { path: '/enrollments/exam-schedules', label: 'Exam Schedules', icon: CalendarDays },
        { path: '/enrollments/class-schedule', label: 'Class Schedule', icon: Clock },
      ]
    },
    { 
      path: '/applications',
      label: 'Applications', 
      icon: Mail,
      children: [
        { path: '/applications/students-record/declare-major', label: 'Declare Major', icon: School },
        { path: '/applications/students-record/declare-minor', label: 'Declare Minor', icon: School },
        { path: '/applications/students-record/declare-second-major', label: 'Declare Second Major', icon: School },
        { path: '/applications/students-record/change-major', label: 'Change Major', icon: RotateCcw },
        { path: '/applications/students-record/exchange-visiting', label: 'Exchange/Visiting', icon: Globe },
        { path: '/applications/students-record/resumption-of-study', label: 'Resumption of Study', icon: ArrowRight },
        { path: '/applications/students-record/suspension', label: 'Suspension', icon: X },
        { path: '/applications/students-record/withdrawal', label: 'Withdrawal', icon: X },
        { path: '/applications/normal-addition', label: 'Normal Addition', icon: Plus },
        { path: '/applications/late-course-add-drop', label: 'Late Course Add/Drop', icon: ArrowRight },
      ]
    },
    { separator: true, label: 'Academic Records' },
    { path: '/academic/grades', label: 'My Grades', icon: BarChart3 },
    { path: '/academic/transcript', label: 'Transcript', icon: FileText },
    { path: '/academic/analytics', label: 'Grade Analytics', icon: TrendingUp },
    { separator: true, label: 'Personal' },
    { path: '/personal', label: 'Personal Info', icon: UserCircle },
    { separator: true, label: 'Campus' },
    { path: '/academic-calendar', label: 'Academic Calendar', icon: Calendar },
    { path: '/campus', label: 'Campus Info', icon: Info },
  ];

  const facultyNavItems = [
    { path: '/faculty', label: 'Faculty Dashboard', icon: LayoutDashboard },
    { path: '/faculty/courses', label: 'My Courses', icon: BookOpen },
    { path: '/campus', label: 'Campus Info', icon: Info },
  ];

  const adminNavItems = [
    { path: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
    { separator: true, label: 'Management' },
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/courses', label: 'Course Management', icon: BookOpen },
    { path: '/admin/programs', label: 'Program Management', icon: GraduationCap },
    { path: '/admin/enrollments', label: 'Enrollment Management', icon: FileText },
    { separator: true, label: 'Analytics & Reports' },
    { path: '/admin/reports', label: 'Reports & Analytics', icon: PieChart },
    { separator: true, label: 'Applications' },
    { path: '/admin/applications', label: 'Review Applications', icon: Mail },
    { separator: true, label: 'System' },
    { path: '/campus', label: 'Campus Info', icon: Info },
  ];

  const getNavItems = () => {
    if (user?.role === 'INSTRUCTOR') return facultyNavItems;
    if (user?.role === 'ADMINISTRATOR') return adminNavItems;
    return studentNavItems;
  };

  const navItems = getNavItems();

  // Auto-expand sections with active children or parent
  useEffect(() => {
    const newExpanded = new Set<string>();
    const checkActive = (path: string) => {
      return location.pathname === path || location.pathname.startsWith(path + '/');
    };
    
    // Only check student nav items for auto-expansion (they have nested items)
    if (user?.role === 'STUDENT' || !user) {
      studentNavItems.forEach((item) => {
        if ('children' in item && item.children) {
          const hasActiveChild = item.children.some((child) => checkActive(child.path));
          const isParentActive = item.path && checkActive(item.path);
          if (hasActiveChild || isParentActive) {
            newExpanded.add(item.label);
          }
        }
      });
    }
    
    setExpandedSections((prev) => {
      // Merge with existing expanded sections (user may have manually expanded others)
      const merged = new Set(prev);
      newExpanded.forEach((label) => merged.add(label));
      return merged;
    });
  }, [location.pathname, user?.role]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64',
          'bg-card border-r border-border',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item, index) => {
              // Handle separators
              if ('separator' in item && item.separator) {
                return (
                  <div key={index} className="pt-4 pb-2">
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </h3>
                  </div>
                );
              }

              // Handle expandable sections with children
              if ('children' in item && item.children) {
                const isExpanded = expandedSections.has(item.label);
                const hasActiveChild = item.children.some((child) => isActive(child.path));
                const isParentActive = item.path && isActive(item.path);

                return (
                  <div key={item.label}>
                    <div className="flex items-center">
                      <Link
                        to={item.path}
                        onClick={(e) => {
                          // Prevent navigation if clicking on the chevron
                          if ((e.target as HTMLElement).closest('.chevron-container')) {
                            e.preventDefault();
                            toggleSection(item.label);
                          } else {
                            if (window.innerWidth < 1024) {
                              onClose();
                            }
                          }
                        }}
                        className={cn(
                          'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                          'transition-all duration-200 group',
                          isParentActive || hasActiveChild
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                        <span className="flex-1 text-left">{item.label}</span>
                      </Link>
                      <button
                        onClick={() => toggleSection(item.label)}
                        className={cn(
                          'chevron-container p-1 rounded hover:bg-accent',
                          'transition-all duration-200'
                        )}
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 transition-transform duration-200',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.path);
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => {
                                if (window.innerWidth < 1024) {
                                  onClose();
                                }
                              }}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                                'transition-all duration-200',
                                childActive
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                              )}
                            >
                              {ChildIcon && <ChildIcon className="h-4 w-4 flex-shrink-0" />}
                              <span className="flex-1">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Handle regular navigation items
              if (!('path' in item) || !item.path) return null;

              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                    'transition-all duration-200 group',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer info */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Current Term</p>
              <p>Term 1 of 2025-26</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
