import crypto from 'crypto';
import { argon2id, argon2Verify } from 'hash-wasm';

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (typeof password !== 'string' || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(password) && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number or special symbol.' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Password is too long (maximum 128 characters).' };
  }
  return { isValid: true };
}

/**
 * Hashes a plaintext password using Argon2id with high memory-hardness.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return argon2id({
    password,
    salt,
    iterations: 3,
    memorySize: 65536, // 64 MB memory hardness
    hashLength: 32,
    parallelism: 1,
    outputType: 'encoded',
  });
}

/**
 * Verifies a plaintext password against an Argon2id PHC encoded hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({
      password,
      hash,
    });
  } catch {
    return false;
  }
}
