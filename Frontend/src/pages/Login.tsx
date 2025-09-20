import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: t('auth.validation_error'),
        description: t('auth.fill_all_fields'),
        variant: "destructive",
      });
      return;
    }

    try {
      await login(formData);
      toast({
        title: t('auth.welcome_back'),
        description: t('auth.account_created_successfully'),
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: t('auth.login_failed'),
        description: error.response?.data?.message || t('auth.invalid_credentials'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 px-4 py-2">
          <div className="inline-flex items-center gap-2">
            <img 
              src="/PakalSpot_Transperent_logo.png" 
              alt="PakalSpot Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-3xl font-bold text-white">{t('app.name')}</span>
          </div>
          <p className="text-white/80 mt-2">{t('auth.discover_amazing_places')}</p>
        </div>

        <Card className="shadow-strong border-0">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-foreground">
              {t('auth.welcome_back')}
            </CardTitle>
            <p className="text-center text-muted-foreground">
              {t('auth.sign_in_to_continue')}
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('auth.email')}
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('auth.enter_email')}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={t('auth.enter_password')}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('auth.signing_in')}
                  </>
                ) : (
                  t('auth.sign_in')
                )}
              </Button>

              <div className="text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:text-primary-dark transition-colors"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t('auth.dont_have_account')}
                  </span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/register')}
              >
                {t('auth.create_account')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link 
            to="/" 
            className="text-white/80 hover:text-white transition-colors text-sm"
          >
            {t('auth.back_to_home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;