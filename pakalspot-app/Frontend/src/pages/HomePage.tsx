import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MapPin } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleExploreMap = () => {
    navigate('/');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="/PakalSpot_Transperent_logo.png" 
              alt="PakalSpot Logo" 
              className="w-20 h-20 mx-auto object-contain"
            />
          </div>
          
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            ברוכים הבאים ל־PakalSpot
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-foreground/80 max-w-3xl mx-auto leading-relaxed">
            קהילה של אנשים שאוהבים קפה, טבע ורגעים טובים.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image - Left side on desktop, top on mobile */}
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-strong">
                <img 
                  src="/IMG_5307.JPG" 
                  alt="קפה בטבע" 
                  className="w-full h-80 lg:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
            
            {/* Text Content - Right side on desktop, bottom on mobile */}
            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                הסיפור שלנו
              </h2>
              
              <div className="space-y-4 text-lg text-foreground/90 leading-relaxed">
                <p>
                  PakalSpot נוצר מתוך אהבה לקפה, לטבע ולשיתוף רגעים עם אחרים.
                </p>
                
                <p>
                  הרעיון פשוט: לאפשר לכל אחד לשתף את המקום שבו הוא אוהב לשתות קפה, 
                  לראות חוויות של אחרים, ולגלות מקומות חדשים להכין בהם קפה בטבע.
                </p>
                
                <p>
                  הצטרפו אלינו לחוויה שמחברת בין אנשים, טבע וקפה - שלוש אהבות שזורות זו בזו.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Button
            onClick={handleExploreMap}
            size="lg"
            className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full shadow-strong hover:shadow-strong transition-all duration-300 transform hover:scale-105"
          >
            <MapPin className="w-5 h-5 ml-2" />
            גלו ספוטים על המפה
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
