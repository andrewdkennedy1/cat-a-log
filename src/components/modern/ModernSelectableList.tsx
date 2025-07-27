import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit } from 'lucide-react';

interface ModernSelectableListProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (value: string) => void;
  onDelete: (value: string) => void;
  placeholder: string;
  builtInOptions?: string[]; // Options that cannot be edited/deleted
}

export function ModernSelectableList({
  options,
  value,
  onChange,
  onAdd,
  onEdit,
  onDelete,
  placeholder,
  builtInOptions = []
}: ModernSelectableListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedOption, setDraggedOption] = useState<string | null>(null);
  
  const filteredOptions = useMemo(() => {
    return options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const isBuiltIn = (option: string) => builtInOptions.includes(option);
  const isCustom = (option: string) => !isBuiltIn(option);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {filteredOptions.map(option => {
            const canEdit = isCustom(option);
            
            return (
              <motion.div
                key={option}
                className="relative overflow-hidden"
                whileTap={{ scale: 0.98 }}
              >
                {/* Desktop: Always visible action buttons for custom options */}
                {canEdit && (
                  <div className="absolute inset-y-0 right-0 z-10 hidden md:flex items-center bg-background border-l">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-full rounded-none hover:bg-accent transition-colors" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(option);
                      }}
                      title="Edit option"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-full rounded-none hover:bg-destructive hover:text-destructive-foreground transition-colors" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(option);
                      }}
                      title="Delete option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Mobile: Slide-to-reveal action buttons for custom options */}
                {canEdit && (
                  <div className="absolute inset-y-0 right-0 z-0 flex items-center md:hidden">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-full rounded-none bg-blue-500 text-white hover:bg-blue-600" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(option);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-full rounded-none hover:bg-red-600" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(option);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Main option button */}
                <motion.div
                  drag={canEdit ? "x" : false}
                  dragConstraints={{ left: canEdit ? -128 : 0, right: 0 }}
                  dragElastic={0.2}
                  dragMomentum={false}
                  onDragStart={() => canEdit && setDraggedOption(option)}
                  onDragEnd={(_, info) => {
                    setDraggedOption(null);
                    // If dragged less than 5px, treat as a click
                    if (Math.abs(info.offset.x) < 5) {
                      onChange(option);
                    }
                  }}
                  className="relative bg-background"
                  style={{
                    zIndex: draggedOption === option ? 20 : 10
                  }}
                >
                  <Button
                    variant={value === option ? 'secondary' : 'ghost'}
                    className={`w-full justify-start text-left h-auto py-3 ${
                      canEdit ? 'pr-2 md:pr-20' : '' // Always add padding for mobile slide, more on desktop for visible buttons
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(option);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {option}
                      {isBuiltIn(option) && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Built-in
                        </span>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-2 border-t">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>
    </div>
  );
}