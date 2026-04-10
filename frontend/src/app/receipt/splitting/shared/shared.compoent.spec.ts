import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Subject, of } from 'rxjs';

import { SharedReceiptComponent } from './shared.component';
import { ReceiptService, Receipt } from '../../../core/services/receipt.service';
import { SplittingService } from '../../../core/services/splitting.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { createTranslationServiceMock } from '../../../testing/mockServices/translationService.mock';

describe('SharedReceiptComponent', () => {
	let component: SharedReceiptComponent;
	let fixture: ComponentFixture<SharedReceiptComponent>;
	let mockReceiptService: jasmine.SpyObj<ReceiptService>;
	let mockSplittingService: jasmine.SpyObj<SplittingService>;
	let mockAuthService: jasmine.SpyObj<AuthService>;
	let mockRouter: jasmine.SpyObj<Router>;
	let mockLocation: jasmine.SpyObj<Location>;
	let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;
	let mockTranslationService: jasmine.SpyObj<TranslationService>;
	const routeToken = 'ad7d991b-bd73-468b-94f7-bf6433a0be26';

	const receiptSubject = new Subject<Receipt>();

	const mockReceipt: Receipt = {
		id: 'receipt-123',
		userId: 'owner-1',
		date: '2026-04-10',
		merchant: 'Demo Market',
		items: [
			{
				id: 'item-1',
				name: 'Milk',
				quantity: 2,
				unitPrice: 1.5,
				totalPrice: 3
			},
			{
				id: 'item-2',
				name: 'Bread',
				quantity: 1,
				unitPrice: 2,
				totalPrice: 2
			}
		],
		totalAmount: 5,
		claims: []
	};

	beforeEach(async () => {
		mockReceiptService = jasmine.createSpyObj<ReceiptService>('ReceiptService', ['getSharedReceipt', 'getById']);
		mockSplittingService = jasmine.createSpyObj<SplittingService>('SplittingService', ['getClaims']);
		mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'getCurrentUserId']);
		mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
		mockLocation = jasmine.createSpyObj<Location>('Location', ['back']);
		mockCdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);
		mockTranslationService = createTranslationServiceMock();

		mockAuthService.isAuthenticated.and.returnValue(false);
		mockAuthService.getCurrentUserId.and.returnValue(null);
		mockReceiptService.getSharedReceipt.and.returnValue(receiptSubject.asObservable());
		mockSplittingService.getClaims.and.returnValue(of([]));

		await TestBed.configureTestingModule({
			imports: [SharedReceiptComponent],
			providers: [
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: convertToParamMap({ shareToken: routeToken })
						}
					}
				},
				{ provide: ReceiptService, useValue: mockReceiptService },
				{ provide: SplittingService, useValue: mockSplittingService },
				{ provide: AuthService, useValue: mockAuthService },
				{ provide: Router, useValue: mockRouter },
				{ provide: Location, useValue: mockLocation },
				{ provide: ChangeDetectorRef, useValue: mockCdr },
				{ provide: TranslationService, useValue: mockTranslationService }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(SharedReceiptComponent);
		component = fixture.componentInstance;
	});

	it('loads the shared receipt using the share token from the URL and renders the items', () => {
		component.loadSharedReceipt();

		expect(mockReceiptService.getSharedReceipt).toHaveBeenCalledWith(routeToken);
		expect(component.loading).toBeTrue();

		receiptSubject.next(mockReceipt);
		receiptSubject.complete();
		fixture.detectChanges();

		expect(component.receipt).toEqual(mockReceipt);
		expect(component.loading).toBeFalse();

		const renderedItems = fixture.nativeElement.querySelectorAll('.item-row');
		expect(renderedItems.length).toBe(2);
		expect(fixture.nativeElement.textContent).toContain('Demo Market');
		expect(fixture.nativeElement.textContent).toContain('Milk');
		expect(fixture.nativeElement.textContent).toContain('Bread');
	});
});
