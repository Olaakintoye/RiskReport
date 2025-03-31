import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Marketplace from "@/pages/marketplace";
import Portfolio from "@/pages/portfolio";
import Account from "@/pages/account";
import MobileLayout from "@/components/ui/mobile-layout";

function Router() {
  const [location] = useLocation();
  
  return (
    <MobileLayout currentPath={location}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/account" component={Account} />
        <Route component={NotFound} />
      </Switch>
    </MobileLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
