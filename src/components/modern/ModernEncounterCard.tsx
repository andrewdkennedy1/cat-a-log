/**
 * Modern EncounterCard component using shadcn/ui
 */

import { Calendar, MapPin, Palette, Scissors, Cat, MessageSquare, Edit, Trash2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { storageService } from '@/services/StorageService';
import { useState, useEffect } from 'react';
import type { CatEncounter } from '@/types';

interface ModernEncounterCardProps {
  encounter: CatEncounter;
  onEdit?: (encounter: CatEncounter) => void;
  onDelete?: (encounter: CatEncounter) => void;
  className?: string;
  compact?: boolean;
}

export function ModernEncounterCard({ 
  encounter, 
  onEdit, 
  onDelete, 
  className,
  compact = false
}: ModernEncounterCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadPhoto = async () => {
      if (encounter.photoBlobId) {
        try {
          const blob = await storageService.getPhoto(encounter.photoBlobId);
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPhotoUrl(url);
          }
        } catch (error) {
          console.error('Failed to load photo:', error);
        }
      }
    };

    loadPhoto();

    // Cleanup URL when component unmounts
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [encounter.photoBlobId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const getCatColorBadge = (color: string) => {
    const colorMap: Record<string, string> = {
      'black': 'bg-gray-900 text-white',
      'white': 'bg-gray-100 text-gray-900 border',
      'gray': 'bg-gray-500 text-white',
      'orange': 'bg-orange-500 text-white',
      'brown': 'bg-amber-700 text-white',
      'calico': 'bg-gradient-to-r from-orange-400 to-amber-600 text-white',
      'tabby': 'bg-amber-600 text-white',
      'siamese': 'bg-blue-100 text-blue-900 border',
      'tuxedo': 'bg-gradient-to-r from-gray-900 to-white text-gray-900',
      'tortoiseshell': 'bg-gradient-to-r from-amber-700 to-gray-800 text-white',
      'other': 'bg-purple-500 text-white'
    };

    return colorMap[color] || 'bg-gray-500 text-white';
  };

  return (
    <Card className={cn("w-full max-w-sm overflow-hidden", className)}>
      {/* Photo Section */}
      {photoUrl && (
        <div className={cn("relative", compact ? "h-32" : "h-48")}>
          <img
            src={photoUrl}
            alt={`Cat encounter - ${encounter.catType}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            {onEdit && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur"
                onClick={() => onEdit(encounter)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur text-destructive hover:text-destructive"
                onClick={() => onDelete(encounter)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      <CardHeader className={cn("pb-3", photoUrl ? "pt-3" : "")}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={cn("flex items-center gap-2", compact ? "text-base" : "text-lg")}>
              <Cat className="h-4 w-4 text-primary" />
              <span className="capitalize">{encounter.catType}</span>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {formatDate(encounter.dateTime)}
            </CardDescription>
          </div>
          {!photoUrl && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(encounter)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(encounter)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-3", compact ? "space-y-2" : "")}>
        {/* Cat Details */}
        <div className={cn("space-y-2", compact ? "space-y-1" : "")}>
          <div className="flex items-center gap-2">
            <Palette className="h-3 w-3 text-muted-foreground" />
            <span
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                getCatColorBadge(encounter.catColor)
              )}
            >
              {encounter.catColor}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Scissors className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm capitalize">{encounter.coatLength} coat</span>
          </div>

          <div className="flex items-center gap-2">
            <Cat className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm capitalize">{encounter.behavior}</span>
          </div>
        </div>

        {/* Location */}
        {!compact && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{formatCoordinates(encounter.lat, encounter.lng)}</span>
          </div>
        )}

        {/* Comment */}
        {encounter.comment && !compact && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
            </div>
            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
              {encounter.comment}
            </p>
          </div>
        )}

        {/* Photo indicator for cards without photos */}
        {!photoUrl && encounter.photoBlobId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Camera className="h-3 w-3" />
            <span>Photo loading...</span>
          </div>
        )}

        {/* No photo indicator */}
        {!photoUrl && !encounter.photoBlobId && compact && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Camera className="h-3 w-3" />
            <span>No photo</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}