import React from 'react';
import { useAuth } from '../context/AuthContext';
import AddDropCourse from '../components/AddDropCourse';

type AddDropTab = 'add' | 'drop' | 'requests';

interface AddDropPageProps {
  initialTab?: AddDropTab;
}

const AddDropPage: React.FC<AddDropPageProps> = ({ initialTab = 'add' }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            Please log in to access add/drop course requests.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Add/Drop Courses</h1>
          <p className="mt-2 text-muted-foreground">
            Submit requests to add or drop courses for the current term
          </p>
        </div>

        {/* Add/Drop Component */}
        <AddDropCourse currentUser={user} initialTab={initialTab} />
      </div>
    </div>
  );
};

export default AddDropPage;
