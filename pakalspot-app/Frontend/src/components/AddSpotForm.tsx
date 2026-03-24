import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useSpots } from '../hooks/useSpots';
import { SpotType, CreateSpotRequest, GeocodeResult } from '../types/spot';
import { MapPin, Upload, X, Plus, Map } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import LocationSearch from './LocationSearch';
import { spotsAPI } from '../api/api';
import { useTranslation } from 'react-i18next';

interface AddSpotFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  initialLocation?: { lat: number; lng: number };
}

const spotTypes: SpotType[] = [
  'waterfall', 'spring', 'viewpoint', 'beach', 'lake', 'river', 'cave', 'park', 
  'forest', 'historical', 'archaeological', 'religious', 'restaurant', 'cafe', 
  'camping', 'other'
];

const AddSpotForm: React.FC<AddSpotFormProps> = ({ onClose, onSuccess, initialLocation }) => {
  const { createSpot } = useSpots();
  const { toast } = useToast();
  const { t } = useTranslation();
  
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
  const [dragActive, setDragActive] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);
  const [showCoordinateInputs, setShowCoordinateInputs] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

  const handleInputChange = (field: keyof CreateSpotRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (location: GeocodeResult) => {
    setSelectedLocation(location);
    setFormData(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
      locationName: location.name,
    }));
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) {
      console.log('No files selected');
      return;
    }
    
    console.log('Files selected:', files.length);
    
    const newFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    );
    
    console.log('Valid files after filtering:', newFiles.length);
    
    if (newFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please select valid image files under 10MB each.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPhotos(prev => {
      const updated = [...prev, ...newFiles].slice(0, 5); // Max 5 photos
      console.log('Updated selected photos:', updated.length);
      
      // Create object URLs for the new files
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setImageUrls(prevUrls => {
        // Clean up old URLs that are no longer needed
        const currentUrls = [...prevUrls, ...newUrls].slice(0, 5);
        return currentUrls;
      });
      
      return updated;
    });
    
    toast({
      title: "Photos added",
      description: `${newFiles.length} photo(s) added successfully.`,
    });
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      
      // Clean up the corresponding URL
      setImageUrls(prevUrls => {
        const urlToRevoke = prevUrls[index];
        if (urlToRevoke) {
          URL.revokeObjectURL(urlToRevoke);
        }
        return prevUrls.filter((_, i) => i !== index);
      });
      
      return updated;
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
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
                      {t(`spot_types.${type}`)}
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
              placeholder={t('spots.location_placeholder')}
              className="mb-3"
            />
            
            {/* Selected Location Display */}
            {selectedLocation && (
              <div className="mb-3 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
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
            
            {/* Drop Zone */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-2">
                {t('spots.drag_drop_photos')}
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  handleFileSelect(e.target.files);
                  // Reset the input value to allow selecting the same files again
                  e.target.value = '';
                }}
                className="hidden"
                id="photo-upload"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  const input = document.getElementById('photo-upload') as HTMLInputElement;
                  if (input) {
                    input.click();
                  }
                }}
              >
                {t('spots.select_photos')}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t('spots.photos_limit')}
              </p>
            </div>

            {/* Debug Info - Remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                <p>Debug: selectedPhotos.length = {selectedPhotos.length}</p>
                <p>selectedPhotos: {JSON.stringify(selectedPhotos.map(f => f.name))}</p>
              </div>
            )}

            {/* Selected Photos */}
            {selectedPhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  Selected Photos ({selectedPhotos.length}/5)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedPhotos.map((file, index) => (
                    <div key={`photo-${file.name}-${file.size}-${index}`} className="relative group">
                      <img
                        src={imageUrls[index] || URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                        onLoad={() => console.log(`Image ${index + 1} loaded successfully`)}
                        onError={(e) => {
                          console.error(`Failed to load image ${index + 1}:`, e);
                          // Fallback to creating a new URL if the managed one fails
                          const target = e.target as HTMLImageElement;
                          if (!imageUrls[index]) {
                            target.src = URL.createObjectURL(file);
                          }
                        }}
                      />
                      <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        {Math.round(file.size / 1024)}KB
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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