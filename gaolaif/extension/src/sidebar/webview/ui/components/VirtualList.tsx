import { memo, useCallback, useEffect, useRef, useState } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  /** render nothing if list is empty */
  emptyState?: React.ReactNode;
  className?: string;
  /** threshold above which virtualization kicks in (default 50) */
  threshold?: number;
}

function VirtualListImpl<T>({
  items,
  height,
  itemHeight,
  renderItem,
  keyExtractor,
  emptyState,
  className,
  threshold = 50,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualize = items.length > threshold;

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (items.length === 0 && emptyState) {
    return <div style={{ height }}>{emptyState}</div>;
  }

  if (!virtualize) {
    return (
      <div ref={containerRef} style={{ height, overflow: 'auto' }} className={className}>
        {items.map((item, i) => (
          <div key={keyExtractor(item, i)} style={{ height: itemHeight }}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    );
  }

  const visibleCount = Math.ceil(height / itemHeight) + 4; // overscan 2 each side
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex).map((item, i) => ({
    item,
    index: startIndex + i,
    key: keyExtractor(item, startIndex + i),
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div ref={containerRef} style={{ height, overflow: 'auto' }} className={className}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index, key }) => (
            <div key={key} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const VirtualList = memo(VirtualListImpl) as typeof VirtualListImpl;
