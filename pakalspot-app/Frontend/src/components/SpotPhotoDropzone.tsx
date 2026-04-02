import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';

const MAX_PHOTOS = 5;
const MAX_BYTES = 10 * 1024 * 1024;

export interface SpotPhotoDropzoneProps {
  files: File[];
  onFilesChange: (next: File[]) => void;
  inputId: string;
  className?: string;
}

const SpotPhotoDropzone: React.FC<SpotPhotoDropzoneProps> = ({
  files,
  onFilesChange,
  inputId,
  className,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useLayoutEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const mergeFiles = useCallback(
    (incoming: File[]) => {
      const newFiles = incoming.filter(
        (file) => file.type.startsWith('image/') && file.size <= MAX_BYTES
      );

      if (newFiles.length === 0) {
        toast({
          title: t('spots.photos_invalid_title'),
          description: t('spots.photos_invalid_desc'),
          variant: 'destructive',
        });
        return;
      }

      const merged = [...files, ...newFiles].slice(0, MAX_PHOTOS);
      const added = merged.length - files.length;
      onFilesChange(merged);

      if (added > 0) {
        toast({
          title: t('spots.photos_added_title'),
          description:
            added === 1
              ? t('spots.photos_added_desc_one')
              : t('spots.photos_added_desc_other', { count: added }),
        });
      }
    },
    [files, onFilesChange, t, toast]
  );

  const handleFileSelect = (list: FileList | null) => {
    if (!list?.length) return;
    mergeFiles(Array.from(list));
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
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const openPicker = () => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.click();
  };

  return (
    <div className={className}>
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
        <p className="text-muted-foreground mb-2">{t('spots.drag_drop_photos')}</p>
        <input
          type="file"
          multiple
          accept="image/*"
          id={inputId}
          onChange={(e) => {
            handleFileSelect(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <Button type="button" variant="outline" onClick={openPicker}>
          {t('spots.select_photos')}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">{t('spots.photos_limit')}</p>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-foreground mb-2">
            {t('spots.photos_preview_label', { count: files.length })}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {files.map((file, index) => {
              const src = previewUrls[index];
              if (!src) return null;
              return (
              <div key={`${file.name}-${file.size}-${index}`} className="relative group">
                <img
                  src={src}
                  alt=""
                  className="w-full h-24 object-cover rounded-lg border"
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
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotPhotoDropzone;
