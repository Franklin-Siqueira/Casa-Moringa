import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, Users, DollarSign, Wifi, Car, Home, Waves } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";

const propertyFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  address: z.string().min(1, "Endereço é obrigatório"),
  maxGuests: z.string().min(1, "Capacidade máxima é obrigatória"),
  dailyRate: z.string().min(1, "Valor da diária é obrigatório"),
  amenities: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

const amenityIcons: Record<string, any> = {
  'Wi-Fi': Wifi,
  'Estacionamento': Car,
  'Cozinha': Home,
  'Acesso à Praia': Waves,
};

export default function Property() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const property = properties?.[0]; // Assuming single property for now

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: property?.name || "",
      description: property?.description || "",
      address: property?.address || "",
      maxGuests: property?.maxGuests?.toString() || "",
      dailyRate: property?.dailyRate || "",
      amenities: property?.amenities?.join(", ") || "",
    },
  });

  // Reset form when property data loads
  if (property && !form.formState.isDirty) {
    form.reset({
      name: property.name,
      description: property.description || "",
      address: property.address,
      maxGuests: property.maxGuests.toString(),
      dailyRate: property.dailyRate,
      amenities: property.amenities?.join(", ") || "",
    });
  }

  const updatePropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const amenitiesArray = data.amenities 
        ? data.amenities.split(",").map(a => a.trim()).filter(a => a.length > 0)
        : [];

      const propertyData = {
        name: data.name,
        description: data.description,
        address: data.address,
        maxGuests: parseInt(data.maxGuests),
        dailyRate: data.dailyRate,
        amenities: amenitiesArray,
      };

      if (property) {
        const response = await apiRequest("PATCH", `/api/properties/${property.id}`, propertyData);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/properties", propertyData);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Sucesso",
        description: "Propriedade atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar propriedade. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    updatePropertyMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="loading-property">Carregando...</div>;
  }

  return (
    <div className="space-y-8" data-testid="property-section">
      {/* Property Overview */}
      {property && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Visão Geral da Propriedade</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Localização</p>
                  <p className="font-medium text-gray-900">{property.address}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacidade</p>
                  <p className="font-medium text-gray-900">{property.maxGuests} hóspedes</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Diária</p>
                  <p className="font-medium text-gray-900">R$ {property.dailyRate}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Comodidades</p>
                  <p className="font-medium text-gray-900">{property.amenities?.length || 0} itens</p>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Comodidades</h4>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => {
                    const Icon = amenityIcons[amenity] || Home;
                    return (
                      <Badge key={amenity} variant="secondary" className="flex items-center space-x-1">
                        <Icon className="w-3 h-3" />
                        <span>{amenity}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Property Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {property ? "Editar Propriedade" : "Adicionar Propriedade"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Propriedade *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Casa da Praia" {...field} data-testid="input-property-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço *</FormLabel>
                      <FormControl>
                        <Input placeholder="Endereço completo" {...field} data-testid="input-property-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidade Máxima *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Número de hóspedes" {...field} data-testid="input-max-guests" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dailyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor da Diária (R$) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-daily-rate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={4} 
                        placeholder="Descreva a propriedade, suas características e diferenciais..." 
                        {...field} 
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comodidades</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Wi-Fi, Ar Condicionado, Cozinha, Estacionamento (separar por vírgula)" 
                        {...field} 
                        data-testid="input-amenities"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  disabled={updatePropertyMutation.isPending}
                  data-testid="button-save-property"
                >
                  {updatePropertyMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
