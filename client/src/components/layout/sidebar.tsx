import { Link, useLocation } from "wouter";
import { Home, Calendar, Bookmark, Users, Building, Wrench, DollarSign, BarChart, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart },
  { name: "Calendário", href: "/calendar", icon: Calendar },
  { name: "Reservas", href: "/reservations", icon: Bookmark },
  { name: "Hóspedes", href: "/guests", icon: Users },
  { name: "Propriedade", href: "/property", icon: Building },
  { name: "Manutenção", href: "/maintenance", icon: Wrench },
  { name: "Financeiro", href: "/finances", icon: DollarSign },
  { name: "Relatórios", href: "/reports", icon: BarChart },
  { name: "Mensagens", href: "/messages", icon: MessageSquare },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div id="sidebar-overlay" className="fixed inset-0 z-20 bg-black bg-opacity-50 hidden lg:hidden"></div>
      
      <aside className="w-64 bg-card shadow-lg border-r border-gray-200 fixed lg:relative lg:translate-x-0 transform -translate-x-full lg:block z-30 transition-transform duration-300" id="sidebar" data-testid="sidebar">
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Home className="text-white w-4 h-4" />
            </div>
            <span className="text-xl font-bold text-gray-900">RentManager</span>
          </div>
          <button className="lg:hidden" data-testid="button-close-sidebar">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="mt-6">
          <ul className="space-y-1 px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <a
                      className={cn(
                        "sidebar-nav-item",
                        isActive ? "active" : ""
                      )}
                      data-testid={`nav-${item.name.toLowerCase()}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">João Silva</p>
              <p className="text-sm text-secondary">Proprietário</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
