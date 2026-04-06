import { Injectable, Logger } from '@nestjs/common';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptItem } from '../receipts/entities/receipt-item.entity';

export enum ValidationErrorType {
  SUM_MISMATCH = 'sum_mismatch',
  MISSING_FIELDS = 'missing_fields',
  INVALID_DATE = 'invalid_date',
  INVALID_AMOUNT = 'invalid_amount',
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorType[];
  suggestions?: Array<{
    field: string;
    suggestedValue: any;
    reason: string;
  }>;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  validateReceipt(receipt: Partial<Receipt>, items: ReceiptItem[]): ValidationResult {
    const errors: ValidationErrorType[] = [];
    const suggestions = [];

    if (!receipt.date) {
      errors.push(ValidationErrorType.MISSING_FIELDS);
    }

    if (!receipt.merchant) {
      errors.push(ValidationErrorType.MISSING_FIELDS);
    }

    if (receipt.date) {
      const receiptDate = new Date(receipt.date);
      const now = new Date();
      
      if (receiptDate > now) {
        errors.push(ValidationErrorType.INVALID_DATE);
        suggestions.push({
          field: 'date',
          suggestedValue: now.toISOString().split('T')[0],
          reason: 'Receipt date cannot be in the future',
        });
      }
    }

    if (items && items.length > 0 && receipt.totalAmount) {
      const calculatedTotal = this.calculateItemsTotal(items);
      const tolerance = 0.02;

      if (Math.abs(calculatedTotal - Number(receipt.totalAmount)) > tolerance) {
        errors.push(ValidationErrorType.SUM_MISMATCH);
        suggestions.push({
          field: 'totalAmount',
          suggestedValue: calculatedTotal.toFixed(2),
          reason: `Calculated total (${calculatedTotal.toFixed(2)}) does not match stated total (${receipt.totalAmount})`,
        });
      }
    }

    if (items) {
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const calculatedItemTotal = Number(item.quantity) * Number(item.unitPrice);
        const tolerance = 0.02;

        if (Math.abs(calculatedItemTotal - Number(item.totalPrice)) > tolerance) {
          errors.push(ValidationErrorType.INVALID_AMOUNT);
          suggestions.push({
            field: `items[${index}].totalPrice`,
            suggestedValue: calculatedItemTotal.toFixed(2),
            reason: `Item '${item.name}': ${item.quantity} × ${item.unitPrice} = ${calculatedItemTotal.toFixed(2)}, not ${item.totalPrice}`,
          });
        }
      }
    }

    if (receipt.totalAmount && Number(receipt.totalAmount) <= 0) {
      errors.push(ValidationErrorType.INVALID_AMOUNT);
    }

    if (items) {
      for (const item of items) {
        if (Number(item.totalPrice) < 0 || Number(item.unitPrice) < 0 || Number(item.quantity) <= 0) {
          errors.push(ValidationErrorType.INVALID_AMOUNT);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: [...new Set(errors)],
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  private calculateItemsTotal(items: ReceiptItem[]): number {
    return items.reduce((sum, item) => {
      return sum + Number(item.totalPrice);
    }, 0);
  }

  autoCorrect(receipt: Partial<Receipt>, items: ReceiptItem[]): {
    receipt: Partial<Receipt>;
    items: ReceiptItem[];
    correctionsMade: string[];
  } {
    const correctionsMade: string[] = [];
    const correctedItems = items.map((item) => {
      const calculatedTotal = Number(item.quantity) * Number(item.unitPrice);
      
      if (Math.abs(calculatedTotal - Number(item.totalPrice)) > 0.02) {
        correctionsMade.push(
          `Corrected ${item.name}: ${item.totalPrice} → ${calculatedTotal.toFixed(2)}`
        );
        return {
          ...item,
          totalPrice: calculatedTotal,
        };
      }
      
      return item;
    });

    // Recalculate total
    const calculatedTotal = this.calculateItemsTotal(correctedItems);
    
    if (receipt.totalAmount && Math.abs(calculatedTotal - Number(receipt.totalAmount)) > 0.02) {
      correctionsMade.push(
        `Corrected total: ${receipt.totalAmount} → ${calculatedTotal.toFixed(2)}`
      );
      receipt.totalAmount = calculatedTotal;
    }

    return {
      receipt,
      items: correctedItems,
      correctionsMade,
    };
  }
}
