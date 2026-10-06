import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import closeIcon from '@/assets/close-icon.png';
import checkIcon from '@/assets/check-icon.png';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategorySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  backgroundColor?: string;
}

export function CategorySelector({ 
  open, 
  onOpenChange, 
  categories, 
  selectedCategories, 
  onCategoriesChange,
  backgroundColor 
}: CategorySelectorProps) {
  const [tempSelection, setTempSelection] = useState<string[]>(selectedCategories);
  const [justToggled, setJustToggled] = useState<Set<string>>(new Set());

  // Update temp selection when selectedCategories prop changes
  useEffect(() => {
    setTempSelection(selectedCategories);
  }, [selectedCategories]);

  // Handle modal open - no animation state needed
  useEffect(() => {
    if (open) {
      setJustToggled(new Set());
    }
  }, [open]);
  const getCategoryColors = (category: string, index: number) => {
    // Use specific color mapping for each category
    let colorIndex;
    switch(category) {
      case 'Körperliche Intimität':
        colorIndex = 1;
        break;
      case 'Emotionale Intimität':
        colorIndex = 2;
        break;
      case 'Geistige Intimität':
        colorIndex = 4;
        break;
      case 'Kreative Intimität':
        colorIndex = 3;
        break;
      case 'Spielerische Intimität':
        colorIndex = 6;
        break;
      case 'Spirituelle Intimität':
        colorIndex = 7;
        break;
      case 'Alltagsintimität':
        colorIndex = 5;
        break;
      case 'Gemeinsame Abenteuer':
        colorIndex = 8;
        break;
      default:
        colorIndex = (index % 11) + 1;
    }
    
    const colorMap = {
      1: { cardColor: 'hsl(15, 100%, 50%)', pageBg: 'hsl(0, 0%, 0%)' },
      2: { cardColor: 'hsl(248, 100%, 82%)', pageBg: 'hsl(0, 0%, 0%)' },
      3: { cardColor: 'hsl(60, 100%, 50%)', pageBg: 'hsl(0, 0%, 0%)' },
      4: { cardColor: 'hsl(292, 100%, 78%)', pageBg: 'hsl(0, 0%, 0%)' },
      5: { cardColor: 'hsl(0, 100%, 58%)', pageBg: 'hsl(0, 0%, 0%)' },
      6: { cardColor: 'hsl(304, 100%, 60%)', pageBg: 'hsl(0, 0%, 0%)' },
      7: { cardColor: 'hsl(184, 86%, 64%)', pageBg: 'hsl(0, 0%, 0%)' },
      8: { cardColor: 'hsl(163, 100%, 55%)', pageBg: 'hsl(0, 0%, 0%)' },
      9: { cardColor: 'hsl(120, 100%, 50%)', pageBg: 'hsl(0, 0%, 0%)' },
      10: { cardColor: 'hsl(200, 100%, 77%)', pageBg: 'hsl(0, 0%, 0%)' },
      11: { cardColor: 'hsl(70, 100%, 49%)', pageBg: 'hsl(0, 0%, 0%)' },
    };
    
    return colorMap[colorIndex as keyof typeof colorMap] || colorMap[1];
  };

  const darkenColor = (hslColor: string, factor: number = 0.8) => {
    // Parse HSL color and reduce lightness by the given factor
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = match[1];
      const s = match[2];
      const l = Math.max(0, parseInt(match[3]) * factor);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return hslColor;
  };

  const lightenColor = (hslColor: string, factor: number = 1.1) => {
    // Parse HSL color and increase lightness by the given factor
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = match[1];
      const s = match[2];
      const l = Math.min(100, parseInt(match[3]) * factor);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return hslColor;
  };

  const handleCategoryToggle = (category: string) => {
    const newSelection = tempSelection.includes(category) 
      ? tempSelection.filter(c => c !== category)
      : [...tempSelection, category];
    
    setTempSelection(newSelection);
    setJustToggled(prev => new Set(prev).add(category));
  };

  const handleApply = () => {
    onCategoriesChange(tempSelection);
    onOpenChange(false);
  };

  const handleClose = () => {
    // Apply the filter when closing the modal
    onCategoriesChange(tempSelection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <style>
        {`
          @keyframes widthBounceRight {
            0% {
              width: calc(100% - 8px);
            }
            50% {
              width: calc(100% + 8px);
            }
            100% {
              width: 100%;
            }
          }
          @keyframes checkmarkAppear {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
      <DialogPortal>
        {/* Fully opaque overlay - no animations */}
        <DialogOverlay className="bg-black pointer-events-none" />
        <DialogContent className="mx-auto border-0 p-0 overflow-hidden [&>button]:hidden flex flex-col data-[state=open]:animate-none data-[state=closed]:animate-none bg-transparent sm:max-w-full" style={{ height: '100svh', width: '100vw' }}>
        <DialogDescription className="sr-only">
          Wählen Sie die Kategorien aus, die Sie sehen möchten
        </DialogDescription>
        
        <div className="flex flex-col w-full h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-0 shrink-0">
            <DialogHeader className="p-0 flex items-center">
               <DialogTitle className="text-white font-rauschen uppercase m-0" style={{ fontSize: '16px', fontWeight: 600, lineHeight: '35px' }}>
                 Kategorien wählen
               </DialogTitle>
            </DialogHeader>
            
            <button
              onClick={handleClose}
              className="transition-opacity hover:opacity-80 flex items-center justify-center flex-shrink-0"
              style={{
                width: '35px',
                height: '35px',
                backgroundColor: 'black',
                borderRadius: '50%',
                padding: '2px',
                outline: 'none'
              }}
            >
              <img src={closeIcon} alt="Close" style={{ width: '24px', height: '24px', filter: 'invert(1)' }} />
            </button>
          </div>

          {/* Categories List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="pt-2 pb-4 px-4 space-y-2 flex flex-col items-center" style={{ marginTop: '8px' }}>
              {categories.map((category, index) => {
              const isSelected = tempSelection.includes(category);
              const colors = getCategoryColors(category, index);
              
              return (
                <div 
                  key={category}
                  className="flex items-center justify-between cursor-pointer relative w-full max-w-md"
                  style={{ 
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '4px 4px 4px 16px'
                  }}
                  onClick={() => handleCategoryToggle(category)}
                >
                  {/* Text first */}
                  <span className="font-stringer font-normal tracking-wide" style={{ 
                    color: 'black', 
                    fontSize: '16px',
                    marginRight: '8px'
                  }}>
                    {category}
                  </span>
                  
                  {/* Checkbox on the right */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <div
                      className="relative cursor-pointer flex-shrink-0"
                      onClick={() => {
                        const newCategories = isSelected 
                          ? tempSelection.filter(c => c !== category)
                          : [...tempSelection, category];
                        setTempSelection(newCategories);
                      }}
                    >
                      <div
                        className="flex items-center justify-center"
                        style={{ 
                          width: '37px', 
                          height: '37px',
                          border: isSelected ? 'none' : '2px solid #e5e5e5',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? colors.cardColor : 'transparent'
                        }}
                      >
                        {isSelected && (
                          <img 
                            src={checkIcon} 
                            alt="Check" 
                            style={{ 
                              width: '24px',
                              height: '24px',
                              mixBlendMode: 'multiply'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Delete entries button */}
          <div className="flex items-center justify-center px-4 pb-4 pt-2 shrink-0">
            <button
              onClick={() => {
                // Clear all cookies
                document.cookie.split(";").forEach((c) => {
                  document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                
                // Clear all localStorage
                localStorage.clear();
                
                // Clear all sessionStorage
                sessionStorage.clear();
                
                // Reload to reset all state (filters, text entries, show default view)
                window.location.reload();
              }}
              className="text-white font-rauschen uppercase hover:opacity-70 transition-opacity"
              style={{ fontSize: '14px', fontWeight: 600 }}
            >
              Meine Einträge löschen
            </button>
          </div>
        </div>
      </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}