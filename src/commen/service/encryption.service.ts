import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.WALLET_TRANSFER_ENC || 'default-key-change-in-production';

        if (!process.env.WALLET_TRANSFER_ENC) {
            console.warn('WALLET_TRANSFER_ENC environment variable is not set. Using default key.');
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
      
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('Failed to decrypt data - invalid key or corrupted data');
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
   * @param visibleChars - Number of characters to show at the end
   * @returns Masked string
   */
  maskData(data: string, visibleChars: number = 3): string {
    if (!data || data.length <= visibleChars) {
      return '*'.repeat(data?.length || 0);
    }
    
    const maskedPart = '*'.repeat(data.length - visibleChars);
    const visiblePart = data.slice(-visibleChars);
    
    return maskedPart + visiblePart;
  }
}