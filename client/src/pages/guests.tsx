import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, User, MapPin, FileText, MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Guest } from "@shared/schema";
import { insertGuestSchema } from "@shared/schema";

// Use the schema from shared with additional client-side extensions for optional fields
const guestSchema = insertGuestSchema;

type GuestFormData = z.infer<typeof guestSchema>;

export default function Guests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewGuestOpen, setIsNewGuestOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guests, isLoading } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      phone: "",
      cpf: "",
      street: "",
      number: "",
      complement: "",
      city: "",
      state: "",
      zipCode: "",
      notes: "",
    },
  });

  const createGuestMutation = useMutation({
    mutationFn: async (data: GuestFormData) => {
      const response = await apiRequest("POST", "/api/guests", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({
        title: "Sucesso",
        description: "Hóspede criado com sucesso!",
      });
      form.reset();
      setIsNewGuestOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar hóspede. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GuestFormData }) => {
      const response = await apiRequest("PATCH", `/api/guests/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({
        title: "Sucesso",
        description: "Hóspede atualizado com sucesso!",
      });
      form.reset();
      setEditingGuest(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar hóspede. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (guestId: string) => {
      await apiRequest("DELETE", `/api/guests/${guestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({
        title: "Sucesso",
        description: "Hóspede excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir hóspede. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const filteredGuests = guests?.filter((guest) => {
    const fullName = `${guest.name} ${guest.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) ||
           guest.email.toLowerCase().includes(searchLower) ||
           guest.phone.toLowerCase().includes(searchLower) ||
           (guest.cpf && guest.cpf.toLowerCase().includes(searchLower));
  }) || [];

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    form.reset({
      name: guest.name,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      cpf: guest.cpf || "",
      street: guest.street || "",
      number: guest.number || "",
      complement: guest.complement || "",
      city: guest.city || "",
      state: guest.state || "",
      zipCode: guest.zipCode || "",
      notes: guest.notes || "",
    });
  };

  const handleDeleteGuest = (guestId: string) => {
    if (confirm("Tem certeza que deseja excluir este hóspede?")) {
      deleteGuestMutation.mutate(guestId);
    }
  };

  const onSubmit = (data: GuestFormData) => {
    if (editingGuest) {
      updateGuestMutation.mutate({ id: editingGuest.id, data });
    } else {
      createGuestMutation.mutate(data);
    }
  };

  const closeModal = () => {
    setIsNewGuestOpen(false);
    setEditingGuest(null);
    form.reset();
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    const digits = cpf.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatZipCode = (zipCode: string) => {
    if (!zipCode) return '';
    const digits = zipCode.replace(/\D/g, '');
    return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-guests">Carregando...</div>;
  }

  return (
    <div data-testid="guests-section">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Hóspedes</span>
            </CardTitle>
            <Button onClick={() => setIsNewGuestOpen(true)} data-testid="button-new-guest">
              <Plus className="w-4 h-4 mr-2" />
              Novo Hóspede
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, email, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-guests"
              />
            </div>
          </div>

          {/* Guests Table */}
          {filteredGuests.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-guests">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum hóspede encontrado</h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? "Tente ajustar os termos de busca." 
                  : "Comece cadastrando seu primeiro hóspede."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((guest) => (
                  <TableRow key={guest.id} data-testid={`guest-row-${guest.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{guest.name} {guest.lastName}</div>
                          {guest.notes && (
                            <div className="text-sm text-gray-500 truncate max-w-[200px]">{guest.notes}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{guest.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{formatPhone(guest.phone)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {guest.cpf && (
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-mono">{formatCPF(guest.cpf)}</span>
                          </div>
                        )}
                        {!guest.cpf && (
                          <span className="text-sm text-gray-400">CPF não informado</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {guest.street && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div className="text-sm">
                              <div>{guest.street}, {guest.number}</div>
                              {guest.complement && <div className="text-gray-500">{guest.complement}</div>}
                              {guest.city && guest.state && (
                                <div className="text-gray-500">{guest.city} - {guest.state}</div>
                              )}
                            </div>
                          </div>
                        )}
                        {!guest.street && (
                          <span className="text-sm text-gray-400">Endereço não informado</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditGuest(guest)}
                          data-testid={`button-edit-guest-${guest.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteGuest(guest.id)}
                          disabled={deleteGuestMutation.isPending}
                          data-testid={`button-delete-guest-${guest.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Guest Modal */}
      <Dialog open={isNewGuestOpen || !!editingGuest} onOpenChange={closeModal}>
        <DialogContent className="max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="guest-modal">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? "Editar Hóspede" : "Novo Hóspede"}
            </DialogTitle>
            <DialogDescription>
              {editingGuest 
                ? "Atualize as informações do hóspede nos campos abaixo." 
                : "Preencha as informações do novo hóspede. Campos marcados com * são obrigatórios."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome" {...field} data-testid="input-guest-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Sobrenome" {...field} data-testid="input-guest-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="000.000.000-00" 
                            {...field} 
                            data-testid="input-guest-cpf"
                            maxLength={14}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\D/g, '');
                              const formatted = formatCPF(rawValue);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(11) 99999-9999" 
                            {...field} 
                            data-testid="input-guest-phone"
                            maxLength={15}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\D/g, '');
                              const formatted = formatPhone(rawValue);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="email@exemplo.com" 
                          {...field} 
                          data-testid="input-guest-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rua/Avenida/Praça</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da rua, avenida ou praça" {...field} data-testid="input-guest-street" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} data-testid="input-guest-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apartamento, casa, bloco, etc." {...field} data-testid="input-guest-complement" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da cidade" {...field} data-testid="input-guest-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-guest-state">
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AC">Acre</SelectItem>
                            <SelectItem value="AL">Alagoas</SelectItem>
                            <SelectItem value="AP">Amapá</SelectItem>
                            <SelectItem value="AM">Amazonas</SelectItem>
                            <SelectItem value="BA">Bahia</SelectItem>
                            <SelectItem value="CE">Ceará</SelectItem>
                            <SelectItem value="DF">Distrito Federal</SelectItem>
                            <SelectItem value="ES">Espírito Santo</SelectItem>
                            <SelectItem value="GO">Goiás</SelectItem>
                            <SelectItem value="MA">Maranhão</SelectItem>
                            <SelectItem value="MT">Mato Grosso</SelectItem>
                            <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                            <SelectItem value="MG">Minas Gerais</SelectItem>
                            <SelectItem value="PA">Pará</SelectItem>
                            <SelectItem value="PB">Paraíba</SelectItem>
                            <SelectItem value="PR">Paraná</SelectItem>
                            <SelectItem value="PE">Pernambuco</SelectItem>
                            <SelectItem value="PI">Piauí</SelectItem>
                            <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                            <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                            <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                            <SelectItem value="RO">Rondônia</SelectItem>
                            <SelectItem value="RR">Roraima</SelectItem>
                            <SelectItem value="SC">Santa Catarina</SelectItem>
                            <SelectItem value="SP">São Paulo</SelectItem>
                            <SelectItem value="SE">Sergipe</SelectItem>
                            <SelectItem value="TO">Tocantins</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="00000-000" 
                            {...field} 
                            data-testid="input-guest-zipcode"
                            maxLength={9}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\D/g, '');
                              const formatted = formatZipCode(rawValue);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Observações</h3>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={3} 
                          placeholder="Informações adicionais sobre o hóspede..." 
                          {...field} 
                          data-testid="textarea-guest-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={closeModal} data-testid="button-cancel-guest">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createGuestMutation.isPending || updateGuestMutation.isPending}
                  data-testid="button-save-guest"
                >
                  {(createGuestMutation.isPending || updateGuestMutation.isPending) 
                    ? "Salvando..." 
                    : editingGuest ? "Atualizar Hóspede" : "Criar Hóspede"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
