import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex items-center justify-center",
        "w-10 h-10 rounded-lg",
        "bg-secondary hover:bg-accent",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
      aria-label="Toggle theme"
    >
      <Sun
        className={cn(
          "h-5 w-5 transition-all duration-300",
          theme === 'light' ? 'rotate-0 scale-100' : 'rotate-90 scale-0 absolute'
        )}
      />
      <Moon
        className={cn(
          "h-5 w-5 transition-all duration-300",
          theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0 absolute'
        )}
      />
    </button>
  );
}
