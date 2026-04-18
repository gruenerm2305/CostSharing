/**
 * Shared TypeScript Interfaces and Types
 * Used by both Frontend (Angular) and Backend (NestJS)
 */

// ==================== Enums ====================

export enum ValidationError {
  SUM_MISMATCH = 'sum_mismatch',
  MISSING_FIELDS = 'missing_fields',
  INVALID_DATE = 'invalid_date',
  INVALID_AMOUNT = 'invalid_amount'
}

export enum UserRole {
  Owner = 'Owner',
  Admin = 'Admin',
  User = 'User'
}

// ==================== Receipt Related Interfaces ====================

export interface ReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence?: number; 
  needsReview?: boolean;
}

export interface Receipt {
  id: string;
  userId: string;
  date: Date | string;
  merchant: string;
  items: ReceiptItem[];
  totalAmount: number;
  taxAmount?: number;
  imageUrl?: string;
  rawXml?: string; 
  validationErrors?: ValidationError[];
  confidence?: number; 
  createdAt: Date | string;
  updatedAt: Date | string;
  sharedWith?: string[]; 
}

export interface CreateReceiptDto {
  date?: string;
  merchant?: string;
  items?: ReceiptItem[];
  totalAmount?: number;
  imageFile?: File;
}

export interface UpdateReceiptDto {
  date?: string;
  merchant?: string;
  items?: ReceiptItem[];
  totalAmount?: number;
}

// ==================== Authentication Related Interfaces ====================

export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// ==================== Category Related Interfaces ====================

export interface Category {
  id: string;
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCategoryDto {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  icon?: string;
}

export interface CategoryMappingRequest {
  itemName: string;
  userCategories: Category[];
}

export interface CategoryMappingResult {
  categoryId?: string;
  confidence: number;
  reasoning?: string;
}

// ==================== Validation Related Interfaces ====================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  suggestions?: {
    field: string;
    suggestedValue: any;
    reason: string;
  }[];
}

// ==================== OCR Related Interfaces ====================

export interface OcrResult {
  date?: string;
  merchant?: string;
  items: ReceiptItem[];
  totalAmount?: number;
  taxAmount?: number;
  rawXml: string;
  confidence: number;
  needsReview: boolean;
  extractionErrors?: string[];
}

export interface OcrRequest {
  imageBuffer: ArrayBuffer | string;
  mimeType: string;
}

// ==================== Cost Splitting Related Interfaces ====================

export interface SharedReceiptItem extends ReceiptItem {
  sharedQuantity?: number; // How much of this item is shared
  sharedPercentage?: number; // Percentage (0-100) of this item that is shared
  assignedToUserId?: string;
}

export interface SharedReceipt extends Omit<Receipt, 'items'> {
  items: SharedReceiptItem[];
  ownerId: string;
  participants: ReceiptParticipant[];
}

export interface ReceiptParticipant {
  userId: string;
  userName: string;
  share: number; // Total amount this user owes
  items: {
    itemId: string;
    quantity: number;
    percentage: number;
    amount: number;
  }[];
}

export interface InviteUserDto {
  receiptId: string;
  userEmail: string;
  message?: string;
}

export interface ClaimItemDto {
  receiptId: string;
  itemId: string;
  quantity?: number;
  percentage?: number;
}