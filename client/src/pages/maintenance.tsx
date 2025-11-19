import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, Search, Filter, Plus, Edit, Trash2, Calendar, DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MaintenanceTask, Property } from "@shared/schema";

const maintenanceTaskSchema = z.object({
  propertyId: z.string().min(1, "Propriedade é obrigatória"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  type: z.enum(["cleaning", "repair", "maintenance", "inspection"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  scheduledDate: z.string().optional(),
  assignedTo: z.string().optional(),
  cost: z.string().optional(),
  notes: z.string().optional(),
});

type MaintenanceTaskFormData = z.infer<typeof maintenanceTaskSchema>;

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery<MaintenanceTask[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<MaintenanceTaskFormData>({
    resolver: zodResolver(maintenanceTaskSchema),
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

  const createTaskMutation = useMutation({
    mutationFn: async (data: MaintenanceTaskFormData) => {
      const taskData = {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : undefined,
        cost: data.cost ? data.cost : undefined,
      };

      const response = await apiRequest("POST", "/api/maintenance", taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({
        title: "Sucesso",
        description: "Tarefa de manutenção criada com sucesso!",
      });
      form.reset();
      setIsNewTaskOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<MaintenanceTaskFormData> }) => {
      const response = await apiRequest("PATCH", `/api/maintenance/${taskId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });
      setEditingTask(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/maintenance/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesType = typeFilter === "all" || task.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-accent/10 text-accent hover:bg-accent/20"><CheckCircle className="w-3 h-3 mr-1" />Concluída</Badge>;
      case 'in_progress':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20"><Clock className="w-3 h-3 mr-1" />Em Progresso</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels = {
      cleaning: "Limpeza",
      repair: "Reparo",
      maintenance: "Manutenção",
      inspection: "Inspeção"
    };
    return <Badge variant="outline">{typeLabels[type as keyof typeof typeLabels] || type}</Badge>;
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTaskMutation.mutate({ 
      taskId, 
      data: { 
        status: newStatus as any,
        ...(newStatus === 'completed' && { completedDate: new Date().toISOString() })
      } 
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const onSubmit = (data: MaintenanceTaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ taskId: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const openEditModal = (task: MaintenanceTask) => {
    setEditingTask(task);
    form.reset({
      propertyId: task.propertyId,
      title: task.title,
      description: task.description || "",
      type: task.type as any,
      status: task.status as any,
      scheduledDate: task.scheduledDate ? new Date(task.scheduledDate).toISOString().split('T')[0] : "",
      assignedTo: task.assignedTo || "",
      cost: task.cost || "",
      notes: task.notes || "",
    });
    setIsNewTaskOpen(true);
  };

  const closeModal = () => {
    setIsNewTaskOpen(false);
    setEditingTask(null);
    form.reset();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-maintenance">Carregando...</div>;
  }

  return (
    <>
      <div data-testid="maintenance-section">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Wrench className="w-5 h-5" />
                <span>Manutenção</span>
              </CardTitle>
              <Button onClick={() => setIsNewTaskOpen(true)} data-testid="button-new-task">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por título, descrição ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-tasks"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="cleaning">Limpeza</SelectItem>
                    <SelectItem value="repair">Reparo</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="inspection">Inspeção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tasks Table */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-tasks">
                <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                    ? "Tente ajustar os filtros de busca." 
                    : "Comece criando sua primeira tarefa de manutenção."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Agendada</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                    <TableRow key={task.id} data-testid={`task-row-${task.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(task.type)}</TableCell>
                      <TableCell>
                        <Select 
                          value={task.status} 
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                          disabled={updateTaskMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-task-status-${task.id}`}>
                            <SelectValue>
                              {getStatusBadge(task.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="completed">Concluída</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {task.scheduledDate ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{new Date(task.scheduledDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{task.assignedTo || '-'}</TableCell>
                      <TableCell>
                        {task.cost ? (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span>R$ {parseFloat(task.cost).toLocaleString('pt-BR')}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditModal(task)}
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={deleteTaskMutation.isPending}
                            data-testid={`button-delete-task-${task.id}`}
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
      </div>

      {/* New/Edit Task Modal */}
      <Dialog open={isNewTaskOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="task-modal">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Editar Tarefa" : "Nova Tarefa de Manutenção"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Propriedade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-property">
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
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-type">
                            <SelectValue placeholder="Tipo da tarefa" />
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
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Limpeza pós check-out" {...field} data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Descreva os detalhes da tarefa..." 
                        {...field} 
                        data-testid="textarea-task-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Agendada</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-scheduled-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do responsável" {...field} data-testid="input-assigned-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-task-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={2} 
                        placeholder="Observações adicionais..." 
                        {...field} 
                        data-testid="textarea-task-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={closeModal} data-testid="button-cancel-task">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  data-testid="button-save-task"
                >
                  {(createTaskMutation.isPending || updateTaskMutation.isPending) ? "Salvando..." : editingTask ? "Atualizar" : "Criar Tarefa"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
