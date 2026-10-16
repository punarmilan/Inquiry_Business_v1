const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatCount = (value: number) => inr.format(Math.round(value));
export const formatINR = (value: number) => `₹${inr.format(Math.round(value))}`;

// Indian short scale for chart axes: ₹25K, ₹1.2L, ₹3Cr.
export const formatINRShort = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${+(value / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `₹${+(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${+(value / 1e3).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
};

export const formatCountShort = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1e5) return `${+(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
};

// Percentage change from `previous` to `current`, or null when there is no base to compare against.
export const percentChange = (current: number, previous: number): number | null => {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

// Day keys arrive as 'YYYY-MM-DD' (IST days); parse as a local calendar date, not UTC midnight.
export const parseDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatDayShort = (key: string) => parseDayKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const timeAgo = (iso: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const greeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};
