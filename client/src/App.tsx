import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import Reservations from "@/pages/reservations";
import Guests from "@/pages/guests";
import Property from "@/pages/property";
import Maintenance from "@/pages/maintenance";
import Finances from "@/pages/finances";
import Reports from "@/pages/reports";
import Messages from "@/pages/messages";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/reservations" component={Reservations} />
        <Route path="/guests" component={Guests} />
        <Route path="/property" component={Property} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/finances" component={Finances} />
        <Route path="/reports" component={Reports} />
        <Route path="/messages" component={Messages} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
