import { GraduationCap } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Logo and name */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                The Chinese University of Hong Kong, Shenzhen
              </p>
              <p className="text-xs text-muted-foreground">Student Information System</p>
            </div>
          </div>

          {/* Right: Copyright */}
          <div className="text-center md:text-right">
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} CUHK-Shenzhen. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Version 2.0 - Built with React & TypeScript
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
