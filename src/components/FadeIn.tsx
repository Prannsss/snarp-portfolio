import { useRef, useEffect } from 'react';
import type { ElementType, ReactNode } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}

export default function FadeIn({ children, delay = 0, className = '', as: Tag = 'div' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (inView) controls.start({ opacity: 1, y: 0 });
  }, [inView, controls]);

  const Component: ElementType = Tag;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={controls}
      transition={{ duration: 0.8, ease: 'easeOut', delay }}
      className={className}
    >
      <Component>{children}</Component>
    </motion.div>
  );
}
