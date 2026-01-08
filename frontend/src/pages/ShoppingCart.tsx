import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ShoppingCart as ShoppingCartIcon,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  User,
  Calendar,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';

// Mock data for demonstration
interface CartCourse {
  id: string;
  code: string;
  title: string;
  instructor: string;
  schedule: string;
  location: string;
  credits: number;
  status: 'available' | 'waitlist' | 'closed' | 'conflict';
  conflictWith?: string;
}

const mockCartCourses: CartCourse[] = [
  {
    id: '1',
    code: 'CSC3170',
    title: 'Database Systems',
    instructor: 'Dr. Li Wang',
    schedule: 'Tu-Th 2:00 PM - 3:20 PM',
    location: 'TB 201',
    credits: 3,
    status: 'available',
  },
  {
    id: '2',
    code: 'CSC4120',
    title: 'Design and Analysis of Algorithms',
    instructor: 'Dr. Zhang Chen',
    schedule: 'Mo-We 10:30 AM - 11:50 AM',
    location: 'TB 305',
    credits: 3,
    status: 'available',
  },
  {
    id: '3',
    code: 'MAT3007',
    title: 'Linear Algebra',
    instructor: 'Dr. Sarah Johnson',
    schedule: 'Tu-Th 9:00 AM - 10:20 AM',
    location: 'DT 402',
    credits: 3,
    status: 'waitlist',
  },
  {
    id: '4',
    code: 'CSC3001',
    title: 'Software Engineering',
    instructor: 'Dr. Michael Brown',
    schedule: 'Mo-We 2:00 PM - 3:20 PM',
    location: 'TB 201',
    credits: 3,
    status: 'conflict',
    conflictWith: 'CSC3170',
  },
];

export function ShoppingCart() {
  const [cartCourses, setCartCourses] = useState<CartCourse[]>(mockCartCourses);

  const totalCredits = cartCourses.reduce((sum, course) => sum + course.credits, 0);
  const availableCourses = cartCourses.filter(c => c.status === 'available');
  const hasConflicts = cartCourses.some(c => c.status === 'conflict');

  const removeCourse = (courseId: string) => {
    setCartCourses(cartCourses.filter(c => c.id !== courseId));
  };

  const enrollAll = () => {
    // Handle enrollment logic
    alert('Enrolling in all available courses...');
  };

  const getStatusBadge = (status: CartCourse['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Available</Badge>;
      case 'waitlist':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Waitlist</Badge>;
      case 'closed':
        return <Badge variant="danger"><X className="h-3 w-3 mr-1" /> Closed</Badge>;
      case 'conflict':
        return <Badge variant="danger"><AlertCircle className="h-3 w-3 mr-1" /> Conflict</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ShoppingCartIcon className="h-8 w-8" />
            Shopping Cart
          </h1>
          <p className="mt-2 text-muted-foreground">
            Review and enroll in your selected courses
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total Credits</div>
          <div className="text-3xl font-bold text-foreground">{totalCredits}</div>
        </div>
      </div>

      {/* Conflict Warning */}
      {hasConflicts && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Schedule Conflict Detected</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Some courses in your cart have time conflicts. Please resolve these before enrolling.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course List */}
        <div className="lg:col-span-2 space-y-4">
          {cartCourses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ShoppingCartIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Your cart is empty</h3>
                  <p className="text-muted-foreground mb-6">
                    Browse courses and add them to your cart to get started
                  </p>
                  <Button>Browse Courses</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            cartCourses.map((course) => (
              <Card
                key={course.id}
                className={cn(
                  course.status === 'conflict' && 'border-destructive',
                  course.status === 'waitlist' && 'border-warning'
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {course.code} - {course.title}
                          </h3>
                          <div className="mt-2 flex items-center gap-2">
                            {getStatusBadge(course.status)}
                            <Badge variant="secondary">{course.credits} Credits</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{course.instructor}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{course.schedule}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{course.location}</span>
                        </div>
                      </div>

                      {course.status === 'conflict' && course.conflictWith && (
                        <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <p className="text-sm text-destructive">
                            <strong>Time conflict with:</strong> {course.conflictWith}
                          </p>
                        </div>
                      )}

                      {course.status === 'waitlist' && (
                        <div className="mt-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                          <p className="text-sm text-warning">
                            This course is full. You will be added to the waitlist.
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCourse(course.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Summary</CardTitle>
                <CardDescription>Review before submitting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Courses</span>
                  <span className="font-medium text-foreground">{cartCourses.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium text-success">{availableCourses.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Waitlist</span>
                  <span className="font-medium text-warning">
                    {cartCourses.filter(c => c.status === 'waitlist').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conflicts</span>
                  <span className="font-medium text-destructive">
                    {cartCourses.filter(c => c.status === 'conflict').length}
                  </span>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total Credits</span>
                    <span className="text-2xl font-bold text-primary">{totalCredits}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button
                  className="w-full"
                  disabled={hasConflicts || cartCourses.length === 0}
                  onClick={enrollAll}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Enroll in All Available
                </Button>
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </CardFooter>
            </Card>

            {/* Schedule Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schedule Preview</CardTitle>
                <CardDescription className="text-xs">
                  Quick view of your weekly schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableCourses.map(course => (
                    <div
                      key={course.id}
                      className="p-2 bg-primary/10 rounded border border-primary/20 text-xs"
                    >
                      <div className="font-medium text-foreground">{course.code}</div>
                      <div className="text-muted-foreground">{course.schedule}</div>
                    </div>
                  ))}
                  {availableCourses.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No courses to display
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
