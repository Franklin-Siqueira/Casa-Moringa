import { useLocation } from "wouter";
import { Bell, Settings, Menu } from "lucide-react";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/calendar": "Calendário",
  "/reservations": "Reservas",
  "/guests": "Hóspedes",
  "/property": "Propriedade",
  "/maintenance": "Manutenção",
  "/finances": "Financeiro",
  "/reports": "Relatórios",
  "/messages": "Mensagens",
};

export default function TopBar() {
  const [location] = useLocation();
  const pageTitle = pageNames[location] || "Dashboard";

  const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar?.classList.contains('-translate-x-full')) {
      sidebar.classList.remove('-translate-x-full');
      overlay?.classList.remove('hidden');
    } else {
      sidebar?.classList.add('-translate-x-full');
      overlay?.classList.add('hidden');
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-gray-200 sticky top-0 z-20" data-testid="topbar">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center space-x-4">
          <button className="lg:hidden" onClick={toggleSidebar} data-testid="button-menu">
            <Menu className="text-gray-500 w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900" data-testid="page-title">{pageTitle}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors" data-testid="button-notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-danger rounded-full"></span>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" data-testid="button-settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
