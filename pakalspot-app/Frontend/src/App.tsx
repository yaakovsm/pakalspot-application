import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { spotsAPI } from "./api/api";
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Favorites from "./pages/Favorites";
import SpotDetails from "./pages/SpotDetails";
import AdminPendingSpots from "./pages/AdminPendingSpots";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { initialize, isAuthenticated } = useAuth();
  const client = useQueryClient();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      // Prefetch favorites when user is authenticated
      client.prefetchQuery({
        queryKey: ['favorites', 'ids'],
        queryFn: async () => {
          const response = await spotsAPI.getFavorites();
          return new Set(response.data.map(spot => spot.id));
        },
      });
      client.prefetchQuery({
        queryKey: ['favorites', 'list'],
        queryFn: async () => {
          const response = await spotsAPI.getFavorites();
          return response.data;
        },
      });
    } else {
      // Clear favorites when user logs out
      client.setQueryData(['favorites', 'ids'], new Set<string>());
      client.setQueryData(['favorites', 'list'], []);
    }
  }, [isAuthenticated, client]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/spot/:id" element={<SpotDetails />} />
        <Route path="/admin/pending-spots" element={<AdminPendingSpots />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
