import { useWindowDimensions, DimensionValue } from 'react-native';

export const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 600;
  const isFold = width >= 600 && width < 840;
  const isTablet = width >= 840;
  const isTabletOrFold = isFold || isTablet;

  // Layout width helpers for responsive grids
  const halfWidth: DimensionValue = isMobile ? '100%' : '48%';
  const thirdWidth: DimensionValue = isTablet ? '31%' : isFold ? '48%' : '100%';
  const quarterWidth: DimensionValue = isTablet ? '23%' : isFold ? '48%' : '100%';

  return {
    width,
    height,
    isMobile,
    isFold,
    isTablet,
    isTabletOrFold, // Replaces previous basic 'isTablet' logic that was width > 800
    halfWidth,
    thirdWidth,
    quarterWidth
  };
};
