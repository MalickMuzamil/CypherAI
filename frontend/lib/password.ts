export function generatePassword(length = 24) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, n => alphabet[n % alphabet.length]).join("");
}
