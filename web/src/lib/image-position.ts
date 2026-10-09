import type { ImagePosition } from '@/api/types';

/** CSS `object-position` value for a focal-point preset. */
export function imagePositionCss(position: ImagePosition | string | null | undefined): string {
  switch (position) {
    case 'TOP_LEFT':
      return 'left top';
    case 'TOP':
      return 'center top';
    case 'TOP_RIGHT':
      return 'right top';
    case 'LEFT':
      return 'left center';
    case 'RIGHT':
      return 'right center';
    case 'BOTTOM_LEFT':
      return 'left bottom';
    case 'BOTTOM':
      return 'center bottom';
    case 'BOTTOM_RIGHT':
      return 'right bottom';
    default:
      return 'center';
  }
}