import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useSpots } from '../hooks/useSpots';
import { SpotType, CreateSpotRequest, GeocodeResult } from '../types/spot';
import { MapPin, X, Plus, Map } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import LocationSearch from './LocationSearch';
import { spotsAPI } from '../api/api';
import { useTranslation } from 'react-i18next';
import SpotPhotoDropzone from './SpotPhotoDropzone';

interface AddSpotFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  initialLocation?: { lat: number; lng: number };
}

const spotTypes: SpotType[] = [
  'waterfall',
  'spring',
  'viewpoint',
  'forest',
  'desert',
  'river',
  'lake',
  'beach',
  'park',
];

const AddSpotForm: React.FC<AddSpotFormProps> = ({ onClose, onSuccess, initialLocation }) => {
  const { createSpot } = useSpots();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRtlLanguage = (i18n.resolvedLanguage || i18n.language || 'he').toLowerCase().startsWith('he');
  
  const [formData, setFormData] = useState<Partial<CreateSpotRequest>>({
    title: '',
    description: '',
    subtitle: '',
    how_to_get_there: '',
    type: 'waterfall',
    latitude: initialLocation?.lat || 0,
    longitude: initialLocation?.lng || 0,
    locationName: '',
    photos: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);
  const [locationSearchInitialValue, setLocationSearchInitialValue] = useState('');
  const [showCoordinateInputs, setShowCoordinateInputs] = useState(false);

  const handleInputChange = (field: keyof CreateSpotRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (location: GeocodeResult) => {
    setSelectedLocation(location);
    setLocationSearchInitialValue(location.name);
    setFormData(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
      locationName: location.name,
    }));
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Check if location is within Israel bounds
          const isInIsrael = lng >= 34.25 && lng <= 35.9 && lat >= 29.5 && lat <= 33.4;
          
          if (isInIsrael) {
            try {
              // Try to reverse geocode to get location name
              const response = await spotsAPI.reverseGeocode(lat, lng);
              const locationData = response.data;
              setSelectedLocation(locationData);
              setLocationSearchInitialValue(locationData.name);
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                locationName: locationData.name,
              }));
              toast({
                title: "Location updated",
                description: `Current location set: ${locationData.name}`,
              });
            } catch (error) {
              // Fallback if reverse geocoding fails
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
              }));
              toast({
                title: "Location updated",
                description: "Current location has been set for the spot.",
              });
            }
          } else {
            toast({
              title: "Location outside Israel",
              description: "Please select a location within Israel boundaries.",
              variant: "destructive",
            });
          }
        },
        (error) => {
          toast({
            title: "Location error",
            description: "Could not get your current location.",
            variant: "destructive",
          });
        }
      );
    }
  };

  useEffect(() => {
    if (!initialLocation) return;

    let isCancelled = false;

    const hydrateInitialLocation = async () => {
      const fallbackLabel = t('spots.pinned_location_fallback');

      try {
        const response = await spotsAPI.reverseGeocode(initialLocation.lat, initialLocation.lng);
        const locationData = response.data as GeocodeResult;
        if (isCancelled) return;

        setSelectedLocation(locationData);
        setLocationSearchInitialValue(locationData.name);
        setFormData(prev => ({
          ...prev,
          latitude: initialLocation.lat,
          longitude: initialLocation.lng,
          locationName: locationData.name,
        }));
      } catch (error) {
        if (isCancelled) return;

        const fallbackLocation: GeocodeResult = {
          name: fallbackLabel,
          lat: initialLocation.lat,
          lng: initialLocation.lng,
          address: '',
        };
        setSelectedLocation(fallbackLocation);
        setLocationSearchInitialValue(fallbackLabel);
        setFormData(prev => ({
          ...prev,
          latitude: initialLocation.lat,
          longitude: initialLocation.lng,
          locationName: fallbackLabel,
        }));
      }
    };

    void hydrateInitialLocation();

    return () => {
      isCancelled = true;
    };
  }, [initialLocation, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.type) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedLocation || !formData.latitude || !formData.longitude) {
      toast({
        title: "Location required",
        description: "Please select a location for the spot.",
        variant: "destructive",
      });
      return;
    }

    // Check if location is within Israel bounds
    const isInIsrael = formData.longitude! >= 34.25 && formData.longitude! <= 35.9 && 
                      formData.latitude! >= 29.5 && formData.latitude! <= 33.4;
    
    if (!isInIsrael) {
      toast({
        title: "Location outside Israel",
        description: "Please select a location within Israel boundaries.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const spotData: CreateSpotRequest = {
        title: formData.title!,
        description: formData.description!,
        subtitle: formData.subtitle,
        how_to_get_there: formData.how_to_get_there,
        type: formData.type!,
        latitude: formData.latitude!,
        longitude: formData.longitude!,
        locationName: formData.locationName,
        photos: selectedPhotos,
      };

      const newSpot = await createSpot(spotData);
      const approval =
        newSpot.approval_status ??
        (newSpot as { approvalStatus?: string }).approvalStatus;

      if (approval === 'pending') {
        toast({
          title: t('spots.spot_pending_title'),
          description: t('spots.spot_pending_desc'),
        });
      } else {
        toast({
          title: t('spots.spot_created_success'),
          description: t('spots.spot_created_success_desc'),
        });
      }
      
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('spots.spot_creation_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-strong">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-foreground">{t('spots.add_new_spot')}</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('spots.title')} *
              </label>
              <Input
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={t('spots.title_placeholder')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('spots.subtitle')}
              </label>
              <Input
                value={formData.subtitle || ''}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                placeholder={t('spots.subtitle_placeholder')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('spots.description')} *
              </label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('spots.description_placeholder')}
                className="min-h-[100px]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('spots.how_to_get_there')}
              </label>
              <Textarea
                value={formData.how_to_get_there || ''}
                onChange={(e) => handleInputChange('how_to_get_there', e.target.value)}
                placeholder={t('spots.how_to_get_there_placeholder')}
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('spots.type')} *
              </label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange('type', value as SpotType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('spots.select_type')} />
                </SelectTrigger>
                <SelectContent>
                  {spotTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {t(`spots.spot_types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('spots.location')} *
            </label>
            <LocationSearch
              onLocationSelect={handleLocationSelect}
              initialValue={locationSearchInitialValue}
              placeholder={t('spots.location_placeholder')}
              className="mb-3"
            />
            
            {/* Selected Location Display */}
            {selectedLocation && (
              <div className="mb-3 p-3 bg-muted/50 rounded-lg border">
                <div
                  className={`flex items-center mb-2 ${isRtlLanguage ? 'flex-row-reverse justify-end text-right gap-2' : 'gap-2 text-left'}`}
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{selectedLocation.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>{t('spots.coordinates')}: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
                </div>
              </div>
            )}

            {/* Coordinate Refinement */}
            <div className="space-y-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowCoordinateInputs(!showCoordinateInputs)}
                className="w-full gap-2"
              >
                <Map className="w-4 h-4" />
                {showCoordinateInputs ? t('spots.hide') : t('spots.refine')} {t('spots.coordinates')}
              </Button>
              
              {showCoordinateInputs && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                    placeholder={t('spots.latitude')}
                  />
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                    placeholder={t('spots.longitude')}
                  />
                </div>
              )}
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={getCurrentLocation}
              className="w-full gap-2 mt-2"
            >
              <MapPin className="w-4 h-4" />
              {t('spots.use_current_location')}
            </Button>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('spots.photos_optional')}
            </label>
            <SpotPhotoDropzone
              inputId="spot-photo-add"
              files={selectedPhotos}
              onFilesChange={setSelectedPhotos}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                {t('common.cancel')}
              </Button>
            )}
            <Button 
              type="submit" 
              variant="hero" 
              disabled={isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('spots.creating')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t('spots.create_spot')}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddSpotForm;