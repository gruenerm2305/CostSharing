import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { TranslationService } from '../../core/i18n/translation.service';
import { CategoryService } from '../../core/services/category.service';
import { Receipt, ReceiptService } from '../../core/services/receipt.service';
import { ReceiptEditorComponent } from './receipt-editor.component';
import { createTranslationServiceMock } from '../../testing/mockServices/translationService.mock';

describe('receipt-editor.component', () => {
    let component: ReceiptEditorComponent;
    let fixture: ComponentFixture<ReceiptEditorComponent>;

    let mockReceiptService: jasmine.SpyObj<ReceiptService>;
    let mockCategoryService: jasmine.SpyObj<CategoryService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockLocation: jasmine.SpyObj<Location>;
    let mockTranslationService: jasmine.SpyObj<TranslationService>;
    let routeReceiptId: string | null;

    const initialReceipt: Receipt = {
        id: "rcpt_789456",
        userId: "user_01",
        date: "2026-04-10T10:00:00Z",
        merchant: "Tech Gear Solutions",
        totalAmount: 145.5,
        items: [
            {
            name: "USB-C Docking Station",
            quantity: 1,
            unitPrice: 145.5,
            totalPrice: 145.5
             }
         ]
    };


    beforeEach(async () => {
        routeReceiptId = initialReceipt.id;

        mockReceiptService = jasmine.createSpyObj<ReceiptService>('ReceiptService', [
            'getById',
            'update',
            'createManual',
            'delete',
        ]);
        mockCategoryService = jasmine.createSpyObj<CategoryService>('CategoryService', ['getAll']);
        mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
        mockLocation = jasmine.createSpyObj<Location>('Location', ['back']);
        mockTranslationService = createTranslationServiceMock();

        mockCategoryService.getAll.and.returnValue(of([]));
        mockReceiptService.getById.and.returnValue(of(initialReceipt));

        await TestBed.configureTestingModule({
            imports: [ReceiptEditorComponent],
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
                { provide: CategoryService, useValue: mockCategoryService },
                { provide: Router, useValue: mockRouter },
                { provide: Location, useValue: mockLocation },
                { provide: TranslationService, useValue: mockTranslationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ReceiptEditorComponent);
        
    });

    it('should correctly load the receipt', () => {
        component = fixture.componentInstance;
        component.ngOnInit();
        fixture.detectChanges();
        expect(component.receipt).not.toBeNull();
        expect(component.receipt?.items.length).toBe(1);
    });
    it('adding an item should update the form and total', () => {
        component = fixture.componentInstance;
        component.ngOnInit();
        fixture.detectChanges();
        const initialTotal = component.calculateItemsTotal();
        component.addItem();
        fixture.detectChanges();
        expect(component.items.length).toBe(2);
        expect(component.calculateItemsTotal()).toBe(initialTotal);

        const newItem = component.items.at(1);
        newItem.get('name')?.setValue('Wireless Mouse');
        const addedQuantity = 2;
        const addedPrice = 25;
        newItem.get('quantity')?.setValue(addedQuantity);
        newItem.get('unitPrice')?.setValue(addedPrice);
        component.recalculateItemTotal(1);
        fixture.detectChanges();
        expect(component.calculateItemsTotal()).toBe(initialTotal + addedPrice*addedQuantity);
    });

});
    