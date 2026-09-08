const INDIAN_LOCAL_PHONE_PATTERN = /^\d{10}$/;

const normalizeIndianPhone = (phone) => {
  const compact = String(phone || '').trim().replace(/[\s-]/g, '');
  const localValue = compact.startsWith('+91') ? compact.slice(3) : compact;
  if (!INDIAN_LOCAL_PHONE_PATTERN.test(localValue)) return null;
  return `+91${localValue}`;
};

module.exports = { INDIAN_LOCAL_PHONE_PATTERN, normalizeIndianPhone };
