import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, TrendingUp, DollarSign, Star, Plus, Fan, MessageSquare, FileText, ChevronRight, User, ArrowUp, Wrench } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import NewBookingModal from "@/components/modals/new-booking-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BookingWithGuest, Guest, Property, InsertMaintenanceTask, InsertMessage } from "@shared/schema";
import { insertMaintenanceTaskSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

interface DashboardStats {
  occupancyRate: number;
  monthlyRevenue: number;
  activeReservations: number;
  averageRating: number;
  totalReviews: number;
}

const maintenanceFormSchema = insertMaintenanceTaskSchema.omit({ propertyId: true });
const messageFormSchema = insertMessageSchema.omit({ guestId: true });

export default function Dashboard() {
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isCleaningModalOpen, setIsCleaningModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: upcomingBookings, isLoading: bookingsLoading } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const maintenanceForm = useForm({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      type: "cleaning",
      title: "",
      description: "",
      scheduledDate: "",
    },
  });

  const messageForm = useForm({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      bookingId: "",
      subject: "",
      content: "",
      type: "general",
    },
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof maintenanceFormSchema> & { propertyId: string }) => {
      const response = await apiRequest("POST", "/api/maintenance", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({
        title: "Sucesso",
        description: "Tarefa de manutenção agendada com sucesso!",
      });
      maintenanceForm.reset();
      setIsCleaningModalOpen(false);
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof messageFormSchema> & { guestId: string }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      });
      messageForm.reset();
      setIsMessageModalOpen(false);
    },
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
      onClick: () => setIsCleaningModalOpen(true),
      testId: "button-schedule-cleaning"
    },
    {
      name: "Enviar Mensagem",
      icon: MessageSquare,
      onClick: () => setIsMessageModalOpen(true),
      testId: "button-send-message"
    },
    {
      name: "Gerar Relatório",
      icon: FileText,
      onClick: () => navigate("/reports"),
      testId: "button-generate-report"
    },
  ];

  const handleScheduleCleaning = (data: z.infer<typeof maintenanceFormSchema>) => {
    if (!properties || properties.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma propriedade encontrada. Cadastre uma propriedade primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    createMaintenanceMutation.mutate({
      ...data,
      propertyId: properties[0].id, // Use primeira propriedade por padrão
    });
  };

  const handleSendMessage = (data: z.infer<typeof messageFormSchema>) => {
    if (!data.bookingId) {
      toast({
        title: "Erro",
        description: "Selecione uma reserva para enviar a mensagem.",
        variant: "destructive",
      });
      return;
    }

    const booking = upcomingBookings?.find(b => b.id === data.bookingId);
    if (!booking) {
      toast({
        title: "Erro",
        description: "Reserva não encontrada.",
        variant: "destructive",
      });
      return;
    }

    createMessageMutation.mutate({
      ...data,
      guestId: booking.guestId,
    });
  };

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
      
      {/* Schedule Cleaning Modal */}
      <Dialog open={isCleaningModalOpen} onOpenChange={setIsCleaningModalOpen}>
        <DialogContent data-testid="cleaning-modal">
          <DialogHeader>
            <DialogTitle>Agendar Limpeza</DialogTitle>
            <DialogDescription>
              Agende uma tarefa de limpeza para sua propriedade.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...maintenanceForm}>
            <form onSubmit={maintenanceForm.handleSubmit(handleScheduleCleaning)} className="space-y-4">
              <FormField
                control={maintenanceForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Limpeza geral, Limpeza entre hóspedes" {...field} data-testid="input-cleaning-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={maintenanceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva os detalhes da limpeza..."
                        {...field}
                        data-testid="textarea-cleaning-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={maintenanceForm.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Agendada</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-cleaning-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCleaningModalOpen(false)}
                  data-testid="button-cancel-cleaning"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMaintenanceMutation.isPending}
                  data-testid="button-save-cleaning"
                >
                  {createMaintenanceMutation.isPending ? "Agendando..." : "Agendar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Send Message Modal */}
      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent data-testid="message-modal">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
            <DialogDescription>
              Envie uma mensagem para um hóspede sobre sua reserva.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...messageForm}>
            <form onSubmit={messageForm.handleSubmit(handleSendMessage)} className="space-y-4">
              <FormField
                control={messageForm.control}
                name="bookingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reserva</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-message-booking">
                          <SelectValue placeholder="Selecionar reserva" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {upcomingBookings?.map((booking) => (
                          <SelectItem key={booking.id} value={booking.id}>
                            {booking.guest.name} - {new Date(booking.checkIn).toLocaleDateString('pt-BR')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={messageForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-message-type">
                          <SelectValue placeholder="Selecionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">Geral</SelectItem>
                        <SelectItem value="check_in_instructions">Instruções Check-in</SelectItem>
                        <SelectItem value="reminder">Lembrete</SelectItem>
                        <SelectItem value="complaint">Reclamação</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={messageForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input placeholder="Assunto da mensagem" {...field} data-testid="input-message-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={messageForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Digite sua mensagem..."
                        {...field}
                        data-testid="textarea-message-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsMessageModalOpen(false)}
                  data-testid="button-cancel-message"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMessageMutation.isPending}
                  data-testid="button-send-message-submit"
                >
                  {createMessageMutation.isPending ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
