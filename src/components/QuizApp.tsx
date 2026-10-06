import { useState, useEffect } from 'react';
import { QuizCard } from './QuizCard';
import { GameSetupSlide } from './GameSetupSlide';
import { InfoModal } from './InfoModal';
import pageBg from '@/assets/page-bg-hand.jpg';

interface Question {
  question: string;
  category: string;
  depth: 'light' | 'deep';
  type?: string; // "Frage" or "Aktion"
}

interface SlideItem {
  type: 'setup' | 'question';
  question?: Question;
}

// Smart shuffle algorithm to distribute categories more evenly
const smartShuffle = (questions: Question[]): Question[] => {
  // Group questions by category
  const categorizedQuestions: { [category: string]: Question[] } = {};
  questions.forEach(q => {
    if (!categorizedQuestions[q.category]) {
      categorizedQuestions[q.category] = [];
    }
    categorizedQuestions[q.category].push(q);
  });

  // Shuffle questions within each category
  Object.keys(categorizedQuestions).forEach(category => {
    categorizedQuestions[category] = categorizedQuestions[category].sort(() => Math.random() - 0.5);
  });

  const categories = Object.keys(categorizedQuestions);
  const result: Question[] = [];
  const categoryCounters: { [category: string]: number } = {};
  
  // Initialize counters
  categories.forEach(cat => categoryCounters[cat] = 0);

  // Distribute questions more evenly
  while (result.length < questions.length) {
    // Shuffle categories for each round
    const shuffledCategories = [...categories].sort(() => Math.random() - 0.5);
    
    for (const category of shuffledCategories) {
      const categoryQuestions = categorizedQuestions[category];
      const counter = categoryCounters[category];
      
      if (counter < categoryQuestions.length) {
        result.push(categoryQuestions[counter]);
        categoryCounters[category]++;
        
        // Break if we've added all questions
        if (result.length >= questions.length) break;
      }
    }
  }

  return result;
};

