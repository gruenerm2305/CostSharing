import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';

import { CostSplittingComponent } from './spliting.component';
import { ReceiptService } from '../../../core/services/receipt.service';
import { SplittingService } from '../../../core/services/splitting.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { createTranslationServiceMock } from '../../../testing/mockServices/translationService.mock';
import { mock } from 'node:test';

describe('CostSplittingComponent - loadReceipt', () => {
  let component: CostSplittingComponent;
  let fixture: ComponentFixture<CostSplittingComponent>;
  let mockReceiptService: jasmine.SpyObj<ReceiptService>;
  let mockSplittingService: jasmine.SpyObj<SplittingService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;
  const routeReceiptId = 'test-receipt-id';

  const mockReceipt = {
        id: routeReceiptId,
        userId: 'owner-id',
        date: '2026-01-01',
        merchant: 'Test Merchant',
        items: [],
        totalAmount: 0
      } as any;


  beforeEach(async () => {
    mockReceiptService = jasmine.createSpyObj('ReceiptService', ['getById', 'getShareLink']);
    mockSplittingService = jasmine.createSpyObj('SplittingService', ['revokeShare']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);
    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
    mockTranslationService = createTranslationServiceMock();
    
    await TestBed.configureTestingModule({
      imports: [CostSplittingComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return {
                paramMap: {
                  get: () => routeReceiptId,
                },
              } as unknown as ActivatedRoute['snapshot'];
            },
          },
        },
        { provide: ReceiptService, useValue: mockReceiptService },
        { provide: SplittingService, useValue: mockSplittingService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ChangeDetectorRef, useValue: mockCdr },
        { provide: TranslationService, useValue: mockTranslationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CostSplittingComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit - loadReceipt with getById', () => {
    it('should call getById with the correct id from route params', () => {
      mockReceiptService.getById.and.returnValue(of(mockReceipt));

      component.ngOnInit();

      expect(mockReceiptService.getById).toHaveBeenCalledWith(routeReceiptId);
      expect(mockReceiptService.getById).toHaveBeenCalledTimes(1);
    });
  });
  describe('requesting share link - getShareLink', () => {
    it('should call getShareLink with the correct id and show the link', () => {
      const mockShareLink = { shareToken: 'test-token', shareUrl: 'http://example.com/share/test-token' };
      mockReceiptService.getShareLink.and.returnValue(of(mockShareLink));
      mockSplittingService.revokeShare.and.returnValue(of("Success: True"));
      mockReceiptService.getById.and.returnValue(of(mockReceipt));
      component.ngOnInit();
      component.getShareLink();
      expect(mockReceiptService.getShareLink).toHaveBeenCalledWith(routeReceiptId);
      component.revokeShare();
      expect(mockSplittingService.revokeShare).toHaveBeenCalledWith(routeReceiptId);
    });
  });
});