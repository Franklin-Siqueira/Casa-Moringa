import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, FileText, Download, Calendar, TrendingUp, Users, DollarSign, Star, Building } from "lucide-react";
import { useState } from "react";
import type { BookingWithGuest, Expense } from "@shared/schema";

export default function Reports() {
  const [reportPeriod, setReportPeriod] = useState("this_month");
  const [reportType, setReportType] = useState("overview");

  const { data: bookings, isLoading: bookingsLoading } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Filter data based on selected period
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (reportPeriod) {
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case "last_year":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const filteredBookings = bookings?.filter(booking => {
    const checkIn = new Date(booking.checkIn);
    return checkIn >= startDate && checkIn <= endDate;
  }) || [];

  const filteredExpenses = expenses?.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  }) || [];

  // Calculate metrics
  const totalBookings = filteredBookings.length;
  const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((sum, booking) => sum + parseFloat(booking.totalAmount), 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const netIncome = totalRevenue - totalExpenses;
  const averageBookingValue = confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0;
  const totalGuests = confirmedBookings.reduce((sum, booking) => sum + booking.numberOfGuests, 0);
  const averageStayLength = confirmedBookings.length > 0 
    ? confirmedBookings.reduce((sum, booking) => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        return sum + nights;
      }, 0) / confirmedBookings.length 
    : 0;

  // Expense breakdown by category
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + parseFloat(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const getCategoryLabel = (category: string) => {
    const labels = {
      maintenance: "Manutenção",
      utilities: "Utilidades",
      supplies: "Suprimentos",
      insurance: "Seguro",
      taxes: "Impostos",
      other: "Outros"
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getPeriodLabel = () => {
    const labels = {
      this_month: "Este Mês",
      last_month: "Mês Passado",
      this_year: "Este Ano",
      last_year: "Ano Passado"
    };
    return labels[reportPeriod as keyof typeof labels] || "Este Mês";
  };

  const exportReport = () => {
    const reportData = {
      period: getPeriodLabel(),
      dateRange: `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`,
      metrics: {
        totalBookings,
        confirmedBookings: confirmedBookings.length,
        totalRevenue,
        totalExpenses,
        netIncome,
        averageBookingValue,
        totalGuests,
        averageStayLength
      },
      bookings: filteredBookings,
      expenses: filteredExpenses,
      expensesByCategory
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${reportPeriod}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (bookingsLoading || expensesLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-reports">Carregando...</div>;
  }

  return (
    <div className="space-y-8" data-testid="reports-section">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart className="w-5 h-5" />
              <span>Relatórios</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger className="w-[150px]" data-testid="select-report-period">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Este Mês</SelectItem>
                  <SelectItem value="last_month">Mês Passado</SelectItem>
                  <SelectItem value="this_year">Este Ano</SelectItem>
                  <SelectItem value="last_year">Ano Passado</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportReport} data-testid="button-export-report">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Período: {startDate.toLocaleDateString('pt-BR')} - {endDate.toLocaleDateString('pt-BR')}
          </p>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium">Total de Reservas</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-bookings">
                  {totalBookings}
                </p>
                <p className="text-accent text-sm font-medium mt-1">
                  {confirmedBookings.length} confirmadas
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-revenue">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-accent text-sm font-medium mt-1">
                  Média: R$ {averageBookingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <DollarSign className="text-accent w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium">Total de Hóspedes</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-guests">
                  {totalGuests}
                </p>
                <p className="text-secondary text-sm font-medium mt-1">
                  Estadia média: {averageStayLength.toFixed(1)} noites
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium">Lucro Líquido</p>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-accent' : 'text-destructive'}`} data-testid="metric-net-income">
                  R$ {netIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-warning text-sm font-medium mt-1">
                  Despesas: R$ {totalExpenses.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${netIncome >= 0 ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                <TrendingUp className={`w-6 h-6 ${netIncome >= 0 ? 'text-accent' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {confirmedBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="empty-revenue">
                  Nenhuma receita no período selecionado
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Reservas Confirmadas</span>
                    <span className="font-bold text-accent">
                      R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span>Número de reservas:</span>
                      <span>{confirmedBookings.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor médio por reserva:</span>
                      <span>R$ {averageBookingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de noites:</span>
                      <span>{confirmedBookings.reduce((sum, booking) => {
                        const checkIn = new Date(booking.checkIn);
                        const checkOut = new Date(booking.checkOut);
                        return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                      }, 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(expensesByCategory).length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="empty-expenses-breakdown">
                  Nenhuma despesa no período selecionado
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(expensesByCategory)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{getCategoryLabel(category)}</span>
                        <span className="font-bold text-destructive">
                          R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total de Despesas</span>
                      <span className="text-destructive">
                        R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Status Report */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="empty-booking-status">
              Nenhuma reserva no período selecionado
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-accent/10 rounded-lg">
                <div className="text-2xl font-bold text-accent mb-2">
                  {filteredBookings.filter(b => b.status === 'confirmed').length}
                </div>
                <div className="text-sm font-medium text-accent">Confirmadas</div>
                <div className="text-xs text-gray-600 mt-1">
                  {totalBookings > 0 ? Math.round((filteredBookings.filter(b => b.status === 'confirmed').length / totalBookings) * 100) : 0}% do total
                </div>
              </div>
              
              <div className="text-center p-6 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning mb-2">
                  {filteredBookings.filter(b => b.status === 'pending').length}
                </div>
                <div className="text-sm font-medium text-warning">Pendentes</div>
                <div className="text-xs text-gray-600 mt-1">
                  {totalBookings > 0 ? Math.round((filteredBookings.filter(b => b.status === 'pending').length / totalBookings) * 100) : 0}% do total
                </div>
              </div>
              
              <div className="text-center p-6 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive mb-2">
                  {filteredBookings.filter(b => b.status === 'cancelled').length}
                </div>
                <div className="text-sm font-medium text-destructive">Canceladas</div>
                <div className="text-xs text-gray-600 mt-1">
                  {totalBookings > 0 ? Math.round((filteredBookings.filter(b => b.status === 'cancelled').length / totalBookings) * 100) : 0}% do total
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
