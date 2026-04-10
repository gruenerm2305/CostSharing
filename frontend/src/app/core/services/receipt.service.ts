import { Observable } from "rxjs";
import { environment } from '../../../environments/environment';
import { HttpClient, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";

export interface Receipt {
  id: string;
  userId: string;
  date: string;
  merchant: string;
  categoryId?: string;
  items: ReceiptItem[];
  totalAmount: number;
  confidence?: number;
  validationErrors?: string[];
  imageUrl?: string;
  sharedWith?: string[];
  myTotal?: number;
  isParticipant?: boolean;
  showMyTotal?: boolean;
  isShared?: boolean;
  hasAnyClaims?: boolean;
  shareToken?: string;
  claims?: any[];
}

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

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private readonly apiUrl = `${environment.apiUrl}/receipts`;

  constructor(private readonly http: HttpClient) {}

  getStatistics(startDate?: string, endDate?: string): Observable<any> {
    let params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<any>(`${this.apiUrl}/statistics`, { params });
  }

  uploadReceipt(file: File): Observable<Receipt> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Receipt>(`${this.apiUrl}/upload`, formData);
  }

  createManual(receipt: {
    date: string;
    merchant: string;
    categoryId?: string;
    totalAmount: number;
    items: ReceiptItem[];
  }): Observable<Receipt> {
    return this.http.post<Receipt>(`${this.apiUrl}/manual`, receipt);
  }

  getAll(): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(this.apiUrl);
  }

  getById(id: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/${id}`);
  }

  update(id: string, data: Partial<Receipt>): Observable<Receipt> {
    return this.http.patch<Receipt>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getSharedReceipt(shareToken: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${environment.apiUrl}/share/${shareToken}`);
  }

  getShareLink(id: string): Observable<{ shareToken: string; shareUrl: string }> {
    return this.http.get<{ shareToken: string; shareUrl: string }>(`${this.apiUrl}/${id}/share-link`);
  }

  exportReceipts(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/export`, {
      observe: 'response',
      responseType: 'blob',
    });
  }
}