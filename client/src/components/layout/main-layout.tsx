import { ReactNode } from "react";
import Sidebar from "./sidebar";
import TopBar from "./topbar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-0 ml-0 transition-all duration-300">
        <TopBar />
        <div className="p-6" data-testid="main-content">
          {children}
        </div>
      </main>
    </div>
  );
}
