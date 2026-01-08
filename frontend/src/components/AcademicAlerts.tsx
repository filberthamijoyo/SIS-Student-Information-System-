import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Alert {
  id: string;
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  category: 'CORE' | 'MAJOR' | 'GPA' | 'GRADUATION' | 'ENROLLMENT';
  title: string;
  message: string;
  actionRequired?: string;
  deadline?: string;
}

export function AcademicAlerts() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ['academic-alerts'],
    queryFn: async () => {
      const response = await api.get('/students/alerts');
      return response.data.data || [];
    },
  });

  const activeAlerts = alerts?.filter((alert) => !dismissedAlerts.has(alert.id)) || [];

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(id));
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return {
          container: 'bg-red-50 dark:bg-red-950/30 border-red-500',
          icon: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-100 dark:bg-red-900',
        };
      case 'HIGH':
        return {
          container: 'bg-orange-50 dark:bg-orange-950/30 border-orange-500',
          icon: 'text-orange-600 dark:text-orange-400',
          iconBg: 'bg-orange-100 dark:bg-orange-900',
        };
      case 'MEDIUM':
        return {
          container: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500',
          icon: 'text-yellow-600 dark:text-yellow-400',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900',
        };
      default:
        return {
          container: 'bg-blue-50 dark:bg-blue-950/30 border-blue-500',
          icon: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900',
        };
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'CRITICAL':
      case 'HIGH':
        return AlertCircle;
      case 'MEDIUM':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  if (!activeAlerts.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {activeAlerts.map((alert) => {
        const style = getAlertStyle(alert.type);
        const Icon = getAlertIcon(alert.type);

        return (
          <div
            key={alert.id}
            className={`border-l-4 rounded-lg p-4 ${style.container} relative`}
          >
            <button
              onClick={() => dismissAlert(alert.id)}
              className="absolute top-3 right-3 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
              aria-label="Dismiss alert"
            >
              <X className={`h-4 w-4 ${style.icon}`} />
            </button>

            <div className="flex items-start gap-3 pr-8">
              <div className={`flex-shrink-0 ${style.iconBg} p-2 rounded-lg`}>
                <Icon className={`h-5 w-5 ${style.icon}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">{alert.title}</h4>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${style.iconBg} ${style.icon}`}>
                    {alert.type}
                  </span>
                </div>

                <p className="text-sm text-foreground/80 mb-2">{alert.message}</p>

                {alert.actionRequired && (
                  <div className="bg-white/50 dark:bg-black/20 rounded p-3 mt-2">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Action Required:
                    </p>
                    <p className="text-sm text-foreground/80">{alert.actionRequired}</p>
                  </div>
                )}

                {alert.deadline && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-semibold">Deadline:</span> {alert.deadline}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
