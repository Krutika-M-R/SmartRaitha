export function validateName(name, t) {
  if (!/^\p{L}[\p{L}\s]*$/u.test(name)) {
    return t ? t('invalidName') : 'Name must start with a letter and contain only letters.';
  }
  return null;
}

export function validateEmail(email, t) {
  if (!/^[a-zA-Z0-9._%+-]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return t ? t('invalidEmail') : 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password, t) {
  if (password.length < 8) {
    return t ? t('passwordTooShort') : 'Password must be at least 8 characters.';
  }
  if (!/[0-9]/.test(password)) {
    return t ? t('passwordNeedsNumber') : 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return t ? t('passwordNeedsSpecialCharacter') : 'Password must contain at least one special character.';
  }
  return null;
}