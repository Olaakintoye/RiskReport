import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Marketplace from "@/pages/marketplace";
import Portfolio from "@/pages/portfolio";
import Account from "@/pages/account";
import AuthPage from "@/pages/auth-page";
import MobileLayout from "@/components/ui/mobile-layout";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  const [location] = useLocation();
  
  // Only render mobile layout for authenticated routes
  const isAuthPage = location === "/auth";
  
  if (isAuthPage) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  return (
    <MobileLayout currentPath={location}>
      <Switch>
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/marketplace" component={Marketplace} />
        <ProtectedRoute path="/portfolio" component={Portfolio} />
        <ProtectedRoute path="/account" component={Account} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </MobileLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
