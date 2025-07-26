/**
 * Modern EncounterForm component using shadcn/ui
 */

import { useState, useEffect } from 'react';
import { Camera, MapPin, Palette, Cat, MessageSquare, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CatEncounter } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ModernEncounterFormProps {
  isOpen: boolean;
  initialData?: Partial<CatEncounter>;
  location?: { lat: number; lng: number };
  onSave: (encounter: CatEncounter) => void;
  onCancel: () => void;
}

const CAT_COLORS = [
  'black', 'white', 'gray', 'orange', 'brown', 'calico', 
  'tabby', 'siamese', 'tuxedo', 'tortoiseshell', 'other'
];

const COAT_LENGTHS = ['short', 'medium', 'long'];

const CAT_TYPES = [
  'domestic', 'feral', 'stray', 'kitten', 'senior', 'pregnant', 'other'
];

const BEHAVIORS = [
  'friendly', 'shy', 'aggressive', 'playful', 'sleeping', 
  'eating', 'hunting', 'grooming', 'hiding', 'other'
];

export function ModernEncounterForm({ 
  isOpen, 
  initialData, 
  location, 
  onSave, 
  onCancel 
}: ModernEncounterFormProps) {
  const [formData, setFormData] = useState({
    catColor: '',
    coatLength: '',
    catType: '',
    behavior: '',
    comment: '',
    photo: null as File | null
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        catColor: initialData.catColor || '',
        coatLength: initialData.coatLength || '',
        catType: initialData.catType || '',
        behavior: initialData.behavior || '',
        comment: initialData.comment || '',
        photo: null
      });
    } else {
      setFormData({
        catColor: '',
        coatLength: '',
        catType: '',
        behavior: '',
        comment: '',
        photo: null
      });
    }
    setPhotoPreview(null);
  }, [initialData, isOpen]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.catColor || !formData.coatLength || !formData.catType || !formData.behavior) {
      return;
    }

    if (!location && !initialData) {
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      
      const encounter: CatEncounter = {
        id: initialData?.id || uuidv4(),
        lat: location?.lat ?? initialData?.lat!,
        lng: location?.lng ?? initialData?.lng!,
        dateTime: initialData?.dateTime || now,
        catColor: formData.catColor,
        coatLength: formData.coatLength,
        catType: formData.catType,
        behavior: formData.behavior,
        comment: formData.comment || undefined,
        photoBlobId: initialData?.photoBlobId,
        createdAt: initialData?.createdAt || now,
        updatedAt: now
      };

      onSave(encounter);
    } catch (error) {
      console.error('Failed to save encounter:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.catColor && formData.coatLength && formData.catType && formData.behavior;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cat className="h-5 w-5 text-primary" />
            {initialData ? 'Edit Cat Encounter' : 'Log Cat Encounter'}
          </DialogTitle>
          <DialogDescription>
            {location ? (
              <span className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </span>
            ) : (
              'Update the details of this cat encounter'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {photoPreview && (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Cat preview"
                      className="w-full max-w-xs rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cat Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Cat Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="catColor">Color *</Label>
                  <Select value={formData.catColor} onValueChange={(value) => setFormData(prev => ({ ...prev, catColor: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cat color" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAT_COLORS.map(color => (
                        <SelectItem key={color} value={color}>
                          <span className="capitalize">{color}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coatLength">Coat Length *</Label>
                  <Select value={formData.coatLength} onValueChange={(value) => setFormData(prev => ({ ...prev, coatLength: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coat length" />
                    </SelectTrigger>
                    <SelectContent>
                      {COAT_LENGTHS.map(length => (
                        <SelectItem key={length} value={length}>
                          <span className="capitalize">{length}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catType">Type *</Label>
                  <Select value={formData.catType} onValueChange={(value) => setFormData(prev => ({ ...prev, catType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cat type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          <span className="capitalize">{type}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="behavior">Behavior *</Label>
                  <Select value={formData.behavior} onValueChange={(value) => setFormData(prev => ({ ...prev, behavior: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select behavior" />
                    </SelectTrigger>
                    <SelectContent>
                      {BEHAVIORS.map(behavior => (
                        <SelectItem key={behavior} value={behavior}>
                          <span className="capitalize">{behavior}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="comment">Additional Comments</Label>
                <textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Any additional observations about this cat..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Encounter'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}