import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Search, Filter, Plus, Edit, Trash2, TrendingUp, TrendingDown, Calendar, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Expense, Property, BookingWithGuest } from "@shared/schema";

const expenseSchema = z.object({
  propertyId: z.string().min(1, "Propriedade é obrigatória"),
  category: z.enum(["maintenance", "utilities", "supplies", "insurance", "taxes", "other"]),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function Finances() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: bookings } = useQuery<BookingWithGuest[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      propertyId: "",
      category: "other",
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
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
      toast({
        title: "Sucesso",
        description: "Despesa registrada com sucesso!",
      });
      form.reset({
        propertyId: "",
        category: "other",
        description: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
      });
      setIsNewExpenseOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao registrar despesa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir despesa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const filteredExpenses = expenses?.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const expenseDate = new Date(expense.date);
      const now = new Date();
      
      switch (dateFilter) {
        case "this_month":
          matchesDate = expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
          break;
        case "last_month":
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          matchesDate = expenseDate.getMonth() === lastMonth.getMonth() && expenseDate.getFullYear() === lastMonth.getFullYear();
          break;
        case "this_year":
          matchesDate = expenseDate.getFullYear() === now.getFullYear();
          break;
      }
    }
    
    return matchesSearch && matchesCategory && matchesDate;
  }) || [];

  // Calculate financial summary
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const monthlyExpenses = expenses?.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= currentMonth && expenseDate < nextMonth;
  }) || [];

  const monthlyRevenue = bookings?.filter(booking => {
    const checkIn = new Date(booking.checkIn);
    return checkIn >= currentMonth && checkIn < nextMonth && booking.status === 'confirmed';
  }).reduce((sum, booking) => sum + parseFloat(booking.totalAmount), 0) || 0;

  const monthlyExpenseTotal = monthlyExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const netIncome = monthlyRevenue - monthlyExpenseTotal;

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

  const getCategoryColor = (category: string) => {
    const colors = {
      maintenance: "bg-blue-100 text-blue-700",
      utilities: "bg-yellow-100 text-yellow-700",
      supplies: "bg-green-100 text-green-700",
      insurance: "bg-purple-100 text-purple-700",
      taxes: "bg-red-100 text-red-700",
      other: "bg-gray-100 text-gray-700"
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  const onSubmit = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  const closeModal = () => {
    setIsNewExpenseOpen(false);
    setEditingExpense(null);
    form.reset({
      propertyId: "",
      category: "other",
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
    });
  };

  if (expensesLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-finances">Carregando...</div>;
  }

  return (
    <>
      <div className="space-y-8" data-testid="finances-section">
        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">Receita Mensal</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="monthly-revenue">
                    R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-accent text-sm font-medium mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Reservas confirmadas
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
                  <p className="text-secondary text-sm font-medium">Despesas Mensais</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="monthly-expenses">
                    R$ {monthlyExpenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-warning text-sm font-medium mt-1">
                    <TrendingDown className="w-4 h-4 inline mr-1" />
                    {monthlyExpenses.length} despesas
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingDown className="text-warning w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">Lucro Líquido</p>
                  <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-accent' : 'text-destructive'}`} data-testid="net-income">
                    R$ {netIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-sm font-medium mt-1 ${netIncome >= 0 ? 'text-accent' : 'text-destructive'}`}>
                    {netIncome >= 0 ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
                    Receita - Despesas
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${netIncome >= 0 ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                  <DollarSign className={`w-6 h-6 ${netIncome >= 0 ? 'text-accent' : 'text-destructive'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Despesas</span>
              </CardTitle>
              <Button onClick={() => setIsNewExpenseOpen(true)} data-testid="button-new-expense">
                <Plus className="w-4 h-4 mr-2" />
                Nova Despesa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-expenses"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="utilities">Utilidades</SelectItem>
                    <SelectItem value="supplies">Suprimentos</SelectItem>
                    <SelectItem value="insurance">Seguro</SelectItem>
                    <SelectItem value="taxes">Impostos</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-date-filter">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="this_month">Este mês</SelectItem>
                    <SelectItem value="last_month">Mês passado</SelectItem>
                    <SelectItem value="this_year">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expenses Table */}
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-expenses">
                <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma despesa encontrada</h3>
                <p className="text-gray-500">
                  {searchTerm || categoryFilter !== "all" || dateFilter !== "all"
                    ? "Tente ajustar os filtros de busca." 
                    : "Comece registrando sua primeira despesa."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(expense.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">{expense.description}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                          {getCategoryLabel(expense.category)}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-destructive">
                        - R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" data-testid={`button-edit-expense-${expense.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                            disabled={deleteExpenseMutation.isPending}
                            data-testid={`button-delete-expense-${expense.id}`}
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

      {/* New Expense Modal */}
      <Dialog open={isNewExpenseOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-lg" data-testid="expense-modal">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                control={form.control}
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
                control={form.control}
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
                  {createExpenseMutation.isPending ? "Salvando..." : "Registrar Despesa"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
