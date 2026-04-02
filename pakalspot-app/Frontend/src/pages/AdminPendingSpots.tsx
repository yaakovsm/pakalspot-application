import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useSpots } from '../hooks/useSpots';
import { spotsAPI } from '../api/api';
import { Spot } from '../types/spot';
import { ADMIN_EMAIL } from '../utils/authUser';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/use-toast';
import { getApiErrorDetail } from '../utils/apiError';
import { useAuthModal } from '../components/AuthModalProvider';

const AdminPendingSpots: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectSpot, fetchSpots } = useSpots();
  const [pending, setPending] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const isAdmin = Boolean(user?.is_admin || user?.email?.trim().toLowerCase() === ADMIN_EMAIL);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data } = await spotsAPI.getPendingSpots();
      setPending(Array.isArray(data) ? data : []);
    } catch {
      setPending([]);
      toast({ title: t('common.error'), variant: 'destructive' });
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

  const handleApprove = async (spot: Spot) => {
    setApprovingId(spot.id);
    try {
      await spotsAPI.approveSpot(spot.id);
      toast({
        title: t('spots.spot_approved_toast'),
        description: t('spots.spot_approved_toast_desc'),
      });
      await fetchSpots();
      setPending((prev) => prev.filter((s) => s.id !== spot.id));
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getApiErrorDetail(err, t('spots.spot_creation_failed')),
        variant: 'destructive',
      });
    } finally {
      setApprovingId(null);
    }
  };

  const openSpot = (spot: Spot) => {
    selectSpot(spot);
    navigate(`/spot/${spot.id}`);
  };

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{t('spots.pending_spots_title')}</h1>
        {loading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : pending.length === 0 ? (
          <p className="text-muted-foreground">{t('spots.pending_spots_empty')}</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((spot) => (
              <li key={spot.id}>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{spot.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {spot.createdBy?.username ?? '—'} · {spot.spot_type}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" type="button" onClick={() => openSpot(spot)}>
                        {t('spots.view_details')}
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => handleApprove(spot)}
                        disabled={approvingId === spot.id}
                      >
                        {t('spots.approve_spot')}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminPendingSpots;
