import { useEffect, useState, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  
  // State for classes and visibility
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Refs for high-frequency tracking and avoiding re-renders
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isHoveringRef = useRef(false);
  const isClickingRef = useRef(false);
  const targetRadiusRef = useRef<string>('50%');
  const currentElementRef = useRef<HTMLElement | null>(null);

  // Frame loop for smooth tracking
  useEffect(() => {
    let animationFrame: number;
    
    const update = () => {
      const cursor = cursorRef.current;
      
      // If cursor doesn't exist yet, keep retrying
      if (!cursor) {
        animationFrame = requestAnimationFrame(update);
        return;
      }

      // If hovering, we strictly follow the element with 60FPS precision
      if (isHoveringRef.current && currentElementRef.current) {
        const padding = 3;
        const rect = currentElementRef.current.getBoundingClientRect();
        
        cursor.style.transform = `translate3d(${rect.left - padding}px, ${rect.top - padding}px, 0)`;
        cursor.style.width = `${rect.width + padding * 2}px`;
        cursor.style.height = `${rect.height + padding * 2}px`;
        cursor.style.borderRadius = targetRadiusRef.current;
      } 
      
      // Continue the loop
      animationFrame = requestAnimationFrame(update);
    };
    
    // Start the loop
    animationFrame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    // Hide default cursor
    document.body.style.cursor = 'none';
    
    const updateDefaultCursor = (x: number, y: number) => {
      const cursor = cursorRef.current;
      if (!cursor || isHoveringRef.current) return;

      const size = isClickingRef.current ? 8 : 12;
      cursor.style.width = `${size}px`;
      cursor.style.height = `${size}px`;
      cursor.style.borderRadius = '50%';
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      setIsVisible(true);
      if (!isHoveringRef.current) {
        updateDefaultCursor(e.clientX, e.clientY);
      }
    };

    const handleScroll = () => {
      if (isHoveringRef.current) {
        isHoveringRef.current = false;
        setIsHovering(false);
        currentElementRef.current = null;
        
        // Immediate reset
        const cursor = cursorRef.current;
        if (cursor) {
          cursor.style.transition = 'none';
          updateDefaultCursor(mousePosRef.current.x, mousePosRef.current.y);
          requestAnimationFrame(() => cursor.style.transition = '');
        }
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    const handleMouseDown = () => {
      setIsClicking(true);
      isClickingRef.current = true;
      if (!isHoveringRef.current) {
        updateDefaultCursor(mousePosRef.current.x, mousePosRef.current.y);
      }
    };

    const handleMouseUp = () => {
      setIsClicking(false);
      isClickingRef.current = false;
      if (!isHoveringRef.current) {
        updateDefaultCursor(mousePosRef.current.x, mousePosRef.current.y);
      }
    };

    // Store cleanup functions for each element
    const cleanupFunctions = new Map<HTMLElement, () => void>();

    // Find all clickable elements
    const addHoverListeners = () => {
      const clickables = document.querySelectorAll('a, button, [role="button"], input[type="submit"], .cursor-hover');
      
      clickables.forEach((el) => {
        const element = el as HTMLElement;
        
        // Skip if already has listeners
        if (cleanupFunctions.has(element)) return;
        
        element.style.cursor = 'none';
        
        const onEnter = () => {
          currentElementRef.current = element;
          
          const style = window.getComputedStyle(element);
          
          // Fix for text selection / standard elements with no shape
          let radius = style.borderRadius;
          if (!radius || radius === '0px' || radius === '0' || radius === 'none') {
            radius = '12px'; // Default rounded corners for shapeless items
          }
          targetRadiusRef.current = radius;
          
          setIsHovering(true);
          isHoveringRef.current = true;
          
          // Add shake animation to text elements inside
          const textElements = element.querySelectorAll('span, p, h1, h2, h3, h4, h5, h6');
          textElements.forEach((textEl) => {
            (textEl as HTMLElement).style.animation = 'cursorShake 0.3s ease-out';
          });
        };

        const onLeave = (e: MouseEvent) => {
          const relatedTarget = e.relatedTarget as HTMLElement | null;
          
          // Check if moving to another clickable element (handoff)
          const nextClickable = relatedTarget?.closest('a, button, [role="button"], input[type="submit"], .cursor-hover') as HTMLElement;
          
          if (nextClickable) {
            currentElementRef.current = nextClickable;
            const style = window.getComputedStyle(nextClickable);
            let radius = style.borderRadius;
            if (!radius || radius === '0px' || radius === '0' || radius === 'none') {
              radius = '12px';
            }
            targetRadiusRef.current = radius;
            return;
          }
          
          // Detaching from element
          currentElementRef.current = null;
          isHoveringRef.current = false;
          setIsHovering(false);
          
          // SNAP: Immediately apply default styles to bypass CSS transition on class swap
          const cursor = cursorRef.current;
          if (cursor) {
            cursor.style.transition = 'none';
            updateDefaultCursor(mousePosRef.current.x, mousePosRef.current.y);
            requestAnimationFrame(() => cursor.style.transition = '');
          }
          
          // Remove shake animation
          const textElements = element.querySelectorAll('span, p, h1, h2, h3, h4, h5, h6');
          textElements.forEach((textEl) => {
            (textEl as HTMLElement).style.animation = 'cursorShake 0.2s ease-out';
            setTimeout(() => {
              (textEl as HTMLElement).style.animation = '';
            }, 200);
          });
        };

        element.addEventListener('mouseenter', onEnter);
        element.addEventListener('mouseleave', onLeave);
        
        cleanupFunctions.set(element, () => {
          element.removeEventListener('mouseenter', onEnter);
          element.removeEventListener('mouseleave', onLeave);
        });
      });
    };

    // Initial setup
    addHoverListeners();

    // Re-add listeners when DOM changes (for dynamic content)
    const observer = new MutationObserver(() => {
      addHoverListeners();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      observer.disconnect();
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.clear();
      document.body.style.cursor = 'auto';
    };
  }, []);

  const getCursorClasses = () => {
    const classes = ['custom-cursor'];
    
    if (isHovering) {
      classes.push('custom-cursor-hovering');
    } else {
      classes.push('custom-cursor-default');
      if (isClicking) {
        classes.push('custom-cursor-clicking');
      }
    }
    
    if (isVisible) {
      classes.push('custom-cursor-visible');
    } else {
      classes.push('custom-cursor-hidden');
    }
    
    return classes.join(' ');
  };

  // Don't render on touch devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className={getCursorClasses()}
    />
  );
}