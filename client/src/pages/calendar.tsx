import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, User, Wrench, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BookingWithGuest, MaintenanceTask, Expense, Property, Guest } from "@shared/schema";

// Schema definitions for calendar forms
const bookingSchema = z.object({
  propertyId: z.string().min(1, "Propriedade é obrigatória"),
  guestId: z.string().min(1, "Hóspede é obrigatório"),
  checkIn: z.string().min(1, "Data de entrada é obrigatória"),
  checkOut: z.string().min(1, "Data de saída é obrigatória"),
  numberOfGuests: z.string().min(1, "Número de hóspedes é obrigatório"),
  totalAmount: z.string().min(1, "Valor total é obrigatório"),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  notes: z.string().optional(),
});

const maintenanceSchema = z.object({
  propertyId: z.string().min(1, "Propriedade é obrigatória"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  type: z.enum(["cleaning", "repair", "maintenance", "inspection"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  scheduledDate: z.string().min(1, "Data é obrigatória"),
  assignedTo: z.string().optional(),
  cost: z.string().optional(),
  notes: z.string().optional(),
});

const expenseSchema = z.object({
  propertyId: z.string().min(1, "Propriedade é obrigatória"),
  category: z.enum(["maintenance", "utilities", "supplies", "insurance", "taxes", "other"]),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
});

type BookingFormData = z.infer<typeof bookingSchema>;
type MaintenanceFormData = z.infer<typeof maintenanceSchema>;
type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalType, setModalType] = useState<'booking' | 'maintenance' | 'expense' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: bookings, isLoading: bookingsLoading } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: maintenanceTasks, isLoading: maintenanceLoading } = useQuery<MaintenanceTask[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  // Form setup
  const bookingForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      propertyId: "",
      guestId: "",
      checkIn: "",
      checkOut: "",
      numberOfGuests: "1",
      totalAmount: "",
      status: "pending",
      notes: "",
    },
  });

  const maintenanceForm = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      propertyId: "",
      title: "",
      description: "",
      type: "maintenance",
      status: "pending",
      scheduledDate: "",
      assignedTo: "",
      cost: "",
      notes: "",
    },
  });

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      propertyId: "",
      category: "other",
      description: "",
      amount: "",
      date: "",
    },
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

  // Mutation setup
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const bookingData = {
        ...data,
        checkIn: new Date(data.checkIn).toISOString(),
        checkOut: new Date(data.checkOut).toISOString(),
        numberOfGuests: parseInt(data.numberOfGuests),
      };
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Sucesso", description: "Reserva criada com sucesso!" });
      closeModal();
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar reserva.", variant: "destructive" });
    },
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      const taskData = {
        ...data,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
        cost: data.cost ? data.cost : undefined,
      };
      const response = await apiRequest("POST", "/api/maintenance", taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({ title: "Sucesso", description: "Tarefa de manutenção criada com sucesso!" });
      closeModal();
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar tarefa.", variant: "destructive" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const expenseData = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      const response = await apiRequest("POST", "/api/expenses", expenseData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Sucesso", description: "Despesa registrada com sucesso!" });
      closeModal();
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao registrar despesa.", variant: "destructive" });
    },
  });

  const getEventsForDate = (date: Date) => {
    const events: any[] = [];
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Bookings
    if (bookings) {
      const booking = bookings.find(booking => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        return targetDate >= checkIn && targetDate < checkOut;
      });
      if (booking) {
        events.push({ type: 'booking', data: booking });
      }
    }

    // Maintenance tasks
    if (maintenanceTasks) {
      const tasks = maintenanceTasks.filter(task => {
        if (!task.scheduledDate) return false;
        const scheduledDate = new Date(task.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        return scheduledDate.getTime() === targetDate.getTime();
      });
      tasks.forEach(task => {
        events.push({ type: 'maintenance', data: task });
      });
    }

    // Expenses
    if (expenses) {
      const dayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        expenseDate.setHours(0, 0, 0, 0);
        return expenseDate.getTime() === targetDate.getTime();
      });
      dayExpenses.forEach(expense => {
        events.push({ type: 'expense', data: expense });
      });
    }

    return events;
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const openModal = (type: 'booking' | 'maintenance' | 'expense', date: Date, item?: any) => {
    setSelectedDate(date);
    setModalType(type);
    setEditingItem(item);

    const dateString = date.toISOString().split('T')[0];

    if (item) {
      // Editing existing item
      if (type === 'booking') {
        bookingForm.reset({
          propertyId: item.propertyId,
          guestId: item.guestId,
          checkIn: new Date(item.checkIn).toISOString().split('T')[0],
          checkOut: new Date(item.checkOut).toISOString().split('T')[0],
          numberOfGuests: item.numberOfGuests.toString(),
          totalAmount: item.totalAmount,
          status: item.status,
          notes: item.notes || "",
        });
      } else if (type === 'maintenance') {
        maintenanceForm.reset({
          propertyId: item.propertyId,
          title: item.title,
          description: item.description || "",
          type: item.type,
          status: item.status,
          scheduledDate: new Date(item.scheduledDate).toISOString().split('T')[0],
          assignedTo: item.assignedTo || "",
          cost: item.cost || "",
          notes: item.notes || "",
        });
      } else if (type === 'expense') {
        expenseForm.reset({
          propertyId: item.propertyId,
          category: item.category,
          description: item.description,
          amount: item.amount,
          date: new Date(item.date).toISOString().split('T')[0],
        });
      }
    } else {
      // Creating new item
      if (type === 'booking') {
        bookingForm.reset({
          propertyId: "",
          guestId: "",
          checkIn: dateString,
          checkOut: dateString,
          numberOfGuests: "1",
          totalAmount: "",
          status: "pending",
          notes: "",
        });
      } else if (type === 'maintenance') {
        maintenanceForm.reset({
          propertyId: "",
          title: "",
          description: "",
          type: "maintenance",
          status: "pending",
          scheduledDate: dateString,
          assignedTo: "",
          cost: "",
          notes: "",
        });
      } else if (type === 'expense') {
        expenseForm.reset({
          propertyId: "",
          category: "other",
          description: "",
          amount: "",
          date: dateString,
        });
      }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedDate(null);
    setEditingItem(null);
    bookingForm.reset();
    maintenanceForm.reset();
    expenseForm.reset();
  };

  const onSubmit = (type: 'booking' | 'maintenance' | 'expense', data: any) => {
    if (type === 'booking') {
      createBookingMutation.mutate(data);
    } else if (type === 'maintenance') {
      createMaintenanceMutation.mutate(data);
    } else if (type === 'expense') {
      createExpenseMutation.mutate(data);
    }
  };

  const isLoading = bookingsLoading || maintenanceLoading || expensesLoading;

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
              <span>Calendário</span>
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
              const events = getEventsForDate(date);
              const isInCurrentMonth = isCurrentMonth(date);
              const isTodayDate = isToday(date);
              
              return (
                <div
                  key={index}
                  className={`bg-card p-2 h-32 relative border-r border-b border-gray-100 ${
                    !isInCurrentMonth ? 'opacity-30' : ''
                  }`}
                  data-testid={`calendar-day-${date.getDate()}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      isTodayDate ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
                    }`}>
                      {date.getDate()}
                    </span>
                    
                    {isInCurrentMonth && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                            data-testid={`add-event-${date.getDate()}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => openModal('booking', date)}
                            data-testid="add-booking"
                          >
                            <User className="mr-2 h-4 w-4" />
                            Nova Reserva
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openModal('maintenance', date)}
                            data-testid="add-maintenance"
                          >
                            <Wrench className="mr-2 h-4 w-4" />
                            Nova Manutenção
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openModal('expense', date)}
                            data-testid="add-expense"
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Nova Despesa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <div className="space-y-1 overflow-hidden">
                    {events.slice(0, 3).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        onClick={() => openModal(event.type, date, event.data)}
                        className="cursor-pointer hover:opacity-80"
                        data-testid={`event-${event.type}-${event.data.id}`}
                      >
                        {event.type === 'booking' && (
                          <div
                            className={`text-xs text-white rounded px-1 py-0.5 truncate flex items-center ${
                              event.data.status === 'confirmed' ? 'bg-primary' :
                              event.data.status === 'pending' ? 'bg-warning' :
                              'bg-gray-400'
                            }`}
                            title={`${event.data.guest.name} - ${event.data.status}`}
                          >
                            <User className="w-3 h-3 mr-1" />
                            {event.data.guest.name.split(' ')[0]}
                          </div>
                        )}
                        
                        {event.type === 'maintenance' && (
                          <div
                            className={`text-xs text-white rounded px-1 py-0.5 truncate flex items-center ${
                              event.data.status === 'completed' ? 'bg-green-600' :
                              event.data.status === 'in_progress' ? 'bg-blue-600' :
                              'bg-orange-600'
                            }`}
                            title={`${event.data.title} - ${event.data.status}`}
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            {event.data.title.substring(0, 8)}
                          </div>
                        )}
                        
                        {event.type === 'expense' && (
                          <div
                            className="text-xs text-white rounded px-1 py-0.5 truncate flex items-center bg-red-600"
                            title={`${event.data.description} - R$ ${event.data.amount}`}
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            R$ {parseFloat(event.data.amount).toFixed(0)}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {events.length > 3 && (
                      <div className="text-xs text-gray-500 truncate">
                        +{events.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-3 gap-8 mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Reservas</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span className="text-xs text-gray-600">Confirmada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-warning rounded"></div>
                  <span className="text-xs text-gray-600">Pendente</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded"></div>
                  <span className="text-xs text-gray-600">Cancelada</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Manutenção</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span className="text-xs text-gray-600">Concluída</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span className="text-xs text-gray-600">Em Progresso</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-600 rounded"></div>
                  <span className="text-xs text-gray-600">Pendente</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Financeiro</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-600 rounded"></div>
                  <span className="text-xs text-gray-600">Despesas</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Modal */}
      <Dialog open={modalType === 'booking'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl" data-testid="booking-modal">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Reserva" : "Nova Reserva"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações da reserva." 
                : "Preencha os dados para criar uma nova reserva."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit((data) => onSubmit('booking', data))} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={bookingForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Propriedade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-property">
                            <SelectValue placeholder="Selecionar propriedade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="guestId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hóspede *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-guest">
                            <SelectValue placeholder="Selecionar hóspede" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {guests?.map((guest) => (
                            <SelectItem key={guest.id} value={guest.id}>
                              {guest.name} {guest.lastName} ({guest.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={bookingForm.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-booking-checkin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-booking-checkout" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={bookingForm.control}
                  name="numberOfGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Hóspedes *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-booking-guests" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total (R$) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-booking-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-status">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="confirmed">Confirmada</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                          <SelectItem value="completed">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={bookingForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Observações sobre a reserva..." 
                        {...field} 
                        data-testid="textarea-booking-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={closeModal} data-testid="button-cancel-booking">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBookingMutation.isPending}
                  data-testid="button-save-booking"
                >
                  {createBookingMutation.isPending ? "Salvando..." : editingItem ? "Atualizar" : "Criar Reserva"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Modal */}
      <Dialog open={modalType === 'maintenance'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl" data-testid="maintenance-modal">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Manutenção" : "Nova Tarefa de Manutenção"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações da tarefa de manutenção." 
                : "Preencha os dados para criar uma nova tarefa de manutenção."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...maintenanceForm}>
            <form onSubmit={maintenanceForm.handleSubmit((data) => onSubmit('maintenance', data))} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={maintenanceForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Propriedade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-maintenance-property">
                            <SelectValue placeholder="Selecionar propriedade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={maintenanceForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-maintenance-type">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cleaning">Limpeza</SelectItem>
                          <SelectItem value="repair">Reparo</SelectItem>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                          <SelectItem value="inspection">Inspeção</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={maintenanceForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Limpeza pós check-out" {...field} data-testid="input-maintenance-title" />
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
                        rows={3} 
                        placeholder="Descreva os detalhes da tarefa..." 
                        {...field} 
                        data-testid="textarea-maintenance-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={maintenanceForm.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Agendada *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-maintenance-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={maintenanceForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do responsável" {...field} data-testid="input-maintenance-assigned" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={maintenanceForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-maintenance-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={maintenanceForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={2} 
                        placeholder="Observações adicionais..." 
                        {...field} 
                        data-testid="textarea-maintenance-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={closeModal} data-testid="button-cancel-maintenance">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMaintenanceMutation.isPending}
                  data-testid="button-save-maintenance"
                >
                  {createMaintenanceMutation.isPending ? "Salvando..." : editingItem ? "Atualizar" : "Criar Tarefa"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Expense Modal */}
      <Dialog open={modalType === 'expense'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg" data-testid="expense-modal">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações da despesa." 
                : "Preencha os dados para registrar uma nova despesa."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit((data) => onSubmit('expense', data))} className="space-y-6">
              <FormField
                control={expenseForm.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propriedade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-property">
                          <SelectValue placeholder="Selecionar propriedade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={expenseForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-category">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                          <SelectItem value="utilities">Utilidades</SelectItem>
                          <SelectItem value="supplies">Suprimentos</SelectItem>
                          <SelectItem value="insurance">Seguro</SelectItem>
                          <SelectItem value="taxes">Impostos</SelectItem>
                          <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={expenseForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-expense-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={expenseForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expense-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Descreva a despesa..." 
                        {...field} 
                        data-testid="textarea-expense-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={closeModal} data-testid="button-cancel-expense">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createExpenseMutation.isPending}
                  data-testid="button-save-expense"
                >
                  {createExpenseMutation.isPending ? "Salvando..." : editingItem ? "Atualizar" : "Registrar Despesa"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}