import React, { useEffect } from 'react';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import SpotCard from '../components/SpotCard';
import { Button } from '../components/ui/button';
import { Heart, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Favorites: React.FC = () => {
  const { favorites, fetchFavorites, selectSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchFavorites();
  }, [isAuthenticated, fetchFavorites, navigate]);

  const handleViewDetails = (spot: any) => {
    selectSpot(spot);
    navigate('/');
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Your Favorites</h1>
              <p className="text-muted-foreground">
                {favorites.length} spot{favorites.length !== 1 ? 's' : ''} you've saved
              </p>
            </div>
          </div>

          {/* Content */}
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map(spot => (
                <SpotCard 
                  key={spot.id} 
                  spot={spot} 
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No favorites yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start exploring and save spots you love. They'll appear here for easy access.
              </p>
              <Button variant="hero" onClick={() => navigate('/')} className="gap-2">
                <MapPin className="w-4 h-4" />
                Discover Spots
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;