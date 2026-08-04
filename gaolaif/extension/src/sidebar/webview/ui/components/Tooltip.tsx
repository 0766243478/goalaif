import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  children: ReactNode;
}

export function Tooltip({ content, position = 'top', delay = 500, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const offset = 6;
      let x = rect.left + rect.width / 2;
      let y = rect.top;
      if (position === 'top') y = rect.top - offset;
      else if (position === 'bottom') y = rect.bottom + offset;
      else if (position === 'left') {
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
      } else if (position === 'right') {
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
      }
      setCoords({ x, y });
      setVisible(true);
    }, delay);
  }, [delay, position]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {visible && (
        <div
          className="sireen-tooltip"
          style={{
            left: coords.x,
            top: coords.y,
            transform:
              position === 'top'
                ? 'translate(-50%, -100%)'
                : position === 'bottom'
                  ? 'translate(-50%, 0)'
                  : position === 'left'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
          }}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </>
  );
}
