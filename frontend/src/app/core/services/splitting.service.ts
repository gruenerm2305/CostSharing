import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemClaim {
  id: string;
  receiptId: string;
  itemId: string;
  claimerUserId: string;
  claimedQuantity: number | null;
  claimedPercentage: number | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SplittingSummary {
  receiptId: string;
  totalAmount: number;
  totalClaimed: number;
  ownerAmount: number;
  participants: Array<{
    userId: string;
    role: string;
    total: number;
    items: Array<{
      itemId: string;
      itemName: string;
      amount: number;
      claimedQuantity: number | null;
      claimedPercentage: number | null;
    }>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class SplittingService {
  private readonly apiUrl = `${environment.apiUrl}/receipts`;

  constructor(private readonly http: HttpClient) {}

  inviteParticipant(receiptId: string, userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${receiptId}/participants`, { userId });
  }

  claimItem(
    receiptId: string,
    itemId: string,
    claimedQuantity?: number,
    claimedPercentage?: number
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${receiptId}/items/${itemId}/claim`, {
      claimedQuantity,
      claimedPercentage,
    });
  }

  getClaims(receiptId: string): Observable<ItemClaim[]> {
    return this.http.get<ItemClaim[]>(`${this.apiUrl}/${receiptId}/claims`);
  }

  getSummary(receiptId: string): Observable<SplittingSummary> {
    return this.http.get<SplittingSummary>(`${this.apiUrl}/${receiptId}/summary`);
  }

  removeClaim(receiptId: string, itemId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${receiptId}/items/${itemId}/claim`);
  }

  revokeShare(receiptId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${receiptId}/share`);
  }
  leaveReceipt(receiptId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${receiptId}/participants/me`);
  }
}
