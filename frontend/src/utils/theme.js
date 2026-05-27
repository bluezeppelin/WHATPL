function hexToRgb(hex) {
  const cleaned =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned);
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : null;
}

export function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;

  if (theme.mainColor) {
    root.style.setProperty('--accent', theme.mainColor);
    root.style.setProperty('--color-main', theme.mainColor);
    root.style.setProperty('--accent-pressed', theme.mainColor);
    const rgb = hexToRgb(theme.mainColor);
    if (rgb) {
      root.style.setProperty('--accent-glow', `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
      root.style.setProperty('--border-hover', `rgba(${rgb.r},${rgb.g},${rgb.b},0.50)`);
    }
  }

  if (theme.subColor1) {
    root.style.setProperty('--accent-hover', theme.subColor1);
    root.style.setProperty('--highlight', theme.subColor1);
    root.style.setProperty('--color-sub-1', theme.subColor1);
  }

  if (theme.subColor2) {
    root.style.setProperty('--color-sub-2', theme.subColor2);
  }

  if (theme.subColor3) {
    root.style.setProperty('--color-sub-3', theme.subColor3);
  }
}
