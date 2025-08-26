import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { BookingWithGuest } from "@shared/schema";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: bookings, isLoading } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateLoop = new Date(startDate);
    
    while (days.length < 42) { // 6 weeks × 7 days
      days.push(new Date(currentDateLoop));
      currentDateLoop.setDate(currentDateLoop.getDate() + 1);
    }
    
    return days;
  };

  const getBookingForDate = (date: Date) => {
    if (!bookings) return null;
    
    return bookings.find(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      return date >= checkIn && date < checkOut;
    });
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-calendar">Carregando...</div>;
  }

  return (
    <div data-testid="calendar-section">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5" />
              <span>Calendário de Reservas</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center" data-testid="current-month">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                data-testid="button-next-month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Days of week header */}
            {daysOfWeek.map((day) => (
              <div key={day} className="bg-gray-50 p-4 text-center text-sm font-medium text-secondary">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth().map((date, index) => {
              const booking = getBookingForDate(date);
              const isInCurrentMonth = isCurrentMonth(date);
              const isTodayDate = isToday(date);
              
              return (
                <div
                  key={index}
                  className={`bg-card p-4 h-24 relative border-r border-b border-gray-100 ${
                    !isInCurrentMonth ? 'opacity-30' : ''
                  } ${
                    booking ? (
                      booking.status === 'confirmed' ? 'bg-primary/10 border-l-4 border-primary' :
                      booking.status === 'pending' ? 'bg-warning/10 border-l-4 border-warning' :
                      'bg-gray-100 border-l-4 border-gray-400'
                    ) : ''
                  }`}
                  data-testid={`calendar-day-${date.getDate()}`}
                >
                  <span className={`text-sm font-medium ${
                    isTodayDate ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
                  }`}>
                    {date.getDate()}
                  </span>
                  
                  {booking && (
                    <div className="absolute bottom-1 left-1 right-1">
                      <div
                        className={`text-xs text-white rounded px-1 py-0.5 truncate ${
                          booking.status === 'confirmed' ? 'bg-primary' :
                          booking.status === 'pending' ? 'bg-warning' :
                          'bg-gray-400'
                        }`}
                        title={`${booking.guest.name} - ${booking.status}`}
                        data-testid={`booking-${booking.id}`}
                      >
                        {booking.guest.name.split(' ')[0]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center space-x-8 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary rounded"></div>
              <span className="text-sm text-gray-600">Confirmada</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-warning rounded"></div>
              <span className="text-sm text-gray-600">Pendente</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-sm text-gray-600">Cancelada</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
