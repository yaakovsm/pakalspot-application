import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { MapPin } from 'lucide-react';
import Header from '../components/Header';
import MobileLayout from '../components/mobile/MobileLayout';

const About: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = (i18n.language || 'he').startsWith('he');

  const handleExploreMap = () => {
    navigate('/');
  };

  return (
    <MobileLayout>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background">
        <Header />

        <section className="pt-0 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* First 2x2 Grid: welcome + story (ltr grid so TL/TR match layout spec) */}
            <div dir="ltr" className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-0 md:min-h-[900px] lg:min-h-[1130px]">
            {/* Top Left - Welcome (title + subtitle + logo) */}
            <div className="bg-background flex items-center justify-center p-5 sm:p-7 lg:p-8 min-h-0 md:overflow-y-auto">
              <div
                className="flex flex-col items-center justify-center text-center gap-4 sm:gap-6 w-full max-w-xl"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <img
                  src="/PakalSpot_Transperent_logo.png"
                  alt="PakalSpot Logo"
                  className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 shrink-0 object-contain"
                />
                <div className="space-y-4 shrink">
                  <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground leading-tight text-center">
                    {t('about.hero_title')}
                  </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-foreground/80 leading-relaxed text-center">
                    {t('about.hero_subtitle')}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Right - Welcome image */}
            <div className="overflow-hidden min-h-0 h-64 sm:h-80 md:h-auto">
              <img
                src="/IMG_1396.JPG"
                alt={t('about.welcome_image_alt')}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Left - Story image */}
            <div className="overflow-hidden min-h-0 h-64 sm:h-80 md:h-auto">
              <img
                src="/IMG_5755.jpg"
                alt={t('about.story_image_alt')}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Right - Story text */}
            <div className="bg-background flex items-center justify-end p-5 sm:p-7 lg:p-8 min-h-0 md:overflow-y-auto">
              <div className="space-y-4 sm:space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
                <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-foreground">
                  {t('about.story_title')}
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg text-foreground/90 leading-relaxed">
                  <p>{t('about.story_paragraph_1')}</p>
                  <p>{t('about.story_paragraph_2')}</p>
                  <p>{t('about.story_paragraph_3')}</p>
                </div>
              </div>
            </div>
          </div>

            {/* Second 2x2 Grid: step 1 + step 2 */}
            <div dir="ltr" className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-0 md:min-h-[900px] lg:min-h-[1130px]">
            {/* Top Left - Step 1 text */}
            <div className="bg-background flex items-center justify-start p-5 sm:p-7 lg:p-8 min-h-0 md:overflow-y-auto">
              <div className="space-y-4 sm:space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
                <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground">
                  {t('about.how_title')}
                </h3>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg text-foreground/90 leading-relaxed">
                  <p>{t('about.how_paragraph')}</p>
                </div>
              </div>
            </div>

            {/* Top Right - Step 1 image */}
            <div className="overflow-hidden min-h-0 h-64 sm:h-80 md:h-auto">
              <img
                src="/pakalspot-screenshot.jpg"
                alt={t('about.how_image_alt')}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Left - Step 2 image */}
            <div className="overflow-hidden min-h-0 h-64 sm:h-80 md:h-auto">
              <img
                src="/IMG_6930.JPG"
                alt={t('about.share_image_alt')}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Right - Step 2 text */}
            <div className="bg-background flex items-center justify-end p-5 sm:p-7 lg:p-8 min-h-0 md:overflow-y-auto">
              <div className="space-y-4 sm:space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
                <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground">
                  {t('about.share_title')}
                </h3>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg text-foreground/90 leading-relaxed">
                  <p>{t('about.share_paragraph')}</p>
                </div>
              </div>
            </div>
            </div>
          </div>
        </section>

        <section className="pt-8 pb-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Button
              onClick={handleExploreMap}
              size="lg"
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full shadow-strong hover:shadow-strong transition-all duration-300 transform hover:scale-105"
            >
              <MapPin className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              {t('about.cta_explore_map')}
            </Button>
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default About;
