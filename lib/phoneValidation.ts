const blockedPhoneNumbers = new Set([
  "0123456789",
  "1234567890",
  "0987654321",
  "9876543210"
]);

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function validatePhoneNumber(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!/^\d{10}$/.test(normalizedPhone)) {
    return "Phone number must be exactly 10 digits.";
  }

  if (!/^[6-9]/.test(normalizedPhone)) {
    return "Enter a valid 10-digit mobile number.";
  }

  if (/^(\d)\1{9}$/.test(normalizedPhone)) {
    return "Phone number cannot be all the same digit.";
  }

  if (blockedPhoneNumbers.has(normalizedPhone)) {
    return "Enter a valid mobile number instead of a test pattern.";
  }

  if (/^(?:12345|54321|67890|98765)/.test(normalizedPhone)) {
    return "Enter a valid mobile number instead of a sequential pattern.";
  }

  return null;
}
