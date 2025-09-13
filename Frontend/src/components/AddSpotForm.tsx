import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useSpots } from '../hooks/useSpots';
import { SpotType, IsraeliRegion, CreateSpotRequest } from '../types/spot';
import { MapPin, Upload, X, Plus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface AddSpotFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  initialLocation?: { lat: number; lng: number };
}

const spotTypes: { value: SpotType; label: string }[] = [
  { value: 'waterfall', label: 'Waterfall' },
  { value: 'spring', label: 'Spring' },
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'beach', label: 'Beach' },
  { value: 'lake', label: 'Lake' },
  { value: 'river', label: 'River' },
  { value: 'cave', label: 'Cave' },
  { value: 'park', label: 'Park' },
  { value: 'forest', label: 'Forest' },
  { value: 'historical', label: 'Historical Site' },
  { value: 'archaeological', label: 'Archaeological Site' },
  { value: 'religious', label: 'Religious Site' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'camping', label: 'Camping' },
  { value: 'other', label: 'Other' },
];

const israeliRegions: { value: IsraeliRegion; label: string }[] = [
  { value: 'negev', label: 'Negev' },
  { value: 'galilee', label: 'Galilee' },
  { value: 'golan', label: 'Golan Heights' },
  { value: 'shfela', label: 'Shfela' },
  { value: 'sharon', label: 'Sharon' },
  { value: 'shomron', label: 'Shomron (Samaria)' },
  { value: 'jerusalem', label: 'Jerusalem Area' },
  { value: 'arava', label: 'Arava' },
];

const AddSpotForm: React.FC<AddSpotFormProps> = ({ onClose, onSuccess, initialLocation }) => {
  const { createSpot } = useSpots();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<CreateSpotRequest>>({
    title: '',
    description: '',
    type: 'waterfall',
    latitude: initialLocation?.lat || 31.5,
    longitude: initialLocation?.lng || 34.8,
    region: 'jerusalem',
    photos: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (field: keyof CreateSpotRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );
    
    setSelectedPhotos(prev => [...prev, ...newFiles].slice(0, 5)); // Max 5 photos
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
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
    
    handleFileSelect(e.dataTransfer.files);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Check if location is within Israel bounds
          const isInIsrael = lng >= 34.25 && lng <= 35.9 && lat >= 29.5 && lat <= 33.4;
          
          if (isInIsrael) {
            setFormData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lng,
            }));
            toast({
              title: "Location updated",
              description: "Current location has been set for the spot.",
            });
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

    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Location required",
        description: "Please set a location for the spot.",
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
        type: formData.type!,
        latitude: formData.latitude!,
        longitude: formData.longitude!,
        region: formData.region!,
        photos: selectedPhotos,
      };

      await createSpot(spotData);
      
      toast({
        title: "Success!",
        description: "Your spot has been created successfully.",
      });
      
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create spot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-strong">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-foreground">Add New Spot</CardTitle>
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
                Title *
              </label>
              <Input
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Give your spot a catchy name..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description *
              </label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what makes this spot special..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type *
                </label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleInputChange('type', value as SpotType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select spot type" />
                  </SelectTrigger>
                  <SelectContent>
                    {spotTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Region *
                </label>
                <Select 
                  value={formData.region} 
                  onValueChange={(value) => handleInputChange('region', value as IsraeliRegion)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {israeliRegions.map(region => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Location *
            </label>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <Input
                type="number"
                step="any"
                value={formData.latitude || ''}
                onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                placeholder="Latitude"
                required
              />
              <Input
                type="number"
                step="any"
                value={formData.longitude || ''}
                onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                placeholder="Longitude"
                required
              />
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={getCurrentLocation}
              className="w-full gap-2"
            >
              <MapPin className="w-4 h-4" />
              Use Current Location
            </Button>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Photos (Optional)
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
                Drag and drop photos here, or click to select
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id="photo-upload"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                Select Photos
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Max 5 photos, 5MB each
              </p>
            </div>

            {/* Selected Photos */}
            {selectedPhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  Selected Photos ({selectedPhotos.length}/5)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedPhotos.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
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
                Cancel
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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Spot
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