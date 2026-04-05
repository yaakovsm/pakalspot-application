import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MapPin } from 'lucide-react';
import Header from '../components/Header';

const About: React.FC = () => {
  const navigate = useNavigate();

  const handleExploreMap = () => {
    navigate('/');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="/PakalSpot_Transperent_logo.png" 
              alt="PakalSpot Logo" 
              className="w-56 h-56 mx-auto object-contain"
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

      {/* Combined Story and How It Works Section - Starbucks Style Collage */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          {/* First 2x2 Grid */}
          <div className="grid grid-cols-2 grid-rows-2 gap-0 h-[1130px]">
            {/* Top Left - Story Image */}
            <div className="overflow-hidden">
              <img 
                src="/IMG_6930.JPG" 
                alt="קפה בטבע" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Top Right - Story Text */}
            <div className="bg-background flex items-center justify-end p-8">
              <div className="space-y-6" dir="rtl">
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
            
            {/* Bottom Left - Step 1 Text */}
            <div className="bg-background flex items-center justify-start p-8">
              <div className="space-y-6" dir="rtl">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                  איך זה עובד?
                </h3>
                <div className="space-y-4 text-lg text-foreground/90 leading-relaxed">
                  <p>
                    חפש ספוטים על המפה, גלה מקומות מיוחדים להכנת קפה בטבע — לפי אזור, סוג נוף או חוות דעת של אחרים.
עיין בתמונות, חוויות והמלצות של אנשים שביקרו במקום, ושתף גם אתה את המיקום שלך והוסף תמונה כדי להכניס אחרים לחוויה.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom Right - Step 1 Image */}
            <div className="overflow-hidden">
              <img 
                src="/pakalspot-screenshot.jpg" 
                alt="חיפוש ספוטים על המפה" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Second 2x2 Grid */}
          <div className="grid grid-cols-2 grid-rows-2 gap-0 h-[1130px]">
            {/* Top Left - Step 2 Image */}
            <div className="overflow-hidden">
              <img 
                src="/IMG_2746(1).jpg" 
                alt="חוות דעת ותמונות" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Top Right - Step 2 Text */}
            <div className="bg-background flex items-center justify-end p-8">
              <div className="space-y-6" dir="rtl">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                  שתף חוויה, לא רק מיקום
                </h3>
                <div className="space-y-4 text-lg text-foreground/90 leading-relaxed">
                  <p>
                    ב־PakalSpot אנחנו מאמינים שכל רגע קטן של קפה בטבע שווה שיתוף.
ספר את הסיפור שלך — מה גרם לך לבחור דווקא בספוט הזה, עם מי היית, ואיך הרגע הזה הרגיש.
כל תמונה והמלצה שלך מוסיפות השראה לאחרים לצאת ולגלות.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom Left - Community Text */}
            <div className="bg-background flex items-center justify-start p-8">
              <div className="space-y-6" dir="rtl">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                  קהילה של חובבי קפה וטבע
                </h3>
                <div className="space-y-4 text-lg text-foreground/90 leading-relaxed">
                  <p>
                  הקהילה של PakalSpot מחברת בין אנשים שאוהבים קפה, טבע ורגעים טובים.
                  הצטרף אלינו, גלה ספוטים חדשים, שתף חוויות, ותרום לקהילה שמבינה שלפעמים — הקפה הכי טוב הוא זה שמכינים בחוץ, עם נוף פתוח ולב רגוע.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom Right - Step 3 Image */}
            <div className="overflow-hidden">
              <img 
                src="/IMG_5755.jpg" 
                alt="שיתוף מיקום ותמונה" 
                className="w-full h-full object-cover"
              />
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

export default About;
