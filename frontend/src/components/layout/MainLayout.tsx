import { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onMenuClick={toggleSidebar} isSidebarOpen={sidebarOpen} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* Main content - with padding for sidebar on desktop */}
        <main className="flex-1 lg:pl-64 transition-all duration-300">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      <div className="lg:pl-64">
        <Footer />
      </div>
    </div>
  );
}
