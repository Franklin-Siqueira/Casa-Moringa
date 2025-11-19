import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import TopBar from "./topbar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <main className="flex-1 lg:ml-0 ml-0 transition-all duration-300">
        <TopBar onToggleSidebar={toggleSidebar} />
        <div className="p-4 md:p-6" data-testid="main-content">
          {children}
        </div>
      </main>
    </div>
  );
}
