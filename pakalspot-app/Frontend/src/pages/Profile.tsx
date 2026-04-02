import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { authAPI, spotsAPI, getMediaUrl } from '../api/api';
import { normalizeAuthUser } from '../utils/authUser';
import { Spot, SpotType } from '../types/spot';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { useAuthModal } from '../components/AuthModalProvider';
import { useAddSpotModal } from '../components/AddSpotModalProvider';
import { User, MapPin, Pencil, ExternalLink, Plus } from 'lucide-react';

const spotTypes: SpotType[] = [
  'waterfall',
  'spring',
  'viewpoint',
  'beach',
  'lake',
  'river',
  'cave',
  'park',
  'forest',
  'historical',
  'archaeological',
  'religious',
  'restaurant',
  'cafe',
  'camping',
  'other',
];

function revisionPayload(spot: Spot): Record<string, unknown> | null {
  const hasPr = Boolean(spot.has_pending_revision || spot.hasPendingRevision);
  const raw = spot.pending_revision ?? spot.pendingRevision;
  if (hasPr && raw && typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return null;
}

const emptyEditForm = {
  title: '',
  description: '',
  subtitle: '',
  how_to_get_there: '',
  type: 'viewpoint' as SpotType,
  latitude: 0,
  longitude: 0,
  locationName: '',
  photos: [] as File[],
};

function buildEditForm(spot: Spot) {
  const rev = revisionPayload(spot);
  if (rev) {
    return {
      title: String(rev.title ?? ''),
      description: String(rev.description ?? ''),
      subtitle: rev.subtitle != null ? String(rev.subtitle) : '',
      how_to_get_there: rev.how_to_get_there != null ? String(rev.how_to_get_there) : '',
      type: (String(rev.spot_type ?? rev.spotType ?? spot.spot_type) as SpotType) || spot.spot_type,
      latitude: Number(rev.latitude ?? spot.lat),
      longitude: Number(rev.longitude ?? spot.lon),
      locationName: rev.location_name != null ? String(rev.location_name) : '',
      photos: [] as File[],
    };
  }
  return {
    title: spot.title,
    description: spot.description,
    subtitle: spot.subtitle ?? '',
    how_to_get_there: spot.how_to_get_there ?? '',
    type: spot.spot_type,
    latitude: spot.lat,
    longitude: spot.lon,
    locationName: '',
    photos: [] as File[],
  };
}

function photoThumbUrl(spot: Spot): string | null {
  const p = spot.photos?.[0] as Record<string, string> | undefined;
  if (!p) return null;
  const u = p.thumbnailUrl || p.thumbnail_url || p.url;
  return u ? getMediaUrl(u) : null;
}

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openAuthModal } = useAuthModal();
  const { openAddSpot } = useAddSpotModal();
  const { user, isAuthenticated, updateUser } = useAuth();

  const isHebrew = (i18n.language || 'he') === 'he';

  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingSpot, setSavingSpot] = useState(false);

  const loadMySpots = useCallback(async () => {
    setLoadingSpots(true);
    try {
      const res = await spotsAPI.getMySpots();
      setMySpots(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMySpots([]);
      toast({
        title: t('common.error'),
        description: t('auth.something_went_wrong'),
        variant: 'destructive',
      });
    } finally {
      setLoadingSpots(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.username || '');
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMySpots();
    }
  }, [isAuthenticated, loadMySpots]);

  useEffect(() => {
    if (editingSpot) {
      setEditForm(buildEditForm(editingSpot));
    }
  }, [editingSpot]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({
        display_name: displayName.trim(),
        avatar: avatarUrl.trim() || undefined,
      });
      const next = normalizeAuthUser(res.data);
      if (next) updateUser(next);
      toast({ title: t('profile.profile_updated') });
    } catch {
      toast({
        title: t('common.error'),
        description: t('auth.something_went_wrong'),
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('profile.password_mismatch'),
        variant: 'destructive',
      });
      return;
    }
    setSavingPassword(true);
    try {
      await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: t('profile.password_updated') });
      setShowPasswordDialog(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        t('auth.something_went_wrong');
      toast({
        title: t('common.error'),
        description: typeof msg === 'string' ? msg : t('auth.something_went_wrong'),
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpot) return;
    setSavingSpot(true);
    try {
      await spotsAPI.updateSpot(editingSpot.id, {
        title: editForm.title,
        description: editForm.description,
        subtitle: editForm.subtitle || undefined,
        how_to_get_there: editForm.how_to_get_there || undefined,
        type: editForm.type,
        latitude: editForm.latitude,
        longitude: editForm.longitude,
        locationName: editForm.locationName || undefined,
        photos: editForm.photos.length ? editForm.photos : undefined,
      });
      toast({ title: t('profile.spot_updated') });
      setEditingSpot(null);
      await loadMySpots();
    } catch {
      toast({
        title: t('common.error'),
        description: t('profile.spot_update_failed'),
        variant: 'destructive',
      });
    } finally {
      setSavingSpot(false);
    }
  };

  const memberSince =
    user?.createdAt &&
    !Number.isNaN(Date.parse(user.createdAt)) &&
    new Date(user.createdAt).toLocaleDateString(isHebrew ? 'he-IL' : undefined);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto text-center py-16">
            <User className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('profile.sign_in_title')}</h2>
            <p className="text-muted-foreground mb-6">{t('profile.sign_in_description')}</p>
            <Button variant="hero" onClick={() => openAuthModal('login')}>
              {t('auth.login')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">{t('profile.title')}</h1>

        <Card className="mb-6 border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">{t('profile.account')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatar ? getMediaUrl(user.avatar) : undefined} alt={user?.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user?.username ? getInitials(user.username) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-xl font-semibold text-foreground">{user?.username}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {memberSince && (
                <p className="text-sm text-muted-foreground">
                  {t('profile.member_since')}: {memberSince}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">{t('profile.edit_profile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('profile.display_name')}</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('profile.avatar_url')}</label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="mt-1"
                  placeholder="https://..."
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="hero" disabled={savingProfile}>
                  {savingProfile ? t('common.loading') : t('profile.save_profile')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(true)}>
                  {t('profile.open_change_password')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-3">
            <h2 className="text-2xl font-bold text-foreground">{t('profile.my_spots')}</h2>
            <Button
              type="button"
              variant="hero"
              className="gap-2 shrink-0 w-full sm:w-auto"
              onClick={() => openAddSpot({ onSuccess: loadMySpots })}
            >
              <Plus className="w-4 h-4" />
              {t('profile.add_spot')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{t('profile.reapproval_notice')}</p>
          <p className="text-sm text-muted-foreground">{t('profile.public_sees_approved')}</p>
        </div>

        {loadingSpots ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : mySpots.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>{t('profile.no_spots')}</p>
              <Button variant="link" className="mt-2" onClick={() => openAddSpot({ onSuccess: loadMySpots })}>
                {t('profile.add_spot_hint')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mySpots.map((spot) => {
              const approved = spot.approval_status === 'approved';
              const hasPr = Boolean(spot.has_pending_revision || spot.hasPendingRevision);
              const thumb = photoThumbUrl(spot);
              return (
                <Card
                  key={spot.id}
                  className={`overflow-hidden border-border shadow-soft ${approved && !hasPr ? 'ring-2 ring-green-600/70' : ''}`}
                >
                  <CardContent className="p-0">
                    <div className="flex gap-3 p-4">
                      <div className="w-24 h-24 rounded-lg bg-muted shrink-0 overflow-hidden">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex w-full flex-wrap items-center gap-2 justify-start mb-2">
                          {approved ? (
                            <Badge
                              variant="outline"
                              className="border-2 border-green-600 text-green-800 dark:text-green-400 dark:border-green-500"
                            >
                              {t('profile.badge_approved')}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-2 border-muted-foreground/45 text-muted-foreground"
                            >
                              {t('profile.badge_pending')}
                            </Badge>
                          )}
                          {approved && hasPr && (
                            <Badge
                              variant="outline"
                              className="border-2 border-amber-500/80 text-amber-900 dark:text-amber-200"
                            >
                              {t('profile.badge_changes_pending')}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground truncate">{spot.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => setEditingSpot(spot)}>
                            <Pencil className="w-4 h-4 me-1" />
                            {t('profile.edit_spot')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/spot/${spot.id}`)}>
                            <ExternalLink className="w-4 h-4 me-1" />
                            {t('profile.view_spot')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }
        }}
      >
        <DialogContent className="max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('profile.password_section')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('profile.current_password')}</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('profile.new_password')}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('profile.confirm_password')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="hero" disabled={savingPassword}>
                {savingPassword ? t('common.loading') : t('profile.change_password')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSpot} onOpenChange={(o) => !o && setEditingSpot(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isHebrew ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('profile.edit_spot')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSpot} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('spots.title')}</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('spots.description')}</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1"
                required
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('spots.subtitle')}</label>
              <Input
                value={editForm.subtitle}
                onChange={(e) => setEditForm((f) => ({ ...f, subtitle: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('spots.how_to_get_there')}</label>
              <Textarea
                value={editForm.how_to_get_there}
                onChange={(e) => setEditForm((f) => ({ ...f, how_to_get_there: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('spots.type')}</label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm((f) => ({ ...f, type: v as SpotType }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {spotTypes.map((st) => (
                    <SelectItem key={st} value={st}>
                      {t(`spot_types.${st}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t('spots.latitude')}</label>
                <Input
                  type="number"
                  step="any"
                  value={editForm.latitude}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))
                  }
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('spots.longitude')}</label>
                <Input
                  type="number"
                  step="any"
                  value={editForm.longitude}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))
                  }
                  className="mt-1"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('profile.photos_optional')}</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                className="mt-1"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setEditForm((f) => ({ ...f, photos: files }));
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditingSpot(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="hero" disabled={savingSpot}>
                {savingSpot ? t('common.loading') : t('profile.save_profile')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
