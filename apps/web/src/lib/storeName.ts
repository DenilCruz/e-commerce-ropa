/** Turns a store slug ("moda-luna") into a name fit for display ("Moda Luna"). */
export const storeDisplayName = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
