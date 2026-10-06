import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import Hypher from 'hypher';
import german from 'hyphenation.de';
import editIcon from '@/assets/edit-icon.png';
import closeIcon from '@/assets/close-icon.png';

// Eye component with synchronized blinking and pupil movement
function Eye({ 
  categoryColors, 
  pupilOffset, 
  isBlinking,
  eyeVariation
}: { 
  categoryColors: { cardColor: string; pageBg: string }, 
  pupilOffset: { x: number, y: number },
  isBlinking: boolean,
  eyeVariation: { width: string; height: string; pupilSize: string }
}) {

  return (
    <div
      style={{
        position: 'relative',
        width: eyeVariation.width,
        height: eyeVariation.height,
        backgroundColor: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
        transition: 'transform 0.15s ease-out'
      }}
    >
      {/* Pupil */}
      <div
        style={{
          width: eyeVariation.pupilSize,
          height: eyeVariation.pupilSize,
          backgroundColor: 'black',
          borderRadius: '50%',
          transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      />
    </div>
  );
}

interface Question {
  question: string;
  category: string;
  depth?: 'light' | 'deep';
}

interface QuizCardProps {
  question: Question;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  animationClass?: string;
  categoryIndex?: number;
  onDragStart?: (clientX: number) => void;
  onDragMove?: (clientX: number) => void;
  onDragEnd?: () => void;
  dragOffset?: number;
  isDragging?: boolean;
}

export function QuizCard({ 
  question, 
  onSwipeLeft, 
  onSwipeRight, 
  animationClass = '', 
  categoryIndex = 0,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragOffset = 0,
  isDragging = false
}: QuizCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [mouseStart, setMouseStart] = useState<number | null>(null);
  const [mouseEnd, setMouseEnd] = useState<number | null>(null);
  const [isLocalDragging, setIsLocalDragging] = useState(false);
  const [processedText, setProcessedText] = useState<JSX.Element[]>([]);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [monsterVariation, setMonsterVariation] = useState({
    circleSize: 120,
    circleWidth: 120,
    circleHeight: 120,
    circleOffsetX: 0,
    eyeShift: { x: 0, y: 0 },
    eyeWidth: 30,
    eyeHeight: 30,
    pupilSize: 12,
    pupilMovementFactor: 1,
    pillSide: 'left' as 'left' | 'right'
  });
  
  const [rightPillExtraBottom, setRightPillExtraBottom] = useState(0);
  const [pillHeight, setPillHeight] = useState(0);
  const [pillWidth, setPillWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const pillInnerRef = useRef<HTMLDivElement>(null);
  
  const textRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  // Load edited text from localStorage on mount
  useEffect(() => {
    const storageKey = `edited_question_${question.question}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setEditedText(saved);
    }
  }, [question.question]);

  // Save edited text to localStorage whenever it changes
  useEffect(() => {
    if (editedText) {
      const storageKey = `edited_question_${question.question}`;
      localStorage.setItem(storageKey, editedText);
    }
  }, [editedText, question.question]);

  // Generate unique monster variation based on question text
  useEffect(() => {
    // Create a simple hash from question text for consistency
    const hash = question.question.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Use hash to generate random but consistent variations
    const random = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    // Circle size variation (0-20% reduction)
    const sizeVariation = random(hash) * 0.2;
    const baseSize = 120 * (1 - sizeVariation);
    
    // Calculate horizontal offset to overflow by at least 20%
    const offsetDirection = random(hash + 11) > 0.5 ? 1 : -1; // Left or right
    const circleOffsetX = offsetDirection * (20 + random(hash + 12) * 10); // 20-30% overflow
    
    // Pill goes to opposite side of monster
    const pillSide = offsetDirection > 0 ? 'left' : 'right';
    
    // Ellipse squeezing (up to 20% factor)
    const ellipseFactor = random(hash + 1) * 0.2;
    const isWidthSquished = random(hash + 2) > 0.5;
    
    // Eye position shift (+-5%)
    const eyeShiftX = (random(hash + 3) - 0.5) * 2 * 0.05 * 100; // +-5% in pixels
    const eyeShiftY = (random(hash + 4) - 0.5) * 2 * 0.05 * 30;
    
    // Eye shape variations (both eyes same shape)
    const eyeIsEllipse = random(hash + 5) > 0.6;
    const eyeStretch = eyeIsEllipse ? (random(hash + 7) > 0.5 ? 1.5 : 0.7) : 1;
    
    // Pupil size variation (0 to +30% bigger)
    const pupilSizeVariation = random(hash + 9) * 0.3; // 0 to 0.3
    const pupilSize = 12 * (1 + pupilSizeVariation);
    
    // Pupil movement factor (affects range of movement)
    const pupilMovementFactor = 0.8 + random(hash + 10) * 0.4; // 0.8 to 1.2
    
    setMonsterVariation({
      circleSize: baseSize,
      circleWidth: baseSize * (isWidthSquished ? (1 - ellipseFactor) : (1 + ellipseFactor)),
      circleHeight: baseSize * (isWidthSquished ? (1 + ellipseFactor) : (1 - ellipseFactor)),
      circleOffsetX: circleOffsetX,
      eyeShift: { x: eyeShiftX, y: eyeShiftY },
      eyeWidth: 30 * eyeStretch,
      eyeHeight: 30 / eyeStretch,
      pupilSize: pupilSize,
      pupilMovementFactor: pupilMovementFactor,
      pillSide: pillSide
    });
  }, [question.question]);

  // Synchronized pupil movement for both eyes - more frequent and bigger movement
  useEffect(() => {
    const movePupil = () => {
      const maxOffset = 7 * monsterVariation.pupilMovementFactor; // Increased from 4 to 7
      const randomX = (Math.random() - 0.5) * 2 * maxOffset;
      const randomY = (Math.random() - 0.5) * 2 * maxOffset;
      setPupilOffset({ x: randomX, y: randomY });
    };

    movePupil();

    const scheduleNextMove = () => {
      const delay = 1500 + Math.random() * 2500; // Changed from 10-20s to 1.5-4s
      return setTimeout(() => {
        movePupil();
        scheduleNextMove();
      }, delay);
    };

    const timeoutId = scheduleNextMove();
    return () => clearTimeout(timeoutId);
  }, [monsterVariation.pupilMovementFactor]);

  // Synchronized blinking for both eyes - less frequent
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };

    const initialDelay = 5000 + Math.random() * 5000;
    const initialTimeout = setTimeout(blink, initialDelay);

    const scheduleNextBlink = () => {
      const delay = 8000 + Math.random() * 12000; // 8-20 seconds for less frequent blinking
      return setTimeout(() => {
        blink();
        scheduleNextBlink();
      }, delay);
    };

    const timeoutId = scheduleNextBlink();
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(timeoutId);
    };
  }, []);

  // Process text to handle long words individually and preserve line breaks
  useEffect(() => {
    const processText = () => {
      if (!containerRef.current) return;

      // Initialize German hyphenator
      const h = new Hypher(german);

      // Clean source text
      const cleanedText = question.question.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      const textWithoutFirstChar = cleanedText.substring(1);
      const words = textWithoutFirstChar.split(' ');

      // Measure container and create measuring span that mirrors the H1 styles
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const measureSpan = document.createElement('span');
      const computed = textRef.current ? window.getComputedStyle(textRef.current) : undefined;
      measureSpan.style.position = 'absolute';
      measureSpan.style.visibility = 'hidden';
      measureSpan.style.whiteSpace = 'nowrap';
      measureSpan.style.fontFamily = computed?.fontFamily || 'Rauschen, sans-serif';
      measureSpan.style.fontWeight = computed?.fontWeight || '600';
      measureSpan.style.fontSize = computed?.fontSize || '32px';
      measureSpan.style.letterSpacing = computed?.letterSpacing || '0px';
      containerRef.current.appendChild(measureSpan);

      const buffer = 16; // padding allowance
      const processed = words.map((word, i) => {
        // Never hyphenate abbreviations, numbers, or very short words
        const isAbbrev = /^[A-ZÄÖÜ]{2,}$/.test(word);
        const hasNumberOrSymbol = /[0-9§$%&/()+#*]/.test(word);
        if (word.length < 6 || isAbbrev || hasNumberOrSymbol) {
          return (<span key={i}>{word}{i < words.length - 1 && ' '}</span>);
        }

        // Measure word width
        measureSpan.textContent = word;
        const wordWidth = measureSpan.getBoundingClientRect().width;
        const needsHyphenation = wordWidth > (containerWidth - buffer);

        if (!needsHyphenation) {
          return (<span key={i}>{word}{i < words.length - 1 && ' '}</span>);
        }

        // Insert soft hyphens at valid German syllable boundaries
        const hyphenated = h.hyphenate(word).join('\u00AD');
        return (<span key={i}>{hyphenated}{i < words.length - 1 && ' '}</span>);
      });

      containerRef.current.removeChild(measureSpan);
      setProcessedText([<span key="single-line">{processed}</span>]);
    };

    const timeoutId = setTimeout(processText, 50);
    window.addEventListener('resize', processText);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', processText);
    };
  }, [question.question]);

  // Adjust pill positioning based on its dimensions
  useEffect(() => {
    if (question.category.toLowerCase() === 'intro') return;
    const el = pillInnerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const extra = Math.max(0, rect.width - rect.height);
      setRightPillExtraBottom(extra);
      setPillHeight(rect.height);
      setPillWidth(rect.width);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [question.category, monsterVariation.pillSide]);

  // Measure card width
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setCardWidth(rect.width);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Get category-specific colors using specific category mapping
  const getCategoryColors = (categoryIndex: number) => {
    // Use specific color mapping for each category based on the actual category name
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
        colorIndex = (categoryIndex % 11) + 1;
    }
    
    // Card color (first hex) for card bg, logo, header text, pill text
    // Page bg color (second hex) for page background
    const colorVars = {
      1: { cardColor: 'hsl(var(--quiz-category1-card))', pageBg: 'hsl(var(--quiz-category1-bg))' },
      2: { cardColor: 'hsl(var(--quiz-category2-card))', pageBg: 'hsl(var(--quiz-category2-bg))' },
      3: { cardColor: 'hsl(var(--quiz-category3-card))', pageBg: 'hsl(var(--quiz-category3-bg))' },
      4: { cardColor: 'hsl(var(--quiz-category4-card))', pageBg: 'hsl(var(--quiz-category4-bg))' },
      5: { cardColor: 'hsl(var(--quiz-category5-card))', pageBg: 'hsl(var(--quiz-category5-bg))' },
      6: { cardColor: 'hsl(var(--quiz-category6-card))', pageBg: 'hsl(var(--quiz-category6-bg))' },
      7: { cardColor: 'hsl(var(--quiz-category7-card))', pageBg: 'hsl(var(--quiz-category7-bg))' },
      8: { cardColor: 'hsl(var(--quiz-category8-card))', pageBg: 'hsl(var(--quiz-category8-bg))' },
      9: { cardColor: 'hsl(var(--quiz-category9-card))', pageBg: 'hsl(var(--quiz-category9-bg))' },
      10: { cardColor: 'hsl(var(--quiz-category10-card))', pageBg: 'hsl(var(--quiz-category10-bg))' },
      11: { cardColor: 'hsl(var(--quiz-category11-card))', pageBg: 'hsl(var(--quiz-category11-bg))' },
    };
    
    return colorVars[colorIndex as keyof typeof colorVars] || colorVars[1];
  };

  const categoryColors = getCategoryColors(categoryIndex);

  const onTouchStart = (e: React.TouchEvent) => {
    if (onDragStart) {
      onDragStart(e.touches[0].clientX);
    } else {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (onDragMove) {
      onDragMove(e.touches[0].clientX);
    } else {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    if (onDragEnd) {
      onDragEnd();
    } else {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        onSwipeLeft();
      } else if (isRightSwipe) {
        onSwipeRight();
      }
    }
  };

  // Mouse drag handlers for desktop
  const onMouseDown = (e: React.MouseEvent) => {
    if (onDragStart) {
      onDragStart(e.clientX);
    } else {
      setMouseEnd(null);
      setMouseStart(e.clientX);
      setIsLocalDragging(true);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (onDragMove) {
      onDragMove(e.clientX);
    } else {
      if (!isLocalDragging) return;
      setMouseEnd(e.clientX);
    }
  };

  const onMouseUp = () => {
    if (onDragEnd) {
      onDragEnd();
    } else {
      if (!isLocalDragging || !mouseStart || !mouseEnd) {
        setIsLocalDragging(false);
        return;
      }
      
      const distance = mouseStart - mouseEnd;
      const isLeftDrag = distance > minSwipeDistance;
      const isRightDrag = distance < -minSwipeDistance;

      if (isLeftDrag) {
        onSwipeLeft();
      } else if (isRightDrag) {
        onSwipeRight();
      }
      
      setIsLocalDragging(false);
    }
  };

  const onMouseLeave = () => {
    if (onDragEnd && isDragging) {
      onDragEnd();
    } else {
      setIsLocalDragging(false);
    }
  };

  return (
    <div 
      ref={cardRef}
      className={`relative w-full max-w-[500px] mx-auto select-none`}
      style={{
        height: 'calc(100% - 32px)',
        maxHeight: 'calc(100% - 32px)',
        backgroundColor: question.category.toLowerCase() !== 'intro' ? categoryColors.cardColor : 'hsl(var(--card-background))',
        color: question.category.toLowerCase() !== 'intro' ? 'white' : 'hsl(var(--foreground))',
        boxShadow: '0 0 24px 20px rgba(0, 0, 0, 0.16)',
        borderRadius: '8px',
        touchAction: 'none'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Inner container with slightly smaller border-radius for better clipping */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden'
        }}
      >
      {/* Left Click Area - Previous */}
      <div 
        className="absolute left-0 top-0 w-20 h-full z-20 cursor-pointer"
        onClick={onSwipeRight}
      />

      {/* Right Click Area - Next */}
      <div 
        className="absolute right-0 top-0 w-20 h-full z-20 cursor-pointer"
        onClick={onSwipeLeft}
      />

      {/* Category Pill - At bottom of card */}
      {question.category.toLowerCase() !== 'intro' && (
          <div
            ref={pillInnerRef}
            className="font-medium font-stringer"
            style={{
              position: 'absolute',
              left: '24px',
              bottom: '24px',
              backgroundColor: 'transparent',
              color: 'black',
              fontSize: '16px',
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              letterSpacing: '-0.02em',
              paddingLeft: '16px',
              paddingRight: '16px',
              zIndex: 20,
              width: 'auto',
              borderRadius: '8px',
              border: '1px solid black'
            }}
          >
          {question.category}
        </div>
      )}

      {/* Edit Button moved outside inner container to avoid clipping of drop-shadow */}
      <div className={`h-full flex flex-col justify-start p-6 relative`}>

        <div ref={containerRef} className={`flex-1 flex flex-col w-full ${question.category.toLowerCase() === 'intro' ? 'items-center justify-start text-left' : 'items-start justify-start text-left'}`}>
          <h1 
            ref={textRef}
            lang="de"
            className={`font-stringer leading-[120%] w-full ${question.category.toLowerCase() === 'intro' ? 'text-[1.6rem] md:text-[1.5rem] lg:text-[1.66rem] max-w-md' : 'text-[2rem] md:text-[2.16rem] lg:text-[2.83rem] max-w-full'}`}
            style={{ 
              fontWeight: 400,
              fontStyle: 'normal',
              letterSpacing: '0px',
              color: question.category.toLowerCase() !== 'intro' ? '#1A1A1A' : 'hsl(var(--foreground))',
              fontSize: isEditing ? '16px' : undefined,
              transform: isEditing ? 'scale(0.95)' : 'scale(1)',
              transition: 'all 0.3s ease',
              hyphens: 'manual',
              WebkitHyphens: 'manual',
              MozHyphens: 'manual',
              msHyphens: 'manual',
              overflowWrap: 'break-word',
              ...(isEditing && { color: 'black', marginLeft: '-4px' })
            }}
          >
            <style>{`
              h1[lang="de"] {
                font-variant-emoji: text;
              }
            `}</style>
            {(() => {
              const text = question.question;
              const words = text.split(/(\s+)/);
              const h = new Hypher(german);
              let firstSubstantiveFound = false;
              let highlightedIndex = -1;
              
              // First pass: find if there's a substantive
              for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const isSubstantive = word.length > 0 && word[0] === word[0].toUpperCase() && /[A-ZÄÖÜ]/.test(word[0]);
                if (isSubstantive) {
                  highlightedIndex = i;
                  firstSubstantiveFound = true;
                  break;
                }
              }
              
              // If no substantive found, pick a consistent word from the middle (based on text length)
              if (!firstSubstantiveFound) {
                const actualWords = words.filter((w, i) => i % 2 === 0 && w.trim().length > 0);
                if (actualWords.length > 2) {
                  // Pick from middle third of the sentence, avoiding first and last few words
                  const startIdx = Math.floor(actualWords.length / 3);
                  const endIdx = Math.floor(actualWords.length * 2 / 3);
                  const middleWords = actualWords.slice(startIdx, endIdx);
                  
                  if (middleWords.length > 0) {
                    // Use text length as seed for consistent selection
                    const seedIndex = text.length % middleWords.length;
                    const selectedWord = middleWords[seedIndex];
                    // Find the index of this word in the original words array
                    for (let i = 0; i < words.length; i++) {
                      if (words[i] === selectedWord) {
                        highlightedIndex = i;
                        break;
                      }
                    }
                  }
                }
              }
              
              return words.map((word, index) => {
                // Highlight the selected word (either substantive or consistent middle word)
                if (index === highlightedIndex) {
                  // Extract leading and trailing punctuation
                  const leadingMatch = word.match(/^[^\wäöüÄÖÜß]*/);
                  const trailingMatch = word.match(/[^\wäöüÄÖÜß]*$/);
                  const leading = leadingMatch ? leadingMatch[0] : '';
                  const trailing = trailingMatch ? trailingMatch[0] : '';
                  const coreWord = word.slice(leading.length, word.length - trailing.length);
                  
                  return (
                    <span key={index} style={{ display: 'contents' }}>
                      {leading}
                      <span 
                        className="font-rauschen"
                        style={{ 
                          transform: 'rotate(-2deg)',
                          fontWeight: 600,
                           display: 'inline',
                           verticalAlign: 'baseline',
                           transformOrigin: 'center bottom',
                          fontSize: '120%',
                          hyphens: 'auto',
                          WebkitHyphens: 'auto',
                          MozHyphens: 'auto',
                          msHyphens: 'auto',
                          wordBreak: 'normal',
                          overflowWrap: 'break-word'
                        }}
                      >
                        {h.hyphenate(coreWord).join('\u00AD')}
                      </span>
                      {trailing ? (
                        <span style={{ whiteSpace: 'nowrap' }}>{'\u2060'}{trailing}</span>
                      ) : null}
                    </span>
                  );
                }
                
                // First character gets special styling
                if (index === 0 && word.length > 0) {
                  return (
                    <span key={index}>
                      <span style={{ fontFeatureSettings: '"ss01" 1' }}>{word.charAt(0)}</span>
                      {word.substring(1)}
                    </span>
                  );
                }
                
                // Hyphenate non-highlighted words only when they might exceed line width
                // We insert soft hyphens at valid German hyphenation points.
                if (/^\s+$/.test(word)) {
                  return <span key={index}>{word}</span>;
                }

                const leadMatch2 = word.match(/^[^\wäöüÄÖÜß]*/);
                const trailMatch2 = word.match(/[^\wäöüÄÖÜß]*$/);
                const lead2 = leadMatch2 ? leadMatch2[0] : '';
                const trail2 = trailMatch2 ? trailMatch2[0] : '';
                const core2 = word.slice(lead2.length, word.length - trail2.length);

                // Simple heuristic: only add soft hyphens for longer words
                const shouldHyphenate = core2.length >= 12;
                const displayCore2 = shouldHyphenate ? h.hyphenate(core2).join('\u00AD') : core2;

                return (
                  <span key={index} style={{ display: 'contents' }}>
                    {lead2}
                    <span>{displayCore2}</span>
                    {trail2}
                  </span>
                );
              });
            })()}
          </h1>
          
          {isEditing && (
            <style>{`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(10px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .edit-textarea-container {
                animation: fadeIn 250ms ease-in-out;
              }
              .edit-textarea {
                transition: all 250ms ease-in-out;
              }
              .edit-textarea:focus,
              .edit-textarea:focus-visible {
                outline: none !important;
                ring: none !important;
                box-shadow: none !important;
              }
              .edit-textarea::placeholder {
                color: black;
                opacity: 0.4;
              }
            `}</style>
          )}
          {isEditing && (
            <div className="flex-1 relative mt-1 w-full edit-textarea-container" style={{ marginLeft: '-4px' }}>
               <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="Deine Antwort"
                className={`font-rauschen w-full h-full resize-none edit-textarea ${question.category.toLowerCase() === 'intro' ? 'text-[1.6rem] md:text-[1.5rem] lg:text-[1.66rem]' : 'text-[2rem] md:text-[2.16rem] lg:text-[2.83rem]'}`}
                style={{
                  fontWeight: 'bold',
                  fontStyle: 'normal',
                  backgroundColor: categoryColors.cardColor,
                  border: 'none',
                  color: 'rgba(0, 0, 0, 0.85)',
                  padding: '4px',
                  outline: 'none',
                  boxShadow: 'none',
                  lineHeight: '120%'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        {/* Navigation hint at bottom - only for intro slides */}
        {question.category.toLowerCase() === 'intro' && (
          <div className="text-center">
            <p className="text-xs opacity-60">
              Swipe um weiter zu navigieren
            </p>
          </div>
        )}

      </div>

      </div> {/* Close inner container with border-radius mask */}

      {question.category.toLowerCase() !== 'intro' && question.category.toLowerCase() !== 'info' && (
        <button
          style={{
            position: 'absolute',
            right: '24px',
            bottom: '24px',
            width: '69px',
            height: '69px',
            border: 'none',
            cursor: 'pointer',
            zIndex: 40,
            padding: 0,
            backgroundColor: 'black',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(!isEditing);
          }}
        >
          {isEditing ? (
            <img src={closeIcon} alt="Close" style={{ width: '22px', height: '22px', filter: 'invert(1)' }} />
          ) : (
            <img src={editIcon} alt="Edit" style={{ width: '26px', height: '26px', filter: 'invert(1)' }} />
          )}
        </button>
      )}
    </div>
  );
}