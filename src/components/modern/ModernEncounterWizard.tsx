import { useState, useEffect } from 'react';
import { Cat, Camera, Save, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type OptionType = 'catColor' | 'coatLength' | 'catType' | 'behavior';

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

  const [options, setOptions] = useState<{
    catColors: string[];
    coatLengths: string[];
    catTypes: string[];
    behaviors: string[];
  }>({
    catColors: [...CAT_COLORS],
    coatLengths: [...COAT_LENGTHS],
    catTypes: [...CAT_TYPES],
    behaviors: [...BEHAVIOR_PRESETS]
  });

  const [isAddOptionOpen, setIsAddOptionOpen] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [currentOptionType, setCurrentOptionType] = useState<OptionType | null>(null);
  const [lastAddedOption, setLastAddedOption] = useState<{ type: OptionType; value: string } | null>(null);

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

  useEffect(() => {
    const loadOptions = async () => {
      const [customColors, customLengths, customTypes, customBehaviors] = await Promise.all([
        storageService.getCustomOptions('catColor'),
        storageService.getCustomOptions('coatLength'),
        storageService.getCustomOptions('catType'),
        storageService.getCustomOptions('behavior')
      ]);

      setOptions({
        catColors: [...CAT_COLORS, ...customColors],
        coatLengths: [...COAT_LENGTHS, ...customLengths],
        catTypes: [...CAT_TYPES, ...customTypes],
        behaviors: [...BEHAVIOR_PRESETS, ...customBehaviors]
      });
    };

    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (lastAddedOption) {
      setFormData(prev => ({ ...prev, [lastAddedOption.type]: lastAddedOption.value }));
      setLastAddedOption(null);
    }
  }, [lastAddedOption]);

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

  const openAddOptionDialog = (type: OptionType) => {
    setCurrentOptionType(type);
    setNewOption('');
    setIsAddOptionOpen(true);
  };

  const handleAddOption = async () => {
    if (!newOption || !currentOptionType) return;

    await storageService.addCustomOption(currentOptionType, newOption);

    setOptions(prev => {
      const key = `${currentOptionType}s` as keyof typeof options;
      const newSet = new Set([...prev[key], newOption]);
      return { ...prev, [key]: Array.from(newSet) };
    });

    setLastAddedOption({ type: currentOptionType, value: newOption });
    setIsAddOptionOpen(false);
    setNewOption('');
  };

  const renderAddOptionDialog = () => (
    <Dialog open={isAddOptionOpen} onOpenChange={setIsAddOptionOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Option</DialogTitle>
          <DialogDescription>
            Add a new custom option to this list. This will be saved for future encounters.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="new-option-input">New {currentOptionType?.replace(/([A-Z])/g, ' $1')} Name</Label>
          <Input
            id="new-option-input"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Enter new option"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsAddOptionOpen(false)}>Cancel</Button>
          <Button type="button" onClick={handleAddOption}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onCancel}>
        <DialogContent className="max-w-full h-full flex flex-col p-0">
          <DialogHeader className="p-4">
            <DialogTitle className="flex items-center gap-2">
              <Cat className="h-5 w-5 text-primary" />
              {initialData ? 'Edit Cat Encounter' : 'Log Cat Encounter'}
            </DialogTitle>
            <DialogDescription>
              Follow the steps to log a new cat encounter.
            </DialogDescription>
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
                  <div className="flex gap-2">
                    <Select value={formData.catColor} onValueChange={(v) => setFormData(p => ({ ...p, catColor: v }))}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select cat color" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {options.catColors.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => openAddOptionDialog('catColor')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-auto flex justify-between">
                    <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                    <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
                  </div>
                </div>
              </div>

              <div className={stepClasses(2)}>
                <div className="p-4 h-full flex flex-col gap-4">
                  <Label htmlFor="coatLength">Coat Length *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.coatLength} onValueChange={(v) => setFormData(p => ({ ...p, coatLength: v }))}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select coat length" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {options.coatLengths.map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => openAddOptionDialog('coatLength')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-auto flex justify-between">
                    <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                    <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
                  </div>
                </div>
              </div>

              <div className={stepClasses(3)}>
                <div className="p-4 h-full flex flex-col gap-4">
                  <Label htmlFor="catType">Type *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.catType} onValueChange={(v) => setFormData(p => ({ ...p, catType: v }))}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select cat type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {options.catTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => openAddOptionDialog('catType')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-auto flex justify-between">
                    <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                    <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
                  </div>
                </div>
              </div>

              <div className={stepClasses(4)}>
                <div className="p-4 h-full flex flex-col gap-4">
                  <Label htmlFor="behavior">Behavior *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.behavior} onValueChange={(v) => setFormData(p => ({ ...p, behavior: v }))}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select behavior" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        {options.behaviors.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => openAddOptionDialog('behavior')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
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
      {renderAddOptionDialog()}
    </>
  );
}