export function QuizApp() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [introSlide, setIntroSlide] = useState<Question | null>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isMixedMode, setIsMixedMode] = useState(true);
  const [hasToggleBeenChanged, setHasToggleBeenChanged] = useState(false);
  const [categoryColorMap, setCategoryColorMap] = useState<{ [category: string]: number }>({});

  useEffect(() => {
    fetchQuestions();
  }, []);


  const fetchQuestions = async () => {
    try {
      let csvText = '';
      
      try {
        // Use the new Google Sheets URL with cache busting
        const spreadsheetId = '1ocX6XRk_Y_HcUCg7hcjb1nHuoKqyBUc2KmWX9JNTXrU';
        const timestamp = new Date().getTime();
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0&cachebust=${timestamp}`;
        
        const response = await fetch(csvUrl, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch spreadsheet data');
        }
        
        csvText = await response.text();
      } catch (sheetsError) {
        console.log('Google Sheets failed, trying local CSV file:', sheetsError);
        // Fallback to local CSV file
        const localResponse = await fetch('/quiz_questions.csv');
        if (!localResponse.ok) {
          throw new Error('Failed to fetch local CSV data');
        }
        csvText = await localResponse.text();
      }
      
      // Parse CSV data - handle multi-line quoted fields
      const questions: Question[] = [];
      let introContent: Question | null = null;
      
      // Parse CSV properly to handle multi-line quoted fields
      const parseCSV = (csvText: string): string[][] => {
        const result: string[][] = [];
        let current = '';
        let inQuotes = false;
        let row: string[] = [];
        
        for (let i = 0; i < csvText.length; i++) {
          const char = csvText[i];
          
          if (char === '"') {
            if (inQuotes && csvText[i + 1] === '"') {
              // Escaped quote
              current += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator outside quotes
            row.push(current.trim());
            current = '';
          } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // Row separator outside quotes
            if (current.trim() || row.length > 0) {
              row.push(current.trim());
              if (row.some(field => field.length > 0)) {
                result.push(row);
              }
              row = [];
              current = '';
            }
          } else {
            // Regular character or line break inside quotes
            current += char;
          }
        }
        
        // Add the last field and row
        if (current.trim() || row.length > 0) {
          row.push(current.trim());
          if (row.some(field => field.length > 0)) {
            result.push(row);
          }
        }
        
        return result;
      };
      
      const rows = parseCSV(csvText);
      
      for (let i = 0; i < rows.length; i++) {
        const values = rows[i];
        
        // Skip header row
        if (i === 0 && (values[0]?.toLowerCase().includes('categor') || values[1]?.toLowerCase().includes('question'))) {
          continue;
        }
        
        if (values.length >= 2 && values[0] && values[1]) {
          const question: Question = {
            category: values[0],
            question: values[1],
            depth: values[0].toLowerCase() === 'aktion' ? 'deep' : 'light',
            type: values[2] || 'Frage' // Default to "Frage" if third column is empty
          };
          
          // Handle intro content
          if (question.category.toLowerCase() === 'intro') {
            introContent = question;
          } else {
            questions.push(question);
          }
        }
      }
      
      if (questions.length > 0) {
        // Better shuffling algorithm to distribute categories evenly
        const shuffledQuestions = smartShuffle(questions);
        
        setAllQuestions(shuffledQuestions);
        setIntroSlide(introContent);
        
        // Extract unique categories (exclude 'Intro') and assign specific colors
        const categories = Array.from(new Set(questions.map(q => q.category)))
          .filter(cat => cat.toLowerCase() !== 'intro');
        
        // Specific color mapping for each category
        const colorMap: { [category: string]: number } = {};
        categories.forEach((category) => {
          switch(category) {
            case 'Körperliche Intimität':
              colorMap[category] = 0; // Now cyan (category1)
              break;
            case 'Emotionale Intimität':
              colorMap[category] = 1; // Red (category2)
              break;
            case 'Geistige Intimität':
              colorMap[category] = 2; // Now blue (category3)
              break;
            case 'Kreative Intimität':
              colorMap[category] = 3; // Pink (category4)
              break;
            case 'Spielerische Intimität':
              colorMap[category] = 4; // Yellow (category5)
              break;
            case 'Spirituelle Intimität':
              colorMap[category] = 5; // Mint green (category6)
              break;
            case 'Alltagsintimität':
              colorMap[category] = 5; // Mint green (category6)
              break;
            case 'Gemeinsame Abenteuer':
              colorMap[category] = 6; // Orange (category7)
              break;
            default:
              colorMap[category] = categories.indexOf(category) % 7;
          }
        });
        setCategoryColorMap(colorMap);
        setAvailableCategories(categories);
        setSelectedCategories(categories); // Start with all categories selected
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Multi-slide system state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);

  // Real-time dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);

  const nextQuestion = () => {
    if (currentIndex < slides.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTransitionDirection('left');
      
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 300);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTransitionDirection('right');
      
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 300);
    }
  };

  // Real-time drag handlers
  const handleDragStart = (clientX: number) => {
    if (isTransitioning) return;
    setIsDragging(true);
    setDragStartX(clientX);
    setDragOffset(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const offset = clientX - dragStartX;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    const threshold = 50;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && currentIndex > 0) {
        prevQuestion();
      } else if (dragOffset < 0 && currentIndex < slides.length - 1) {
        nextQuestion();
      }
      // Reset drag state AFTER transition starts to prevent race condition
      setIsDragging(false);
      setDragOffset(0);
    } else {
      // No transition triggered, safe to reset immediately
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevQuestion();
    } else if (e.key === 'ArrowRight') {
      nextQuestion();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);


  // Filter and order slides based on categories and mode
  useEffect(() => {
    // If no categories are selected, show no slides (except maybe intro if that's the intent)
    if (selectedCategories.length === 0) {
      setSlides([]);
      setQuestions([]);
      return;
    }
    
    // Filter by categories - strict filtering to only show selected categories
    let filteredQuestions = allQuestions.filter(q => 
      selectedCategories.includes(q.category)
    );
    
    // Filter by type based on toggle - when toggle is off (isMixedMode=false), show only "Frage" content
    if (!isMixedMode) {
      filteredQuestions = filteredQuestions.filter(q => q.type === 'Frage');
    }
    
    setQuestions(filteredQuestions);
    
    const slides: SlideItem[] = [];
    
    // Check if all categories are selected (no filter applied)
    const allCategoriesSelected = availableCategories.length > 0 && 
                                   selectedCategories.length === availableCategories.length;
    
    // Show the setup directly when all categories are selected (no filter)
    if (allCategoriesSelected) {
      slides.push({ type: 'setup' });
    }
    
    // Question slides are intentionally removed — only title + setup slides remain
    setSlides(slides);
    setCurrentIndex(0); // Reset to first slide when filtering/mode changes
  }, [selectedCategories, allQuestions, availableCategories.length, isMixedMode, hasToggleBeenChanged]);

  // Clamp current index whenever slides length changes to prevent out-of-bounds access
  useEffect(() => {
    setCurrentIndex((i) => (slides.length ? Math.min(i, slides.length - 1) : 0));
  }, [slides.length]);

  const handleCategoriesChange = (categories: string[]) => {
    setSelectedCategories(categories);
  };

  const hasSlides = slides.length > 0;
  const safeIndex = hasSlides ? Math.min(currentIndex, slides.length - 1) : 0;
  const safeSlide = hasSlides ? slides[safeIndex] : undefined;

  // Helper to get colors for any slide index
  const getColorsForSlide = (index: number) => {
    if (!hasSlides || index < 0 || index >= slides.length) {
      return { cardColor: '#ffffff', pageBg: '#000000' };
    }
    
    const slide = slides[index];
    if (!slide || !slide.question) {
      return { cardColor: '#ffffff', pageBg: '#000000' };
    }

    const question = slide.question;
    let colorIndex;
    
    switch(question.category) {
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
        colorIndex = (categoryColorMap[question.category] || 0) % 11 + 1;
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

  // Interpolate between two colors using CSS color-mix
  const interpolateColors = (color1: string, color2: string, factor: number) => {
    // Apply ease-out cubic easing for smoother transitions
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedFactor = easeOutCubic(factor);
    
    // Convert factor to percentage (0-100)
    const percentage = easedFactor * 100;
    
    // Use CSS color-mix in srgb color space for smooth transitions
    return `color-mix(in srgb, ${color2} ${percentage}%, ${color1})`;
  };

  // Get current slide's colors for page background and header
  const getCurrentColors = () => {
    return getColorsForSlide(safeIndex);
  };

  // Calculate interpolated background color based on drag
  const getInterpolatedBgColor = () => {
    if (!isDragging) {
      const colors = getCurrentColors();
      return safeSlide?.question?.category.toLowerCase() !== 'intro' ? colors.pageBg : '#000000';
    }

    // During transition, show target color immediately
    if (isTransitioning && !isDragging) {
      const targetIndex = transitionDirection === 'left' ? currentIndex + 1 : currentIndex - 1;
      const targetColors = getColorsForSlide(targetIndex);
      return targetColors.pageBg;
    }

    // During dragging, interpolate based on progress
    if (!hasSlides) {
      const colors = getCurrentColors();
      return safeSlide?.question?.category.toLowerCase() !== 'intro' ? colors.pageBg : '#000000';
    }

    // Match card animation progress - finishes at 300px drag
    const dragProgress = Math.min(Math.abs(dragOffset) / 300, 1);

    const currentColors = getColorsForSlide(currentIndex);
    let targetColors;
    
    if (dragOffset < 0 && currentIndex < slides.length - 1) {
      // Swiping left (next slide)
      targetColors = getColorsForSlide(currentIndex + 1);
    } else if (dragOffset > 0 && currentIndex > 0) {
      // Swiping right (prev slide)
      targetColors = getColorsForSlide(currentIndex - 1);
    } else {
      // No valid target, stay at current
      return safeSlide?.question?.category.toLowerCase() !== 'intro' ? currentColors.pageBg : '#000000';
    }

    const currentBg = safeSlide?.question?.category.toLowerCase() !== 'intro' ? currentColors.pageBg : '#000000';
    const targetBg = targetColors.pageBg;

    return interpolateColors(currentBg, targetBg, dragProgress);
  };

  // Update theme-color meta tag for iOS Safari status bar
  useEffect(() => {
    const colors = getCurrentColors();
    const bgColor = slides[currentIndex]?.question?.category.toLowerCase() !== 'intro' ? colors.pageBg : '#000000';
    
    // Update theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', bgColor);
    }
    // Also update document background to color the areas behind Safari's UI with smooth transition
    document.body.style.transition = 'background-color 0.3s ease-out';
    document.documentElement.style.transition = 'background-color 0.3s ease-out';
    document.body.style.backgroundColor = bgColor;
    document.documentElement.style.backgroundColor = bgColor;
  }, [currentIndex, slides]);

  // Update theme-color during drag and transition for smooth status bar color changes
  useEffect(() => {
    const updateThemeColor = () => {
      const bgColor = getInterpolatedBgColor();
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor && bgColor) {
        metaThemeColor.setAttribute('content', bgColor);
      }
      // Keep body and html backgrounds in sync while dragging
      if (bgColor) {
        document.body.style.transition = 'none';
        document.documentElement.style.transition = 'none';
        document.body.style.backgroundColor = bgColor;
        document.documentElement.style.backgroundColor = bgColor;
      }
    };

    if (isDragging || isTransitioning) {
      updateThemeColor();
      const interval = setInterval(updateThemeColor, 16); // 60fps updates
      return () => clearInterval(interval);
    }
  }, [isDragging, isTransitioning, dragOffset, transitionDirection]);

  return (
    <div 
      className="min-h-[100svh] h-[100svh] overflow-hidden flex flex-col relative" 
      style={{ 
        height: '100svh',
        overflowY: 'hidden',
        position: 'fixed',
        width: '100%',
        top: 0,
        left: 0
      }}
    >
      {/* Blurred, desaturated photo backdrop over the near-black base, with fine film grain. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'var(--quiz-page-background)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${pageBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(14px) saturate(0.9) brightness(0.88)',
          transform: 'scale(1.12)',
        }}
      />
      {/* Dark purple colour field behind the third slider zone (bottom of viewport). */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 45% at 50% 100%, hsl(270 36% 14% / 0.75), transparent 72%), linear-gradient(180deg, transparent 52%, hsl(268 30% 10% / 0.55) 100%)',
        }}
      />
      {/* Darker scrim over the photo so the page reads deep. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'hsl(0 0% 0% / 0.22)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'var(--quiz-page-grain)',
          backgroundSize: '150px 150px',
          mixBlendMode: 'soft-light',
          opacity: 0.65,
        }}
      />
      {/* Main Quiz Container with multi-slide carousel */}
      <div className="flex-1 flex flex-col px-2 py-2 gap-3" style={{ minHeight: 0, overflow: 'visible' }}>
        <div className="flex-1 flex items-stretch justify-center min-h-0 relative" style={{ overflow: 'visible' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
            </div>
          ) : hasSlides ? (
            <div className="relative w-full h-full flex items-center justify-center" style={{ overflow: 'visible' }}>
              {/* Render current slide and adjacent slides for transitions */}
              {slides.map((slide, index) => {
                const isActive = index === safeIndex;
                const isPrev = index === safeIndex - 1;
                const isNext = index === safeIndex + 1;
                const isPrev2 = index === safeIndex - 2;
                const isNext2 = index === safeIndex + 2;
                
                if (!isActive && !isPrev && !isNext && !isPrev2 && !isNext2) return null;
                
                let transform = '';
                let zIndex = 1;
                
                if (isActive) {
                  // Current slide positioning
                  if (isDragging) {
                    // Calculate drag progress for scaling and rotation
                    const dragProgress = Math.abs(dragOffset) / 300; // Normalize to 0-1
                    const scale = Math.max(0.8, 1 - dragProgress * 0.2); // Scale from 1 to 0.8
                    const rotation = dragOffset > 0 ? dragProgress * 5 : -dragProgress * 5; // Rotate up to 5 degrees
                    transform = `translateX(${dragOffset}px) scale(${scale}) rotate(${rotation}deg)`;
                  } else if (isTransitioning && transitionDirection === 'left') {
                    transform = 'translateX(-100%) scale(0.8) rotate(-5deg)';
                  } else if (isTransitioning && transitionDirection === 'right') {
                    transform = 'translateX(100%) scale(0.8) rotate(5deg)';
                  } else {
                    transform = 'translateX(0) scale(1) rotate(0deg)';
                  }
                  zIndex = 2;
                } else if (isPrev) {
                  // Previous slide positioning
                  if (isDragging) {
                    // Calculate scale for incoming slide based on drag progress
                    const dragProgress = Math.abs(dragOffset) / 300;
                    const scale = Math.min(1, 0.8 + dragProgress * 0.2); // Scale from 0.8 to 1
                    transform = `translateX(calc(-100% + ${dragOffset}px)) scale(${scale}) rotate(0deg)`;
                  } else if (isTransitioning && transitionDirection === 'right') {
                    transform = 'translateX(0) scale(1) rotate(0deg)';
                  } else {
                    transform = 'translateX(-100%) scale(0.8) rotate(0deg)';
                  }
                } else if (isNext) {
                  // Next slide positioning
                  if (isDragging) {
                    // Calculate scale for incoming slide based on drag progress
                    const dragProgress = Math.abs(dragOffset) / 300;
                    const scale = Math.min(1, 0.8 + dragProgress * 0.2); // Scale from 0.8 to 1
                    transform = `translateX(calc(100% + ${dragOffset}px)) scale(${scale}) rotate(0deg)`;
                  } else if (isTransitioning && transitionDirection === 'left') {
                    transform = 'translateX(0) scale(1) rotate(0deg)';
                  } else {
                    transform = 'translateX(100%) scale(0.8) rotate(0deg)';
                  }
                } else if (isPrev2) {
                  // Two slides back positioning - always far off-screen, no transition
                  transform = 'translateX(-200%) scale(0.8) rotate(0deg)';
                } else if (isNext2) {
                  // Two slides forward positioning - always far off-screen, no transition
                  transform = 'translateX(200%) scale(0.8) rotate(0deg)';
                }
                
                return (
                  <div
                    key={`slide-${index}`}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      transform,
                      zIndex,
                      transition: isDragging 
                        ? 'none'
                        : (isPrev2 || isNext2)
                        ? 'none' // No transition for far slides
                        : (isTransitioning && !isActive && !((isPrev && transitionDirection === 'right') || (isNext && transitionDirection === 'left')))
                        ? 'none' // No transition for non-participating slides during transition
                        : 'transform 0.3s ease-out'
                    }}
                  >
                    {slide.type === 'setup' ? (
                      <GameSetupSlide
                        onSwipeLeft={nextQuestion}
                        onSwipeRight={prevQuestion}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        isDragging={isDragging}
                        onOpenInfo={() => setInfoModalOpen(true)}
                      />
                    ) : slide.question ? (
                      <QuizCard
                        question={slide.question}
                        onSwipeLeft={nextQuestion}
                        onSwipeRight={prevQuestion}
                        categoryIndex={categoryColorMap[slide.question.category] || 0}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        dragOffset={isDragging ? dragOffset : 0}
                        isDragging={isDragging}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white" style={{ fontSize: '14px' }}>Keine Fragen verfügbar</div>
          )}
        </div>
      </div>
      {/* Grain over everything so cards and text share one film texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-50"
        style={{
          backgroundImage: 'var(--quiz-page-grain)',
          backgroundSize: '150px 150px',
          mixBlendMode: 'soft-light',
          opacity: 0.55,
        }}
      />

      
      <InfoModal open={infoModalOpen} onOpenChange={setInfoModalOpen} />
    </div>
  );
}