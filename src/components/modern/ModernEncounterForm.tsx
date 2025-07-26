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
import { storageService } from '@/services/StorageService';
import { CAT_COLORS, COAT_LENGTHS, CAT_TYPES, BEHAVIOR_PRESETS } from '@/models/CatEncounter';
import { ModernPhotoInput } from './ModernPhotoInput';

interface ModernEncounterFormProps {
  isOpen: boolean;
  initialData?: Partial<CatEncounter>;
  location?: { lat: number; lng: number };
  onSave: (encounter: CatEncounter) => void;
  onCancel: () => void;
}

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

  const [customFields, setCustomFields] = useState({
    catColor: '',
    coatLength: '',
    catType: '',
    behavior: ''
  });

  const [showCustom, setShowCustom] = useState({
    catColor: false,
    coatLength: false,
    catType: false,
    behavior: false
  });

  const [customOptions, setCustomOptions] = useState({
    catColor: [] as string[],
    coatLength: [] as string[],
    catType: [] as string[],
    behavior: [] as string[]
  });

  useEffect(() => {
    const fetchCustomOptions = async () => {
      const colorOptions = await storageService.getCustomOptions('catColor');
      const coatLengthOptions = await storageService.getCustomOptions('coatLength');
      const catTypeOptions = await storageService.getCustomOptions('catType');
      const behaviorOptions = await storageService.getCustomOptions('behavior');
      setCustomOptions({
        catColor: colorOptions,
        coatLength: coatLengthOptions,
        catType: catTypeOptions,
        behavior: behaviorOptions
      });
    };
    fetchCustomOptions();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is valid
  const checkFieldValidity = (field: keyof typeof showCustom) => {
    if (showCustom[field]) {
      return customFields[field].trim() !== '';
    }
    return !!formData[field as keyof typeof formData];
  };

  const isValid =
    checkFieldValidity('catColor') &&
    checkFieldValidity('coatLength') &&
    checkFieldValidity('catType') &&
    checkFieldValidity('behavior');

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
  }, [initialData, isOpen]);

  const handlePhotoChange = (photo: File | null) => {
    setFormData(prev => ({ ...prev, photo }));
  };

  const handleSelectChange = (field: 'catColor' | 'coatLength' | 'catType' | 'behavior', value: string) => {
    if (value === 'Custom...') {
      setShowCustom(prev => ({ ...prev, [field]: true }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      setShowCustom(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalData = { ...formData };
    const fields: ('catColor' | 'coatLength' | 'catType' | 'behavior')[] = ['catColor', 'coatLength', 'catType', 'behavior'];

    for (const field of fields) {
      if (showCustom[field]) {
        const customValue = customFields[field].trim();
        if (customValue) {
          finalData[field] = customValue;
          await storageService.addCustomOption(field, customValue);
        }
      }
    }

    if (!finalData.catColor || !finalData.coatLength || !finalData.catType || !finalData.behavior) {
      return;
    }

    // For new encounters, require either a location or default to a placeholder
    if (!location && !initialData?.lat) {
      // Could show an error message or use default coordinates
      console.warn('No location provided for new encounter');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      
      let photoBlobId = initialData?.photoBlobId;

      if (formData.photo) {
        // If there's an old photo, delete it
        if (photoBlobId) {
          await storageService.deletePhoto(photoBlobId);
        }
        // Save the new photo
        photoBlobId = await storageService.savePhoto(formData.photo);
      }

      const encounter: CatEncounter = {
        id: initialData?.id || uuidv4(),
        lat: location?.lat ?? initialData?.lat ?? 0, // Default to 0,0 if no location
        lng: location?.lng ?? initialData?.lng ?? 0,
        dateTime: initialData?.dateTime || now,
        catColor: finalData.catColor,
        coatLength: finalData.coatLength,
        catType: finalData.catType,
        behavior: finalData.behavior,
        comment: formData.comment || undefined,
        photoBlobId,
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

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90dvh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Photo Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ModernPhotoInput
                  value={formData.photo}
                  onChange={handlePhotoChange}
                  disabled={isSubmitting}
                />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="catColor">Color *</Label>
                    <Select value={formData.catColor} onValueChange={(value) => handleSelectChange('catColor', value)}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select cat color" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {customOptions.catColor.map(color => (
                          <SelectItem key={color} value={color} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{color}</span>
                          </SelectItem>
                        ))}
                        {CAT_COLORS.map(color => (
                          <SelectItem key={color} value={color} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{color}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showCustom.catColor && (
                      <Input
                        placeholder="Enter custom color"
                        value={customFields.catColor}
                        onChange={(e) => setCustomFields(prev => ({ ...prev, catColor: e.target.value }))}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coatLength">Coat Length *</Label>
                    <Select value={formData.coatLength} onValueChange={(value) => handleSelectChange('coatLength', value)}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select coat length" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {customOptions.coatLength.map(length => (
                          <SelectItem key={length} value={length} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{length}</span>
                          </SelectItem>
                        ))}
                        {COAT_LENGTHS.map(length => (
                          <SelectItem key={length} value={length} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{length}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showCustom.coatLength && (
                      <Input
                        placeholder="Enter custom coat length"
                        value={customFields.coatLength}
                        onChange={(e) => setCustomFields(prev => ({ ...prev, coatLength: e.target.value }))}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="catType">Type *</Label>
                    <Select value={formData.catType} onValueChange={(value) => handleSelectChange('catType', value)}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select cat type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {customOptions.catType.map(type => (
                          <SelectItem key={type} value={type} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{type}</span>
                          </SelectItem>
                        ))}
                        {CAT_TYPES.map(type => (
                          <SelectItem key={type} value={type} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{type}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showCustom.catType && (
                      <Input
                        placeholder="Enter custom type"
                        value={customFields.catType}
                        onChange={(e) => setCustomFields(prev => ({ ...prev, catType: e.target.value }))}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="behavior">Behavior *</Label>
                    <Select value={formData.behavior} onValueChange={(value) => handleSelectChange('behavior', value)}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select behavior" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {customOptions.behavior.map(behavior => (
                          <SelectItem key={behavior} value={behavior} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{behavior}</span>
                          </SelectItem>
                        ))}
                        {BEHAVIOR_PRESETS.map(behavior => (
                          <SelectItem key={behavior} value={behavior} className="bg-background hover:bg-accent focus:bg-accent">
                            <span className="capitalize">{behavior}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showCustom.behavior && (
                      <Input
                        placeholder="Enter custom behavior"
                        value={customFields.behavior}
                        onChange={(e) => setCustomFields(prev => ({ ...prev, behavior: e.target.value }))}
                        className="mt-2"
                      />
                    )}
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
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 p-6 pt-4 bg-background border-t sticky bottom-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Encounter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}