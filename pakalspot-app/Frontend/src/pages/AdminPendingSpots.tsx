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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/use-toast';
import { getApiErrorDetail } from '../utils/apiError';
import { useAuthModal } from '../components/AuthModalProvider';

function approvalStatus(spot: Spot): string | undefined {
  return spot.approval_status ?? (spot as { approvalStatus?: string }).approvalStatus;
}

function isPendingNewSpot(spot: Spot): boolean {
  return approvalStatus(spot) === 'pending';
}

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
  const [translateSpot, setTranslateSpot] = useState<Spot | null>(null);
  const [titleEn, setTitleEn] = useState('');
  const [subtitleEn, setSubtitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [howToEn, setHowToEn] = useState('');
  const [locationNameEn, setLocationNameEn] = useState('');
  const [savingTranslation, setSavingTranslation] = useState(false);

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

  useEffect(() => {
    if (!translateSpot) return;
    setTitleEn(translateSpot.title_en ?? '');
    setSubtitleEn(translateSpot.subtitle_en ?? '');
    setDescriptionEn(translateSpot.description_en ?? '');
    setHowToEn(translateSpot.how_to_get_there_en ?? '');
    setLocationNameEn(translateSpot.location_name_en ?? '');
  }, [translateSpot]);

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

  const saveTranslations = async () => {
    if (!translateSpot) return;
    setSavingTranslation(true);
    try {
      const { data } = await spotsAPI.updateSpotTranslations(translateSpot.id, {
        title_en: titleEn.trim() || null,
        subtitle_en: subtitleEn.trim() || null,
        description_en: descriptionEn.trim() || null,
        how_to_get_there_en: howToEn.trim() || null,
        location_name_en: locationNameEn.trim() || null,
      });
      toast({
        title: t('spots.translation_saved_toast'),
        description: t('spots.translation_saved_toast_desc'),
      });
      setPending((prev) => prev.map((s) => (s.id === data.id ? { ...s, ...data } : s)));
      setTranslateSpot(null);
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getApiErrorDetail(err, t('spots.translation_save_failed')),
        variant: 'destructive',
      });
    } finally {
      setSavingTranslation(false);
    }
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
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <Button variant="outline" size="sm" type="button" onClick={() => openSpot(spot)}>
                        {t('spots.view_details')}
                      </Button>
                      {isPendingNewSpot(spot) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => setTranslateSpot(spot)}
                        >
                          {t('spots.translate_spot')}
                        </Button>
                      )}
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

      <Dialog open={!!translateSpot} onOpenChange={(open) => !open && setTranslateSpot(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('spots.translation_dialog_title')}</DialogTitle>
            <DialogDescription>{t('spots.translation_dialog_description')}</DialogDescription>
          </DialogHeader>
          {translateSpot && (
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-2">
                <p className="font-medium text-foreground">{t('spots.translation_source_he')}</p>
                <p className="font-semibold">{translateSpot.title}</p>
                {translateSpot.subtitle ? (
                  <p className="text-muted-foreground">{translateSpot.subtitle}</p>
                ) : null}
                <p className="whitespace-pre-wrap">{translateSpot.description}</p>
                {translateSpot.how_to_get_there ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">{translateSpot.how_to_get_there}</p>
                ) : null}
                {translateSpot.location_name ? (
                  <p className="text-muted-foreground">{translateSpot.location_name}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title-en">{t('spots.translation_title_en')}</Label>
                <Input
                  id="title-en"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={t('spots.title_placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle-en">{t('spots.translation_subtitle_en')}</Label>
                <Input
                  id="subtitle-en"
                  value={subtitleEn}
                  onChange={(e) => setSubtitleEn(e.target.value)}
                  placeholder={t('spots.subtitle_placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc-en">{t('spots.translation_description_en')}</Label>
                <Textarea
                  id="desc-en"
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder={t('spots.description_placeholder')}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="how-en">{t('spots.translation_how_en')}</Label>
                <Textarea
                  id="how-en"
                  value={howToEn}
                  onChange={(e) => setHowToEn(e.target.value)}
                  placeholder={t('spots.how_to_get_there_placeholder')}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-en">{t('spots.translation_location_name_en')}</Label>
                <Input
                  id="loc-en"
                  value={locationNameEn}
                  onChange={(e) => setLocationNameEn(e.target.value)}
                  placeholder={t('spots.location_placeholder')}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setTranslateSpot(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={saveTranslations} disabled={savingTranslation || !translateSpot}>
              {savingTranslation ? t('common.loading') : t('spots.translation_save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPendingSpots;
