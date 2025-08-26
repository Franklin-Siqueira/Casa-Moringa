import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, TrendingUp, DollarSign, Star, Plus, Fan, MessageSquare, FileText, ChevronRight, User, ArrowUp } from "lucide-react";
import { useState } from "react";
import NewBookingModal from "@/components/modals/new-booking-modal";
import type { BookingWithGuest } from "@shared/schema";

interface DashboardStats {
  occupancyRate: number;
  monthlyRevenue: number;
  activeReservations: number;
  averageRating: number;
  totalReviews: number;
}

export default function Dashboard() {
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: upcomingBookings, isLoading: bookingsLoading } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const quickActions = [
    {
      name: "Nova Reserva",
      icon: Plus,
      onClick: () => setIsNewBookingOpen(true),
      testId: "button-new-booking"
    },
    {
      name: "Agendar Limpeza",
      icon: Fan,
      onClick: () => {},
      testId: "button-schedule-cleaning"
    },
    {
      name: "Enviar Mensagem",
      icon: MessageSquare,
      onClick: () => {},
      testId: "button-send-message"
    },
    {
      name: "Gerar Relatório",
      icon: FileText,
      onClick: () => {},
      testId: "button-generate-report"
    },
  ];

  if (statsLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-dashboard">Carregando...</div>;
  }

  return (
    <>
      <div data-testid="dashboard-section">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">Taxa de Ocupação</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-occupancy-rate">
                    {stats?.occupancyRate || 0}%
                  </p>
                  <p className="text-accent text-sm font-medium mt-1">
                    <ArrowUp className="w-4 h-4 inline mr-1" />
                    +12% vs mês passado
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-accent w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">Receita Mensal</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-monthly-revenue">
                    R$ {stats?.monthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || '0'}
                  </p>
                  <p className="text-accent text-sm font-medium mt-1">
                    <ArrowUp className="w-4 h-4 inline mr-1" />
                    +8% vs mês passado
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-primary w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">Reservas Ativas</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-active-reservations">
                    {stats?.activeReservations || 0}
                  </p>
                  <p className="text-secondary text-sm font-medium mt-1">
                    <CalendarDays className="w-4 h-4 inline mr-1" />
                    Próximas 30 dias
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <CalendarDays className="text-warning w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">Avaliação Média</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-average-rating">
                    {stats?.averageRating || 0}
                  </p>
                  <p className="text-accent text-sm font-medium mt-1">
                    <Star className="w-4 h-4 inline mr-1" />
                    {stats?.totalReviews || 0} avaliações
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="text-yellow-500 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                <div className="space-y-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.name}
                        variant="ghost"
                        className="w-full justify-between p-3 h-auto text-left hover:bg-gray-50"
                        onClick={action.onClick}
                        data-testid={action.testId}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5 text-primary" />
                          <span className="font-medium">{action.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bookings */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Próximas Reservas</h3>
                  <Button variant="link" className="text-primary hover:text-primary-dark text-sm font-medium p-0">
                    Ver todas
                  </Button>
                </div>
                <div className="space-y-4">
                  {bookingsLoading ? (
                    <div data-testid="loading-bookings">Carregando reservas...</div>
                  ) : !upcomingBookings || upcomingBookings.length === 0 ? (
                    <div data-testid="empty-bookings" className="text-center py-8 text-gray-500">
                      Nenhuma reserva encontrada
                    </div>
                  ) : (
                    upcomingBookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`booking-${booking.id}`}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            booking.status === 'confirmed' ? 'bg-primary/10' : 'bg-warning/10'
                          }`}>
                            <User className={`w-5 h-5 ${
                              booking.status === 'confirmed' ? 'text-primary' : 'text-warning'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900" data-testid={`guest-name-${booking.id}`}>
                              {booking.guest.name}
                            </p>
                            <p className="text-sm text-secondary">
                              {new Date(booking.checkIn).toLocaleDateString('pt-BR')} - {new Date(booking.checkOut).toLocaleDateString('pt-BR')} • {Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))} noites
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            R$ {parseFloat(booking.totalAmount).toLocaleString('pt-BR')}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'confirmed' 
                              ? 'bg-accent/10 text-accent' 
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Calendar Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Visão do Mês - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm font-medium p-0">
                Ver calendário completo
              </Button>
            </div>
            
            {/* Simplified Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {/* Days of week header */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-secondary">
                  {day}
                </div>
              ))}
              
              {/* Calendar days - simplified for demo */}
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="bg-card p-3 h-20 relative">
                  <span className="text-sm font-medium">{((i % 31) + 1)}</span>
                  {/* Show bookings on specific days for demo */}
                  {(i === 14 || i === 15 || i === 16 || i === 17) && (
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className="text-xs bg-primary text-white rounded px-1 py-0.5 truncate">
                        Reserva
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <NewBookingModal isOpen={isNewBookingOpen} onClose={() => setIsNewBookingOpen(false)} />
    </>
  );
}
