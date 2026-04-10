import { Router, ActivatedRoute } from '@angular/router';
import { Receipt, ReceiptService } from '../../core/services/receipt.service';
import { ReceiptListComponent } from './receipt-list.component';
import { TranslationService } from '../../core/i18n/translation.service';
import { SplittingService } from '../../core/services/splitting.service';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { mock } from 'node:test';
import { of } from 'rxjs';
import { create } from 'node:domain';
import { createTranslationServiceMock } from '../../testing/mockServices/translationService.mock';

const initialReceipts: Receipt[] = [
  {
    id: "uuid-001",
    userId: "user-123",
    date: "2026-04-10",
    merchant: "Green Grocery Market",
    totalAmount: 14.5,
    items: [
      {
        name: "Organic Bananas",
        quantity: 1,
        unitPrice: 4.5,
        totalPrice: 4.5
      },
      {
        name: "Almond Milk",
        quantity: 2,
        unitPrice: 5,
        totalPrice: 10
      }
    ]
  },
  {
    id: "uuid-002",
    userId: "user-123",
    date: "2026-04-11",
    merchant: "Downtown Bistro",
    totalAmount: 22,
    items: [
      {
        name: "Avocado Toast",
        quantity: 1,
        unitPrice: 18,
        totalPrice: 18
      },
      {
        name: "Espresso",
        quantity: 1,
        unitPrice: 4,
        totalPrice: 4
      }
    ]
  }
];

describe('receipt-list.component', () => {
    let component: ReceiptListComponent;
    let fixture: ComponentFixture<ReceiptListComponent>;

    let mockReceiptService: jasmine.SpyObj<ReceiptService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
    let mockTranslationService: jasmine.SpyObj<TranslationService>;
    let mockSplittingService: jasmine.SpyObj<SplittingService>;
    let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;


    beforeEach(async () => {
        mockReceiptService = jasmine.createSpyObj<ReceiptService>('ReceiptService', ['getAll']);
        mockReceiptService.getAll.and.returnValue(of(initialReceipts));
        mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
        mockActivatedRoute = jasmine.createSpyObj<ActivatedRoute>('ActivatedRoute', ['snapshot']);
        mockTranslationService = createTranslationServiceMock();
        mockSplittingService = jasmine.createSpyObj<SplittingService>('SplittingService',['revokeShare','leaveReceipt'] );
        mockChangeDetectorRef = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);

        await TestBed.configureTestingModule({
            imports: [ReceiptListComponent],
            providers: [
                { provide: ReceiptService, useValue: mockReceiptService },
                { provide: Router, useValue: mockRouter },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: TranslationService, useValue: mockTranslationService },
                { provide: SplittingService, useValue: mockSplittingService },
                { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ReceiptListComponent);
        component = fixture.componentInstance;
    });

    it('test component loading', () => {
        component.ngOnInit();
        fixture.detectChanges();
        expect(component.receipts).toEqual(initialReceipts);
        expect(component.filteredReceipts).toEqual(initialReceipts);
        expect(component.loading).toBeFalse();
    });
    it('should filter receipts based on search term', () => {
        component.receipts = initialReceipts;
        component.searchTerm = 'Green';
        component.applyFilters();
        expect(component.filteredReceipts.length).toBe(1);
        expect(component.filteredReceipts[0].merchant).toBe('Green Grocery Market');
    });
});
