import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey =
      process.env.WALLET_TRANSFER_ENC || 'default-key-change-in-production';

    if (!process.env.WALLET_TRANSFER_ENC) {
      console.warn(
        'WALLET_TRANSFER_ENC environment variable is not set. Using default key.',
      );
    }
  }

  /**
   * Encrypt sensitive wallet transfer data
   * @param text - The text to encrypt
   * @returns Encrypted string
   */
  encrypt(data: string): string {
    try {
      if (!data || data.trim() === '') {
        throw new Error('Data to encrypt cannot be empty');
      }

      return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive wallet transfer data
   * @param encryptedText - The encrypted text to decrypt
   * @returns Decrypted string
   */
  decrypt(encryptedData: string): string {
    try {
      if (!encryptedData || encryptedData.trim() === '') {
        throw new Error('Encrypted data cannot be empty');
      }

      const decryptedBytes = CryptoJS.AES.decrypt(
        encryptedData,
        this.encryptionKey,
      );
      const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedData) {
        throw new Error(
          'Failed to decrypt data - invalid key or corrupted data',
        );
      }

      return decryptedData;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data for comparison purposes (one-way)
   * @param data - The data to hash
   * @returns Hashed string
   */
  hash(data: string): string {
    try {
      if (!data || data.trim() === '') {
        throw new Error('Data to hash cannot be empty');
      }

      return CryptoJS.SHA256(data + this.encryptionKey).toString();
    } catch (error) {
      throw new Error(`Hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify if the provided data matches the hashed version
   * @param data - The original data
   * @param hashedData - The hashed data to compare against
   * @returns Boolean indicating if they match
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const newHash = this.hash(data);
      return newHash === hashedData;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mask sensitive data for display purposes
   * @param data - The data to mask
   * @param dataType - Type of data ('phone' or 'instagram')
   * @returns Masked string or original data based on rules
   */
  maskData(data: string, dataType: 'phone' | 'instagram' = 'phone'): string {
    if (!data) {
      return '';
    }

    // Rule 1: No masking for Instagram names
    if (dataType === 'instagram') {
      return data;
    }

    // Rule 2: No masking for phone numbers with exactly 3 digits
    if (dataType === 'phone' && data.length === 3) {
      return data;
    }

    // Rule 3: For phone numbers with 10 or more digits
    if (dataType === 'phone' && data.length >= 10) {
      // Show first 4 digits, mask digits 4, 5, 6 (positions 3, 4, 5 in 0-based index), show last 3 digits
      const firstPart = data.slice(0, 4); // First 4 digits
      const lastPart = data.slice(-3); // Last 3 digits
      const middlePart = data.slice(4, -3); // Everything between first 4 and last 3

      // Mask only positions 4, 5, 6 (which are indices 3, 4, 5 in the middle part after first 4)
      let maskedMiddle = '';
      for (let i = 0; i < middlePart.length; i++) {
        if (i === 0 || i === 1 || i === 2) {
          // Positions 4, 5, 6 relative to original string
          maskedMiddle += '*';
        } else {
          maskedMiddle += middlePart[i];
        }
      }

      return firstPart + maskedMiddle + lastPart;
    }

    // Default behavior for other cases (less than 10 digits, more than 3)
    if (data.length <= 3) {
      return '*'.repeat(data.length);
    }

    const maskedPart = '*'.repeat(data.length - 3);
    const visiblePart = data.slice(-3);

    return maskedPart + visiblePart;
  }
}
