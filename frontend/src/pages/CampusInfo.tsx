import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { campusAPI, adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X } from 'lucide-react';

type ViewType = 'announcements' | 'events';

export function CampusInfo() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const [activeView, setActiveView] = useState<ViewType>('announcements');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['campus-announcements'],
    queryFn: () => campusAPI.getAnnouncements().then(res => res.data.data),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['campus-events', selectedCategory],
    queryFn: () => campusAPI.getEvents(selectedCategory ? { category: selectedCategory } : undefined).then(res => res.data.data),
  });

  const registerMutation = useMutation({
    mutationFn: (eventId: number) => campusAPI.registerForEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campus-events'] });
      alert('Successfully registered for event!');
    },
    onError: () => {
      alert('Failed to register for event. You may already be registered.');
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (data: any) => adminAPI.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campus-announcements'] });
      setShowAnnouncementForm(false);
      alert('Announcement created successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to create announcement: ${error.response?.data?.message || error.message}`);
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (data: any) => adminAPI.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campus-events'] });
      setShowEventForm(false);
      alert('Event created successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to create event: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleRegister = (eventId: number) => {
    if (window.confirm('Would you like to register for this event?')) {
      registerMutation.mutate(eventId);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'ACADEMIC': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'SOCIAL': 'bg-pink-100 text-pink-800',
      'CAREER': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'SPORTS': 'bg-orange-100 text-orange-800',
      'CULTURAL': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'GENERAL': 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
    };
    return colors[category] || 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'ACADEMIC': '',
      'SOCIAL': '',
      'CAREER': '',
      'SPORTS': '',
      'CULTURAL': '',
      'GENERAL': '',
    };
    return icons[category] || '';
  };

  const eventCategories = [
    { value: '', label: 'All Events' },
    { value: 'ACADEMIC', label: 'Academic' },
    { value: 'SOCIAL', label: 'Social' },
    { value: 'CAREER', label: 'Career' },
    { value: 'SPORTS', label: 'Sports' },
    { value: 'CULTURAL', label: 'Cultural' },
  ];

  const isLoading = announcementsLoading || eventsLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campus Information</h1>
          <p className="mt-2 text-muted-foreground">
            {isAdmin ? 'Manage announcements and campus events' : 'Stay updated with announcements and campus events'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {activeView === 'announcements' && (
              <button
                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {showAnnouncementForm ? 'Cancel' : 'New Announcement'}
              </button>
            )}
            {activeView === 'events' && (
              <button
                onClick={() => setShowEventForm(!showEventForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {showEventForm ? 'Cancel' : 'New Event'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-lg shadow mb-6">
        <div className="border-b border-border">
          <nav className="-mb-px flex">
            <button
              onClick={() => {
                setActiveView('announcements');
                setShowEventForm(false);
              }}
              className={`flex items-center py-4 px-6 text-center text-sm font-medium border-b-2 ${
                activeView === 'announcements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Announcements
            </button>
            <button
              onClick={() => {
                setActiveView('events');
                setShowAnnouncementForm(false);
              }}
              className={`flex items-center py-4 px-6 text-center text-sm font-medium border-b-2 ${
                activeView === 'events'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Events
            </button>
          </nav>
        </div>
      </div>

      {/* Create Announcement Form (Admin Only) */}
      {isAdmin && showAnnouncementForm && activeView === 'announcements' && (
        <AnnouncementForm
          onSubmit={(data) => createAnnouncementMutation.mutate(data)}
          onCancel={() => setShowAnnouncementForm(false)}
          isLoading={createAnnouncementMutation.isPending}
        />
      )}

      {/* Create Event Form (Admin Only) */}
      {isAdmin && showEventForm && activeView === 'events' && (
        <EventForm
          onSubmit={(data) => createEventMutation.mutate(data)}
          onCancel={() => setShowEventForm(false)}
          isLoading={createEventMutation.isPending}
        />
      )}

      {/* Announcements View */}
      {activeView === 'announcements' && (
        <div>
          {announcementsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-6">
              {announcements.map((announcement: any) => (
                <div
                  key={announcement.id}
                  className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-3">
                            {getCategoryIcon(announcement.category)}
                          </span>
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">
                              {announcement.title}
                            </h3>
                            <div className="flex items-center mt-1 text-sm text-muted-foreground">
                              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Posted on {new Date(announcement.publishedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getCategoryColor(announcement.category)}`}>
                        {announcement.category}
                      </span>
                    </div>

                    <div className="prose max-w-none">
                      <p className="text-foreground whitespace-pre-line">{announcement.content}</p>
                    </div>

                    {announcement.attachmentUrl && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <a
                          href={announcement.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          View Attachment
                        </a>
                      </div>
                    )}

                    {announcement.expiresAt && new Date(announcement.expiresAt) > new Date() && (
                      <div className="mt-4 flex items-center text-sm text-amber-600">
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Expires on {new Date(announcement.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">No announcements</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                There are no announcements at this time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Events View */}
      {activeView === 'events' && (
        <div>
          {/* Filter */}
          <div className="mb-6 bg-card rounded-lg shadow p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-foreground">Filter by category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {eventCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event: any) => {
                const eventDate = new Date(event.startTime);
                const isPast = eventDate < new Date();
                const registrationOpen = event.registrationOpen && !isPast;

                return (
                  <div
                    key={event.id}
                    className={`bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                      isPast ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{getCategoryIcon(event.category)}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(event.category)}`}>
                          {event.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {event.title}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {event.description}
                      </p>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {eventDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>

                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {eventDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {event.endTime && (
                            <> - {new Date(event.endTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</>
                          )}
                        </div>

                        {event.location && (
                          <div className="flex items-center">
                            <svg className="h-4 w-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.location}
                          </div>
                        )}

                        {event.maxParticipants && (
                          <div className="flex items-center">
                            <svg className="h-4 w-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {event.currentParticipants || 0} / {event.maxParticipants} registered
                          </div>
                        )}
                      </div>

                      {isPast && (
                        <div className="mt-4 px-3 py-2 bg-gray-100 text-muted-foreground text-sm rounded text-center">
                          Event has ended
                        </div>
                      )}

                      {!isPast && registrationOpen && (
                        <button
                          onClick={() => handleRegister(event.id)}
                          disabled={registerMutation.isPending || (event.maxParticipants && event.currentParticipants >= event.maxParticipants)}
                          className="mt-4 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {event.maxParticipants && event.currentParticipants >= event.maxParticipants
                            ? 'Event Full'
                            : 'Register'}
                        </button>
                      )}

                      {!isPast && !registrationOpen && (
                        <div className="mt-4 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm rounded text-center">
                          Registration closed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">No events found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCategory
                  ? 'No events in this category. Try selecting a different filter.'
                  : 'There are no upcoming events at this time.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Announcement Form Component
function AnnouncementForm({ onSubmit, onCancel, isLoading }: { 
  onSubmit: (data: any) => void; 
  onCancel: () => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'GENERAL',
    priority: 'NORMAL',
    target_audience: ['ALL'],
    publish_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    is_active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      publish_date: formData.publish_date ? new Date(formData.publish_date).toISOString() : new Date().toISOString(),
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
    };
    onSubmit(submitData);
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Create New Announcement</h2>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={6}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GENERAL">General</option>
              <option value="ACADEMIC">Academic</option>
              <option value="ADMINISTRATIVE">Administrative</option>
              <option value="EVENT">Event</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Publish Date
            </label>
            <input
              type="date"
              value={formData.publish_date}
              onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
          />
          <label htmlFor="is_active" className="ml-2 text-sm text-foreground">
            Active (visible to users)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Event Form Component
function EventForm({ onSubmit, onCancel, isLoading }: { 
  onSubmit: (data: any) => void; 
  onCancel: () => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    category: 'SOCIAL',
    organizer: '',
    registration_url: '',
    capacity: '',
    is_public: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      registration_url: formData.registration_url || null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
    };
    onSubmit(submitData);
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Create New Event</h2>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SOCIAL">Social</option>
              <option value="ACADEMIC">Academic</option>
              <option value="CULTURAL">Cultural</option>
              <option value="SPORTS">Sports</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="CAREER">Career</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Organizer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Capacity (Optional)
            </label>
            <input
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Registration URL (Optional)
          </label>
          <input
            type="url"
            value={formData.registration_url}
            onChange={(e) => setFormData({ ...formData, registration_url: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_public"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
          />
          <label htmlFor="is_public" className="ml-2 text-sm text-foreground">
            Public Event (visible to all users)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
