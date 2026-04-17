import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Income from "@/pages/Income";
import Expenses from "@/pages/Expenses";
import Budgets from "@/pages/Budgets";
import Savings from "@/pages/Savings";
import Categories from "@/pages/Categories";
import Reports from "@/pages/Reports";
import Auth from "@/pages/Auth";
import Loans from "@/pages/Loans";
import Notepad from "@/pages/Notepad";
import Export from "@/pages/Export";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Spendly...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/income" component={Income} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/budgets" component={Budgets} />
          <Route path="/savings" component={Savings} />
          <Route path="/loans" component={Loans} />
          <Route path="/notepad" component={Notepad} />
          <Route path="/categories" component={Categories} />
          <Route path="/reports" component={Reports} />
          <Route path="/export" component={Export} />
        </Switch>
      </Layout>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
