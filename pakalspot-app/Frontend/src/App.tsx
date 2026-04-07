import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RadixDirectionProvider } from "./components/RadixDirectionProvider";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { spotsAPI } from "./api/api";
import { AuthModalProvider, useAuthModal } from "./components/AuthModalProvider";
import { AddSpotModalProvider } from "./components/AddSpotModalProvider";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import MobileDistrictExplorePage from "./pages/MobileDistrictExplorePage";
import MobileLayout from "./components/mobile/MobileLayout";
import About from "./pages/About";
import Favorites from "./pages/Favorites";
import SpotDetails from "./pages/SpotDetails";
import AdminPendingSpots from "./pages/AdminPendingSpots";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthRouteHandler = ({ mode }: { mode: "login" | "register" }) => {
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    openAuthModal(mode);
    navigate("/", { replace: true });
  }, [mode, navigate, openAuthModal]);

  return null;
};

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
    <AuthModalProvider>
      <BrowserRouter>
        <AddSpotModalProvider>
          <Routes>
            <Route path="/" element={<MobileLayout><Home /></MobileLayout>} />
            <Route path="/map" element={<MobileLayout><MapPage /></MobileLayout>} />
            <Route path="/mobile/district/:districtId" element={<MobileLayout><MobileDistrictExplorePage /></MobileLayout>} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<AuthRouteHandler mode="login" />} />
            <Route path="/register" element={<AuthRouteHandler mode="register" />} />
            <Route path="/favorites" element={<MobileLayout><Favorites /></MobileLayout>} />
            <Route path="/profile" element={<MobileLayout><Profile /></MobileLayout>} />
            <Route path="/spot/:id" element={<SpotDetails />} />
            <Route path="/admin/pending-spots" element={<AdminPendingSpots />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AddSpotModalProvider>
      </BrowserRouter>
    </AuthModalProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RadixDirectionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </RadixDirectionProvider>
  </QueryClientProvider>
);

export default App;
