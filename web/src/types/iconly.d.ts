/**
 * react-iconly spreads any props it doesn't own onto the rendered `<svg>`
 * (`rest` spread in its icon factory), so Tailwind utilities such as
 * `h-4 w-4` and `text-flame-600` work at runtime — but `className` is missing
 * from its published `IconProps` type. Merge it in so the app can size and
 * tint Iconly icons the same way it sized lucide icons.
 *
 * Sizing note: `.h-* / .w-*` (CSS) wins over the `width`/`height` attributes
 * Iconly sets, so no `size` prop is needed alongside utility classes.
 * Colour flows through Iconly's `primaryColor` default of `currentColor`.
 */
import 'react-iconly';

declare module 'react-iconly' {
  interface IconProps {
    /** Tailwind sizing/colour utilities (forwarded to the root `<svg>`). */
    className?: string;
  }
}
