import type { ImagePosition } from '@/api/types';

/** All focal-point presets admin can pick for product/banner images. */
export const IMAGE_POSITIONS: Array<{ value: ImagePosition; label: string }> = [
  { value: 'CENTER', label: 'Center' },
  { value: 'TOP', label: 'Top' },
  { value: 'TOP_LEFT', label: 'Top left' },
  { value: 'TOP_RIGHT', label: 'Top right' },
  { value: 'LEFT', label: 'Left' },
  { value: 'RIGHT', label: 'Right' },
  { value: 'BOTTOM', label: 'Bottom' },
  { value: 'BOTTOM_LEFT', label: 'Bottom left' },
  { value: 'BOTTOM_RIGHT', label: 'Bottom right' },
];