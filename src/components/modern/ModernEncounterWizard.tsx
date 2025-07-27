import { useState, useEffect } from 'react';
import { Cat, Camera, Save, ArrowLeft, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModernPhotoInput } from './ModernPhotoInput';
import type { CatEncounter } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from '@/services/StorageService';
import { CAT_COLORS, COAT_LENGTHS, CAT_TYPES, BEHAVIOR_PRESETS } from '@/models/CatEncounter';

interface ModernEncounterWizardProps {
  isOpen: boolean;
  initialData?: Partial<CatEncounter>;
  location?: { lat: number; lng: number };
  onSave: (encounter: CatEncounter) => void;
  onCancel: () => void;
}

export function ModernEncounterWizard({
  isOpen,
  initialData,
  location,
  onSave,
  onCancel
}: ModernEncounterWizardProps) {
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    catColor: '',
    coatLength: '',
    catType: '',
    behavior: '',
    comment: '',
    photo: null as File | null
  });

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
    setStep(0);
  }, [initialData, isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidStep = () => {
    switch (step) {
      case 0:
        return true; // photo optional
      case 1:
        return formData.catColor !== '';
      case 2:
        return formData.coatLength !== '';
      case 3:
        return formData.catType !== '';
      case 4:
        return formData.behavior !== '';
      default:
        return true;
    }
  };

  const next = () => {
    if (isValidStep()) {
      setStep((s) => Math.min(s + 1, 5));
    }
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handlePhotoChange = (photo: File | null) => {
    setFormData(prev => ({ ...prev, photo }));
  };

  const handleSubmit = async () => {
    if (!isValidStep()) return;

    if (step < 5) {
      next();
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      let photoBlobId = initialData?.photoBlobId;
      if (formData.photo) {
        if (photoBlobId) {
          await storageService.deletePhoto(photoBlobId);
        }
        photoBlobId = await storageService.savePhoto(formData.photo);
      }

      const encounter: CatEncounter = {
        id: initialData?.id || uuidv4(),
        lat: location?.lat ?? initialData?.lat ?? 0,
        lng: location?.lng ?? initialData?.lng ?? 0,
        dateTime: initialData?.dateTime || now,
        catColor: formData.catColor,
        coatLength: formData.coatLength,
        catType: formData.catType,
        behavior: formData.behavior,
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

  const stepClasses = (n: number) =>
    `absolute inset-0 transition-transform duration-300 ${step === n ? 'translate-x-0' : step > n ? '-translate-x-full' : 'translate-x-full'}`;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-full h-full flex flex-col p-0">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-2">
            <Cat className="h-5 w-5 text-primary" />
            {initialData ? 'Edit Cat Encounter' : 'Log Cat Encounter'}
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 overflow-hidden">
          <form className="h-full">
            <div className={stepClasses(0)}>
              <div className="p-4 h-full flex flex-col gap-4">
                <h2 className="text-lg flex items-center gap-2"><Camera className="h-5 w-5"/>Photo</h2>
                <ModernPhotoInput value={formData.photo} onChange={handlePhotoChange} disabled={isSubmitting} />
                <div className="mt-auto flex justify-between">
                  <Button type="button" onClick={next} className="ml-auto">
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            <div className={stepClasses(1)}>
              <div className="p-4 h-full flex flex-col gap-4">
                <Label htmlFor="catColor">Color *</Label>
                <Select value={formData.catColor} onValueChange={(v) => setFormData(p => ({ ...p, catColor: v }))}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select cat color" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg">
                    {CAT_COLORS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-auto flex justify-between">
                  <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                  <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
                </div>
              </div>
            </div>

            <div className={stepClasses(2)}>
              <div className="p-4 h-full flex flex-col gap-4">
                <Label htmlFor="coatLength">Coat Length *</Label>
                <Select value={formData.coatLength} onValueChange={(v) => setFormData(p => ({ ...p, coatLength: v }))}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select coat length" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg">
                    {COAT_LENGTHS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-auto flex justify-between">
                  <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                  <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
                </div>
              </div>
            </div>

            <div className={stepClasses(3)}>
              <div className="p-4 h-full flex flex-col gap-4">
                <Label htmlFor="catType">Type *</Label>
                <Select value={formData.catType} onValueChange={(v) => setFormData(p => ({ ...p, catType: v }))}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select cat type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg">
                    {CAT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-auto flex justify-between">
                  <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                  <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
                </div>
              </div>
            </div>

            <div className={stepClasses(4)}>
              <div className="p-4 h-full flex flex-col gap-4">
                <Label htmlFor="behavior">Behavior *</Label>
                <Select value={formData.behavior} onValueChange={(v) => setFormData(p => ({ ...p, behavior: v }))}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select behavior" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg">
                    {BEHAVIOR_PRESETS.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-auto flex justify-between">
                  <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                  <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
                </div>
              </div>
            </div>

            <div className={stepClasses(5)}>
              <div className="p-4 h-full flex flex-col gap-4">
                <Label htmlFor="comment">Additional Comments</Label>
                <textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Any additional observations about this cat..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="mt-auto flex justify-between">
                  <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                  <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground">
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
