/**
 * Gera um avatar com gradiente baseado em um identificador único
 * As cores são determinísticas (mesmo ID sempre gera mesmas cores)
 */

interface AvatarGradient {
  color1: string;
  color2: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}

// Paleta de cores pré-definidas para gradientes
const COLOR_PALETTES = [
  { color1: '#DEE151', color2: '#FDA415' },
  { color1: '#C32F99', color2: '#1C3023' },
  { color1: '#3441AD', color2: '#A9B2F4' },
  { color1: '#2C8F5F', color2: '#93CCA6' },
  { color1: '#FF6B6B', color2: '#FFE66D' },
  { color1: '#4ECDC4', color2: '#44A08D' },
  { color1: '#F93B1D', color2: '#EA1E63' },
  { color1: '#667EEA', color2: '#764BA2' },
  { color1: '#F093FB', color2: '#F5576C' },
  { color1: '#4158D0', color2: '#C850C0' },
];

const GRADIENT_CONFIGS = [
  { x1: '-87.5', y1: '-56', x2: '224.115', y2: '252.373' },
  { x1: '67.9153', y1: '52.6308', x2: '223.27', y2: '83.602' },
  { x1: '0', y1: '0', x2: '220', y2: '220' },
  { x1: '0', y1: '220', x2: '220', y2: '0' },
];

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getGradientForId(id: string): AvatarGradient {
  const hash = hashCode(id);
  const paletteIndex = hash % COLOR_PALETTES.length;
  const gradientIndex = Math.floor((hash / COLOR_PALETTES.length) % GRADIENT_CONFIGS.length);

  const palette = COLOR_PALETTES[paletteIndex];
  const gradient = GRADIENT_CONFIGS[gradientIndex];

  return {
    color1: palette.color1,
    color2: palette.color2,
    x1: gradient.x1,
    y1: gradient.y1,
    x2: gradient.x2,
    y2: gradient.y2,
  };
}

export function generateAvatarSVG(identifier: string, initials: string = '?'): string {
  const gradient = getGradientForId(identifier);
  const gradientId = 'gradient_' + hashCode(identifier);

  return '<svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="109.8" cy="109.8" r="109.8" fill="url(#' + gradientId + ')"/><text x="109.8" y="130" font-size="80" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif">' + initials + '</text><defs><linearGradient id="' + gradientId + '" x1="' + gradient.x1 + '" y1="' + gradient.y1 + '" x2="' + gradient.x2 + '" y2="' + gradient.y2 + '" gradientUnits="userSpaceOnUse"><stop offset="0.543269" stop-color="' + gradient.color1 + '"/><stop offset="0.889423" stop-color="' + gradient.color2 + '"/></linearGradient></defs></svg>';
}

export function generateAvatarDataUri(identifier: string, initials: string = '?'): string {
  const svg = generateAvatarSVG(identifier, initials);
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

export function getAvatarColors(identifier: string): { color1: string; color2: string } {
  const gradient = getGradientForId(identifier);
  return {
    color1: gradient.color1,
    color2: gradient.color2,
  };
}
