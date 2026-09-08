export const PASSWORD_POLICY_MESSAGE = 'Use 8+ characters with uppercase, lowercase, number, and special character.';

export const getPasswordValidationError = (value: string): string => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters long.';
  if (value.length > 200) return 'Password must be at most 200 characters long.';
  if (value !== value.trim()) return 'Password must not start or end with spaces.';
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9\s]/.test(value)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return '';
};

export const isStrongPassword = (value: string) => !getPasswordValidationError(value);
