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
import { MessageSquare, Search, Filter, Plus, Send, Mail, Eye, Trash2, User, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message, Guest, BookingWithGuest } from "@shared/schema";

const messageSchema = z.object({
  guestId: z.string().optional(),
  bookingId: z.string().optional(),
  subject: z.string().min(1, "Assunto é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  type: z.enum(["general", "check_in_instructions", "reminder", "complaint"]).default("general"),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface MessageWithRelations extends Message {
  guest?: Guest;
  booking?: BookingWithGuest;
}

export default function Messages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
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

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      guestId: "",
      bookingId: "",
      subject: "",
      content: "",
      type: "general",
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
    return matchesSearch && matchesType && matchesStatus;
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
              <Button onClick={() => setIsNewMessageOpen(true)} data-testid="button-new-message">
                <Plus className="w-4 h-4 mr-2" />
                Nova Mensagem
              </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormLabel>Assunto *</FormLabel>
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
    </>
  );
}
