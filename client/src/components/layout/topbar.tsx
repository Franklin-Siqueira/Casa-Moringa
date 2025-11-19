import { useLocation } from "wouter";
import { Bell, Settings, Menu } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/calendar": "Calendário",
  "/reservations": "Reservas",
  "/guests": "Hóspedes",
  "/property": "Propriedade",
  "/maintenance": "Manutenção",
  "/finances": "Financeiro",
  "/reports": "Relatórios",
  "/messages": "Mensagens",
};

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const [location] = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    marketing: false,
  });
  const [settings, setSettings] = useState({
    language: "pt-BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    dateFormat: "dd/MM/yyyy",
  });
  
  const pageTitle = pageNames[location] || "Dashboard";

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSettingChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <header className="bg-card shadow-sm border-b border-gray-200 sticky top-0 z-20" data-testid="topbar">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center space-x-4">
            <button className="lg:hidden" onClick={onToggleSidebar} data-testid="button-menu">
              <Menu className="text-gray-500 w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900" data-testid="page-title">{pageTitle}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-danger rounded-full"></span>
            </button>
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors" 
              onClick={() => setIsSettingsOpen(true)}
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="settings-dialog">
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>
              Gerencie as configurações da sua conta e preferências do sistema.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="mt-6">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="account">Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Input 
                    id="language" 
                    value={settings.language} 
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    data-testid="input-language"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Input 
                    id="currency" 
                    value={settings.currency} 
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                    data-testid="input-currency"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Input 
                    id="timezone" 
                    value={settings.timezone} 
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    data-testid="input-timezone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Formato de Data</Label>
                  <Input 
                    id="dateFormat" 
                    value={settings.dateFormat} 
                    onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
                    data-testid="input-date-format"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações importantes por email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={() => handleNotificationChange('email')}
                    data-testid="switch-email-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas urgentes por SMS
                    </p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={() => handleNotificationChange('sms')}
                    data-testid="switch-sms-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações no navegador
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={() => handleNotificationChange('push')}
                    data-testid="switch-push-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Marketing</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba dicas e novidades sobre o produto
                    </p>
                  </div>
                  <Switch
                    checked={notifications.marketing}
                    onCheckedChange={() => handleNotificationChange('marketing')}
                    data-testid="switch-marketing-notifications"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="account" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" defaultValue="João Silva" data-testid="input-account-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="joao@exemplo.com" data-testid="input-account-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" defaultValue="+55 11 99999-9999" data-testid="input-account-phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" defaultValue="RentManager Properties" data-testid="input-account-company" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} data-testid="button-cancel-settings">
              Cancelar
            </Button>
            <Button onClick={() => setIsSettingsOpen(false)} data-testid="button-save-settings">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
