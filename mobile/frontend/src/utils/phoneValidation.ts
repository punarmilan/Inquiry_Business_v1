export const INDIAN_LOCAL_PHONE_LENGTH = 10;

export type IndianPhoneInput = {
  digits: string;
  hadTooManyDigits: boolean;
};

export const sanitizeIndianPhoneInput = (value: string): IndianPhoneInput => {
  const compact = String(value || '').trim().replace(/[\s-]/g, '');
  const localValue = compact.startsWith('+91') ? compact.slice(3) : compact;
  const digits = localValue.replace(/\D/g, '');
  return {
    digits: digits.slice(0, INDIAN_LOCAL_PHONE_LENGTH),
    hadTooManyDigits: digits.length > INDIAN_LOCAL_PHONE_LENGTH,
  };
};

export const isValidIndianPhoneDigits = (digits: string) =>
  /^\d{10}$/.test(digits);

export const toIndianPhone = (value: string) => {
  const compact = String(value || '').trim().replace(/[\s-]/g, '');
  const localValue = compact.startsWith('+91') ? compact.slice(3) : compact;
  if (!/^\d{10}$/.test(localValue)) return null;
  return `+91${localValue}`;
};
