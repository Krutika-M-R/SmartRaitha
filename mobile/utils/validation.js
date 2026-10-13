export function validateName(name) {
  if (!/^[A-Za-z][A-Za-z\s]*$/.test(name)) {
    return 'Name must start with a letter and contain only letters.';
  }
  return null;
}

export function validateEmail(email) {
  if (!/^[a-zA-Z0-9._%+-]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}