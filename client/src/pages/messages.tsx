import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Search, Filter, Plus, Send, Mail, Eye, Trash2, User, Clock, MessageCircle, Smartphone, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message, Guest, BookingWithGuest } from "@shared/schema";

const messageSchema = z.object({
  guestId: z.string().optional(),
  bookingId: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  type: z.enum(["general", "check_in_instructions", "reminder", "complaint"]).default("general"),
  channel: z.enum(["internal", "whatsapp", "email", "sms"]).default("internal"),
  toNumber: z.string().optional(),
});

const whatsappMessageSchema = z.object({
  to: z.string().min(1, "Número do WhatsApp é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  guestId: z.string().optional(),
  bookingId: z.string().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;
type WhatsAppMessageData = z.infer<typeof whatsappMessageSchema>;

interface MessageWithRelations extends Message {
  guest?: Guest;
  booking?: BookingWithGuest;
}

export default function Messages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isWhatsAppConfigOpen, setIsWhatsAppConfigOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithRelations | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: bookings } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: whatsappStatus } = useQuery<{configured: boolean; profile?: any}>({
    queryKey: ["/api/whatsapp/status"],
  });

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      guestId: "",
      bookingId: "",
      subject: "",
      content: "",
      type: "general",
      channel: "internal",
      toNumber: "",
    },
  });

  const whatsappForm = useForm<WhatsAppMessageData>({
    resolver: zodResolver(whatsappMessageSchema),
    defaultValues: {
      to: "",
      message: "",
      guestId: "",
      bookingId: "",
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      });
      form.reset();
      setIsNewMessageOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("PATCH", `/api/messages/${messageId}`, { isRead: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Sucesso",
        description: "Mensagem excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: WhatsAppMessageData) => {
      const response = await apiRequest("POST", "/api/whatsapp/send", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Sucesso",
        description: "Mensagem WhatsApp enviada com sucesso!",
      });
      whatsappForm.reset();
      setIsWhatsAppModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao enviar mensagem WhatsApp. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const configureWhatsAppMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await apiRequest("POST", "/api/whatsapp/config", config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({
        title: "Sucesso",
        description: "WhatsApp configurado com sucesso!",
      });
      setIsWhatsAppConfigOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao configurar WhatsApp. Verifique os dados.",
        variant: "destructive",
      });
    },
  });

  // Enrich messages with guest and booking data
  const enrichedMessages: MessageWithRelations[] = messages?.map(message => {
    const guest = message.guestId ? guests?.find(g => g.id === message.guestId) : undefined;
    const booking = message.bookingId ? bookings?.find(b => b.id === message.bookingId) : undefined;
    return { ...message, guest, booking };
  }) || [];

  const filteredMessages = enrichedMessages.filter((message) => {
    const matchesSearch = message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.guest?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.guest?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || message.type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "read" && message.isRead) ||
                         (statusFilter === "unread" && !message.isRead);
    const matchesChannel = channelFilter === "all" || (message as any).channel === channelFilter;
    return matchesSearch && matchesType && matchesStatus && matchesChannel;
  });

  const getTypeBadge = (type: string) => {
    const types = {
      general: { label: "Geral", className: "bg-gray-100 text-gray-700" },
      check_in_instructions: { label: "Check-in", className: "bg-blue-100 text-blue-700" },
      reminder: { label: "Lembrete", className: "bg-warning/10 text-warning" },
      complaint: { label: "Reclamação", className: "bg-red-100 text-red-700" }
    };
    const typeInfo = types[type as keyof typeof types] || types.general;
    return <Badge className={typeInfo.className}>{typeInfo.label}</Badge>;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case "email":
        return <Mail className="w-4 h-4 text-blue-600" />;
      case "sms":
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const getChannelBadge = (channel: string) => {
    const channels = {
      internal: { label: "Interno", className: "bg-gray-100 text-gray-700" },
      whatsapp: { label: "WhatsApp", className: "bg-green-100 text-green-700" },
      email: { label: "Email", className: "bg-blue-100 text-blue-700" },
      sms: { label: "SMS", className: "bg-purple-100 text-purple-700" }
    };
    const channelInfo = channels[channel as keyof typeof channels] || channels.internal;
    return <Badge className={channelInfo.className}>{channelInfo.label}</Badge>;
  };

  const handleViewMessage = (message: MessageWithRelations) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const onSubmit = (data: MessageFormData) => {
    createMessageMutation.mutate(data);
  };

  const closeNewMessageModal = () => {
    setIsNewMessageOpen(false);
    form.reset();
  };

  const unreadCount = enrichedMessages.filter(m => !m.isRead).length;

  if (messagesLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-messages">Carregando...</div>;
  }

  return (
    <>
      <div data-testid="messages-section">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Mensagens</span>
                {unreadCount > 0 && (
                  <Badge className="bg-danger text-white">
                    {unreadCount} não lidas
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsWhatsAppConfigOpen(true)}
                  data-testid="button-whatsapp-config"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar WhatsApp
                </Button>
                <Button 
                  onClick={() => setIsWhatsAppModalOpen(true)} 
                  disabled={!whatsappStatus?.configured}
                  data-testid="button-whatsapp-message"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button onClick={() => setIsNewMessageOpen(true)} data-testid="button-new-message">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Mensagem
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por assunto, conteúdo ou hóspede..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-messages"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="check_in_instructions">Check-in</SelectItem>
                    <SelectItem value="reminder">Lembrete</SelectItem>
                    <SelectItem value="complaint">Reclamação</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="unread">Não lidas</SelectItem>
                    <SelectItem value="read">Lidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-[120px]" data-testid="select-channel-filter">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="internal">Interno</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages Table */}
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-messages">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mensagem encontrada</h3>
                <p className="text-gray-500">
                  {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca." 
                    : "Comece enviando sua primeira mensagem."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow 
                      key={message.id} 
                      className={!message.isRead ? "bg-blue-50" : ""}
                      data-testid={`message-row-${message.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {!message.isRead && (
                            <div className="w-2 h-2 bg-danger rounded-full"></div>
                          )}
                          <Mail className={`w-4 h-4 ${message.isRead ? 'text-gray-400' : 'text-primary'}`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getChannelIcon((message as any).channel || 'internal')}
                          {getChannelBadge((message as any).channel || 'internal')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {message.guest?.name || "Hóspede não encontrado"}
                            </p>
                            {message.guest?.email && (
                              <p className="text-sm text-gray-500">{message.guest.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className={`font-medium ${!message.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                            {message.subject || "Sem assunto"}
                          </p>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">
                            {message.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(message.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(message.sentAt!).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewMessage(message)}
                            data-testid={`button-view-message-${message.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteMessage(message.id)}
                            disabled={deleteMessageMutation.isPending}
                            data-testid={`button-delete-message-${message.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Message Modal */}
      <Dialog open={isNewMessageOpen} onOpenChange={closeNewMessageModal}>
        <DialogContent className="max-w-2xl" data-testid="new-message-modal">
          <DialogHeader>
            <DialogTitle>Nova Mensagem</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="guestId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hóspede</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-message-guest">
                            <SelectValue placeholder="Selecionar hóspede" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {guests?.map((guest) => (
                            <SelectItem key={guest.id} value={guest.id}>
                              {guest.name} ({guest.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-message-type">
                            <SelectValue placeholder="Tipo da mensagem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">Geral</SelectItem>
                          <SelectItem value="check_in_instructions">Instruções de Check-in</SelectItem>
                          <SelectItem value="reminder">Lembrete</SelectItem>
                          <SelectItem value="complaint">Reclamação</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-message-channel">
                            <SelectValue placeholder="Canal da mensagem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="internal">Interno</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bookingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reserva (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-message-booking">
                          <SelectValue placeholder="Selecionar reserva" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bookings?.map((booking) => (
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
                control={form.control}
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
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo *</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={6} 
                        placeholder="Digite sua mensagem aqui..." 
                        {...field} 
                        data-testid="textarea-message-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={closeNewMessageModal} data-testid="button-cancel-message">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createMessageMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Message Modal */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl" data-testid="view-message-modal">
          <DialogHeader>
            <DialogTitle>Visualizar Mensagem</DialogTitle>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-500">De:</span>
                  <p className="font-medium">Sistema</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Para:</span>
                  <p className="font-medium">{selectedMessage.guest?.name || "Hóspede não encontrado"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Tipo:</span>
                  <div className="mt-1">{getTypeBadge(selectedMessage.type)}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Data:</span>
                  <p className="font-medium">
                    {new Date(selectedMessage.sentAt!).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Assunto:</h4>
                <p className="text-gray-700">{selectedMessage.subject || "Sem assunto"}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Conteúdo:</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button onClick={() => setSelectedMessage(null)} data-testid="button-close-message">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Message Modal */}
      <Dialog open={isWhatsAppModalOpen} onOpenChange={() => setIsWhatsAppModalOpen(false)}>
        <DialogContent className="max-w-2xl" data-testid="whatsapp-message-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span>Enviar WhatsApp</span>
            </DialogTitle>
          </DialogHeader>
          
          <Form {...whatsappForm}>
            <form onSubmit={whatsappForm.handleSubmit((data) => sendWhatsAppMutation.mutate(data))} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={whatsappForm.control}
                  name="guestId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hóspede</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        const guest = guests?.find(g => g.id === value);
                        if (guest) {
                          whatsappForm.setValue("to", guest.phone);
                        }
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-whatsapp-guest">
                            <SelectValue placeholder="Selecionar hóspede" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {guests?.map((guest) => (
                            <SelectItem key={guest.id} value={guest.id}>
                              {guest.name} ({guest.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={whatsappForm.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número WhatsApp *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 5511999999999" 
                          {...field} 
                          data-testid="input-whatsapp-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={whatsappForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem *</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={6} 
                        placeholder="Digite sua mensagem WhatsApp aqui..." 
                        {...field} 
                        data-testid="textarea-whatsapp-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  data-testid="button-cancel-whatsapp"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={sendWhatsAppMutation.isPending}
                  data-testid="button-send-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {sendWhatsAppMutation.isPending ? "Enviando..." : "Enviar WhatsApp"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Config Modal */}
      <Dialog open={isWhatsAppConfigOpen} onOpenChange={() => setIsWhatsAppConfigOpen(false)}>
        <DialogContent className="max-w-2xl" data-testid="whatsapp-config-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Configurar WhatsApp Business API</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Informações necessárias:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Access Token do WhatsApp Business API</li>
                <li>• Phone Number ID da conta business</li>
                <li>• Verify Token para webhook</li>
                <li>• URL do webhook configurada no Meta Business</li>
              </ul>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              configureWhatsAppMutation.mutate({
                accessToken: formData.get('accessToken'),
                phoneNumberId: formData.get('phoneNumberId'),
                verifyToken: formData.get('verifyToken'),
                webhookUrl: formData.get('webhookUrl'),
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Access Token *</label>
                <Input 
                  name="accessToken" 
                  type="password"
                  placeholder="Seu WhatsApp Business API Access Token"
                  required
                  data-testid="input-access-token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number ID *</label>
                <Input 
                  name="phoneNumberId"
                  placeholder="ID do número de telefone business"
                  required
                  data-testid="input-phone-number-id"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Verify Token *</label>
                <Input 
                  name="verifyToken"
                  placeholder="Token de verificação do webhook"
                  required
                  data-testid="input-verify-token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Webhook URL</label>
                <Input 
                  name="webhookUrl"
                  placeholder="https://seu-dominio.com/api/whatsapp/webhook"
                  data-testid="input-webhook-url"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsWhatsAppConfigOpen(false)}
                  data-testid="button-cancel-config"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={configureWhatsAppMutation.isPending}
                  data-testid="button-save-config"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {configureWhatsAppMutation.isPending ? "Salvando..." : "Salvar Configuração"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
