import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type WindowSize = {
  width: number;
  height: number;
  isFolded: boolean;
  isTablet: boolean;
  scale: number;
};

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => {
    const { width, height, scale } = Dimensions.get('window');
    return {
      width,
      height,
      isFolded: width < 600,
      isTablet: width >= 600,
      scale,
    };
  });

  useEffect(() => {
    const handler = ({ window }: { window: { width: number; height: number; scale: number } }) => {
      setSize({
        width: window.width,
        height: window.height,
        isFolded: window.width < 600,
        isTablet: window.width >= 600,
        scale: window.scale,
      });
    };

    const subscription = Dimensions.addEventListener('change', handler);
    return () => subscription.remove();
  }, []);

  return size;
}

export function useResponsiveLayout() {
  const size = useWindowSize();
  const isLargeScreen = size.isTablet;
  const cardWidth = isLargeScreen ? '48%' : '100%';
  const columns = isLargeScreen ? 2 : 1;
  const maxContentWidth = isLargeScreen ? 720 : undefined;

  return {
    ...size,
    isLargeScreen,
    cardWidth,
    columns,
    maxContentWidth,
  };
}
