import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { ReceiptService } from '../core/services/receipt.service';
import { CategoryService } from '../core/services/category.service';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';

describe('home.component', () => {
    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    let mockReceiptService: jasmine.SpyObj<ReceiptService>;
    let mockCategoryService: jasmine.SpyObj<CategoryService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

    beforeEach(async () => {
        mockReceiptService = jasmine.createSpyObj('ReceiptService', ['getAll']);
        mockCategoryService = jasmine.createSpyObj('CategoryService', ['getAll']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
        mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

        await TestBed.configureTestingModule({
            imports: [HomeComponent],
            providers: [
                { provide: ReceiptService, useValue: mockReceiptService },
                { provide: CategoryService, useValue: mockCategoryService },
                { provide: Router, useValue: mockRouter },
                { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({}),
                            queryParamMap: convertToParamMap({})
                        }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
    });

    describe('data loading amd html displaying', () => {
        it('should load receipts and categories on init and render values in HTML', () => {
            const mockReceipts = [
                { id: '1', merchant: 'Shop A', myTotal: 10, totalAmount: 10, date: '2026-01-01' },
                { id: '2', merchant: 'Shop B', myTotal: 20, totalAmount: 20, date: '2026-01-02' },
                { id: '3', merchant: 'Shop C', myTotal: 20, totalAmount: 20, date: '2026-01-03' },
                { id: '4', merchant: 'Shop D', myTotal: 20, totalAmount: 20, date: '2026-01-04' },
                { id: '5', merchant: 'Shop E', myTotal: 20, totalAmount: 20, date: '2026-01-05' },
                { id: '6', merchant: 'Shop F', myTotal: 20, totalAmount: 20, date: '2026-01-06' }
            ] as any;
            const mockCategories = [{ id: '1', name: 'Food' }] as any;

            mockReceiptService.getAll.and.returnValue(of(mockReceipts));
            mockCategoryService.getAll.and.returnValue(of(mockCategories));

            fixture.detectChanges();

            expect(component.receipts.length).toBe(6);
            expect(component.recentReceipts.length).toBe(5);
            expect(component.categories).toEqual(mockCategories);

            const element: HTMLElement = fixture.nativeElement;
            const statElements = Array.from(element.querySelectorAll('.stats-grid .stat'));
            expect(statElements[0]?.textContent?.trim()).toBe('6');
            expect(statElements[1]?.textContent?.trim()).toBe('1');

            const heroValue = element.querySelector('.hero-value')?.textContent ?? '';
            expect(heroValue).toContain('110');

            const recentRows = element.querySelectorAll('.receipt-row');
            expect(recentRows.length).toBe(5);
            expect(element.textContent).toContain('Shop A');
            expect(element.textContent).not.toContain('Shop F');
        });
    });
});
