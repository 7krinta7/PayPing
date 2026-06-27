/* Shared avatar helpers used by ClientList and InvoiceList. */

export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AVATAR_PALETTE = [
  { bg: 'var(--color-primary-bg)',       fg: 'var(--color-primary)' },
  { bg: 'var(--color-success-bg)',       fg: 'var(--color-success-text)' },
  { bg: 'var(--color-warning-bg)',       fg: 'var(--color-warning-text)' },
  { bg: 'var(--color-danger-bg)',        fg: 'var(--color-danger-text)' },
  { bg: 'var(--color-avatar-1-bg)',      fg: 'var(--color-avatar-1-fg)' },
  { bg: 'var(--color-avatar-2-bg)',      fg: 'var(--color-avatar-2-fg)' },
  { bg: 'var(--color-avatar-3-bg)',      fg: 'var(--color-avatar-3-fg)' },
  { bg: 'var(--color-warning-bg)',       fg: 'var(--color-warning-text)' },
];

export function avatarColors(seed) {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}