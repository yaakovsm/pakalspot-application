import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../components/ui/dialog';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MapView from '../components/MapView';
import AddSpotForm from '../components/AddSpotForm';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Plus, Menu, X } from 'lucide-react';

const Home: React.FC = () => {
  const { fetchSpots, setUserLocation } = useSpots();
  const { isAuthenticated } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    // Get user location and fetch spots
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
          // Set default location to Israel center
          setUserLocation({ lat: 31.5, lng: 34.8 });
        }
      );
    } else {
      // Set default location to Israel center
      setUserLocation({ lat: 31.5, lng: 34.8 });
    }

    fetchSpots();
  }, [fetchSpots, setUserLocation]);

  const handleAddSpot = () => {
    if (!isAuthenticated) {
      // Redirect to login or show login modal
      window.location.href = '/login';
      return;
    }
    setShowAddForm(true);
  };

  const handleAddSpotSuccess = () => {
    setShowAddForm(false);
    fetchSpots(); // Refresh spots
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-96 h-full">
          <Sidebar onAddSpot={handleAddSpot} />
        </div>

        {/* Mobile Sidebar */}
        {showSidebar && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
            <div className="relative w-80 h-full">
              <Sidebar onAddSpot={handleAddSpot} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(false)}
                className="absolute top-4 right-4 z-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapView className="w-full h-full" />
          
          {/* Mobile Controls */}
          <div className="lg:hidden absolute top-4 left-4 flex gap-2">
            <Button
              variant="default"
              size="icon"
              onClick={() => setShowSidebar(true)}
              className="shadow-medium"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          {/* Add Spot FAB */}
          <Button
            variant="hero"
            size="icon"
            onClick={handleAddSpot}
            className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-strong z-40"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Add Spot Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <AddSpotForm 
            onClose={() => setShowAddForm(false)}
            onSuccess={handleAddSpotSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;