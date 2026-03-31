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

// ==================== Receipt Related Interfaces ====================

export interface ReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId?: string;
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
