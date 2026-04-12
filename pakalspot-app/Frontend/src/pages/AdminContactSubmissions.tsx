import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { contactAPI, ContactSubmission } from '../api/api';
import { ADMIN_EMAIL } from '../utils/authUser';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { getApiErrorDetail } from '../utils/apiError';
import { useAuthModal } from '../components/AuthModalProvider';

function formatWhen(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const AdminContactSubmissions: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [rows, setRows] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = Boolean(user?.is_admin || user?.email?.trim().toLowerCase() === ADMIN_EMAIL);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data } = await contactAPI.listSubmissions();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      toast({
        title: t('common.error'),
        description: getApiErrorDetail(err, t('contact.admin_load_error')),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, t, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal('login');
      navigate('/');
      return;
    }
    if (!isAdmin) {
      navigate('/');
      return;
    }
    load();
  }, [isAuthenticated, isAdmin, navigate, load, openAuthModal]);

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{t('contact.admin_title')}</h1>
        {loading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">{t('contact.admin_empty')}</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{r.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('contact.submitted_at')}: {formatWhen(r.created_at, i18n.language || 'he')}
                    </p>
                    <a
                      href={`mailto:${r.email}`}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {r.email}
                    </a>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{r.issue}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminContactSubmissions;
