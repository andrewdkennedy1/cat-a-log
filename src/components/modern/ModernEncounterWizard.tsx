import { useState, useEffect } from 'react';
import { Cat, Camera, Save, ArrowLeft, ArrowRight, X } from 'lucide-react';
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
import { ModernPhotoInput } from './ModernPhotoInput';
import { ModernSelectableList } from './ModernSelectableList';
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
  const [isEditOptionOpen, setIsEditOptionOpen] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [editingOption, setEditingOption] = useState<{ type: OptionType; value: string } | null>(null);
  const [currentOptionType, setCurrentOptionType] = useState<OptionType | null>(null);
  const [lastAddedOption, setLastAddedOption] = useState<{ type: OptionType; value: string } | null>(null);

  // Helper function to get built-in options for a type
  const getBuiltInOptionsForType = (optionType: OptionType): string[] => {
    switch (optionType) {
      case 'catColor':
        return [...CAT_COLORS];
      case 'coatLength':
        return [...COAT_LENGTHS];
      case 'catType':
        return [...CAT_TYPES];
      case 'behavior':
        return [...BEHAVIOR_PRESETS];
      default:
        return [];
    }
  };

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
  
  const openEditOptionDialog = (type: OptionType, value: string) => {
    // Prevent editing built-in options
    const builtInOptions = getBuiltInOptionsForType(type);
    if (builtInOptions.includes(value)) {
      return;
    }
    
    setEditingOption({ type, value });
    setNewOption(value);
    setIsEditOptionOpen(true);
  };

  const handleAddOption = async () => {
    if (!newOption || !currentOptionType) return;
    await storageService.addCustomOption(currentOptionType, newOption);
    await loadOptions();
    setLastAddedOption({ type: currentOptionType, value: newOption });
    setIsAddOptionOpen(false);
    setNewOption('');
  };
  
  const handleUpdateOption = async () => {
    if (!newOption || !editingOption) return;
    await storageService.updateCustomOption(editingOption.type, editingOption.value, newOption);
    await loadOptions();
    if (formData[editingOption.type] === editingOption.value) {
      setFormData(prev => ({ ...prev, [editingOption.type]: newOption }));
    }
    setIsEditOptionOpen(false);
    setNewOption('');
    setEditingOption(null);
  };
  
  const handleDeleteOption = async (type: OptionType, value: string) => {
    // Prevent deleting built-in options
    const builtInOptions = getBuiltInOptionsForType(type);
    if (builtInOptions.includes(value)) {
      return;
    }
    
    await storageService.deleteCustomOption(type, value);
    await loadOptions();
    if (formData[type] === value) {
      setFormData(prev => ({ ...prev, [type]: '' }));
    }
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
  
  const renderEditOptionDialog = () => (
    <Dialog open={isEditOptionOpen} onOpenChange={setIsEditOptionOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Option</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="edit-option-input">Edit {editingOption?.type.replace(/([A-Z])/g, ' $1')} Name</Label>
          <Input
            id="edit-option-input"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Enter new name"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsEditOptionOpen(false)}>Cancel</Button>
          <Button type="button" onClick={handleUpdateOption}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderStepContent = (type: OptionType, title: string) => {
    const optionsKey = `${type}s` as keyof typeof options;
    
    // Get built-in options for this type
    const getBuiltInOptions = (optionType: OptionType) => {
      return getBuiltInOptionsForType(optionType);
    };
    
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 flex-shrink-0">
          <Label>{title} *</Label>
           <p className="text-sm text-muted-foreground">Adding a new record will make it chooseable in the future. Built-in options cannot be edited or deleted.</p>
        </div>
        <div className="flex-1 min-h-0">
          <ModernSelectableList
            options={options[optionsKey]}
            value={formData[type]}
            onChange={(v) => setFormData(p => ({ ...p, [type]: v }))}
            onAdd={() => openAddOptionDialog(type)}
            onEdit={(v) => openEditOptionDialog(type, v)}
            onDelete={(v) => handleDeleteOption(type, v)}
            placeholder={`Search ${title.toLowerCase()}...`}
            builtInOptions={getBuiltInOptions(type)}
          />
        </div>
        <div className="p-4 flex-shrink-0 border-t bg-background flex justify-between">
          <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
          <Button type="button" onClick={next} disabled={!isValidStep()}>Next<ArrowRight className="h-4 w-4 ml-2"/></Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent 
          className="max-w-full h-full flex flex-col p-0 [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4">
            <DialogTitle className="flex items-center gap-2">
              <Cat className="h-5 w-5 text-primary" />
              {initialData ? 'Edit Cat Encounter' : 'Log Cat Encounter'}
            </DialogTitle>
            <DialogDescription>
              Follow the steps to log a new cat encounter.
            </DialogDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="relative flex-1 overflow-hidden">
            <div className="h-full">
              <div className={stepClasses(0)}>
                <div className="h-full flex flex-col">
                  <div className="p-4 flex-shrink-0">
                    <h2 className="text-lg flex items-center gap-2"><Camera className="h-5 w-5"/>Photo</h2>
                  </div>
                  <div className="flex-1 min-h-0 p-4 pt-0">
                    <ModernPhotoInput value={formData.photo} onChange={handlePhotoChange} disabled={isSubmitting} />
                  </div>
                  <div className="p-4 flex-shrink-0 border-t bg-background flex justify-between">
                    <div></div>
                    <Button type="button" onClick={next}>
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className={stepClasses(1)}>
                {renderStepContent('catColor', 'Color')}
              </div>

              <div className={stepClasses(2)}>
                {renderStepContent('coatLength', 'Coat Length')}
              </div>

              <div className={stepClasses(3)}>
                {renderStepContent('catType', 'Type')}
              </div>

              <div className={stepClasses(4)}>
                {renderStepContent('behavior', 'Behavior')}
              </div>

              <div className={stepClasses(5)}>
                <div className="h-full flex flex-col">
                  <div className="p-4 flex-shrink-0">
                    <Label htmlFor="comment">Additional Comments</Label>
                  </div>
                  <div className="flex-1 min-h-0 p-4 pt-0">
                    <textarea
                      id="comment"
                      value={formData.comment}
                      onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Any additional observations about this cat..."
                      className="flex h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div className="p-4 flex-shrink-0 border-t bg-background flex justify-between">
                    <Button type="button" variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground">
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {renderAddOptionDialog()}
      {renderEditOptionDialog()}
    </>
  );
}
