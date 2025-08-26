import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bookmark, Search, Filter, Plus, Edit, Trash2, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NewBookingModal from "@/components/modals/new-booking-modal";
import type { BookingWithGuest } from "@shared/schema";

export default function Reservations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiRequest("DELETE", `/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Reserva excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir reserva. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      await apiRequest("PATCH", `/api/bookings/${bookingId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Status da reserva atualizado!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const filteredBookings = bookings?.filter((booking) => {
    const matchesSearch = booking.guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.guest.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-accent/10 text-accent hover:bg-accent/20">Confirmada</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDeleteBooking = (bookingId: string) => {
    if (confirm("Tem certeza que deseja excluir esta reserva?")) {
      deleteBookingMutation.mutate(bookingId);
    }
  };

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    updateBookingStatusMutation.mutate({ bookingId, status: newStatus });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-reservations">Carregando...</div>;
  }

  return (
    <>
      <div data-testid="reservations-section">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Bookmark className="w-5 h-5" />
                <span>Reservas</span>
              </CardTitle>
              <Button onClick={() => setIsNewBookingOpen(true)} data-testid="button-new-reservation">
                <Plus className="w-4 h-4 mr-2" />
                Nova Reserva
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-reservations"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="confirmed">Confirmadas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reservations Table */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-reservations">
                <Bookmark className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma reserva encontrada</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== "all" 
                    ? "Tente ajustar os filtros de busca." 
                    : "Comece criando sua primeira reserva."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Noites</TableHead>
                    <TableHead>Hóspedes</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const checkIn = new Date(booking.checkIn);
                    const checkOut = new Date(booking.checkOut);
                    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <TableRow key={booking.id} data-testid={`reservation-row-${booking.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{booking.guest.name}</p>
                            <p className="text-sm text-gray-500">{booking.guest.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{checkIn.toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{checkOut.toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{nights}</TableCell>
                        <TableCell>{booking.numberOfGuests}</TableCell>
                        <TableCell className="font-medium">
                          R$ {parseFloat(booking.totalAmount).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={booking.status} 
                            onValueChange={(value) => handleStatusChange(booking.id, value)}
                            disabled={updateBookingStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`select-status-${booking.id}`}>
                              <SelectValue>
                                {getStatusBadge(booking.status)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="confirmed">Confirmada</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" data-testid={`button-view-${booking.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-edit-${booking.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteBooking(booking.id)}
                              disabled={deleteBookingMutation.isPending}
                              data-testid={`button-delete-${booking.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <NewBookingModal isOpen={isNewBookingOpen} onClose={() => setIsNewBookingOpen(false)} />
    </>
  );
}
