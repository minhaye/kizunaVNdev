const DEFAULT_ONLINE_WINDOW_MS = 15_000;
const TIMEZONE_SUFFIX_PATTERN = /(?:z|[+-]\d{2}:?\d{2})$/i;

export const normalizePresenceTimestamp = (value: string | null | undefined) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const timestamp = TIMEZONE_SUFFIX_PATTERN.test(trimmed) ? trimmed : `${trimmed}Z`;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
};

export const isRecentlyOnline = (
  value: string | null | undefined,
  windowMs = DEFAULT_ONLINE_WINDOW_MS,
  now = Date.now(),
) => {
  const normalized = normalizePresenceTimestamp(value);
  if (!normalized) return false;

  const timestamp = new Date(normalized).getTime();
  return now - timestamp <= windowMs && timestamp - now <= windowMs;
};
