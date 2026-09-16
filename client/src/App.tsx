import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import SiteBuilder from "./pages/SiteBuilder";
import SiteControl from "./pages/SiteControl";
import PublicSite from "./pages/PublicSite";
import AdminPanel from "./pages/AdminPanel";
import AccountSettings from "./pages/AccountSettings";

function Router() {
  const host = window.location.hostname;
  const reservedHosts = new Set(["madar.app", "www.madar.app", "app.madar.app", "api.madar.app", "admin.madar.app", "dashboard.madar.app", "localhost", "127.0.0.1"]);
  const isMadarTenant = host.endsWith(".madar.app") && !["www", "app", "api", "admin", "dashboard"].includes(host.split(".")[0]);
  const isCustomDomain = !reservedHosts.has(host) && !host.endsWith(".madar.app");
  if (isMadarTenant || isCustomDomain) return <PublicSite />;
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/builder" component={SiteBuilder} />
      <Route path="/site/:id" component={SiteControl} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/account" component={AccountSettings} />
      <Route path="/s/:subdomain" component={PublicSite} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

