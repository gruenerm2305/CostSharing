import { ChangeDetectorRef } from "@angular/core";
import { CategoryService } from "../core/services/category.service";
import { TranslationService } from "../core/i18n/translation.service";
import { ComponentFixture } from "@angular/core/testing";
import { CategoryComponent } from "./category.component";
import { createTranslationServiceMock } from "../testing/mockServices/translationService.mock";
import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";

describe('category.component', () => {
    let component: CategoryComponent;
    let fixture: ComponentFixture<CategoryComponent>;

    let mockCategoryService: jasmine.SpyObj<CategoryService>;
    let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;
    let mockTranslationService: jasmine.SpyObj<TranslationService>;

    beforeEach(async () => {
        mockCategoryService = jasmine.createSpyObj('CategoryService', ['getAll', 'create']);
        mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
        mockTranslationService = createTranslationServiceMock();
        mockCategoryService.getAll.and.returnValue(of([]));
        await TestBed.configureTestingModule({
            imports: [CategoryComponent],
            providers: [
                { provide: CategoryService, useValue: mockCategoryService },
                { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
                { provide: TranslationService, useValue: mockTranslationService }
            ]
        }).compileComponents();
    });

    it('should load categories on init and render them in HTML', () => {
        const mockCategories = [
            { id: '1', userId: 'user1', name: 'Category 1', color: '#ff0000' },
            { id: '2', userId: 'user1', name: 'Category 2', color: '#00ff00' }
        ];
        mockCategoryService.getAll.and.returnValue(of(mockCategories));
        fixture = TestBed.createComponent(CategoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.categories).toEqual(mockCategories);

        const categoryRows = fixture.nativeElement.querySelectorAll('.category-row');
        expect(categoryRows.length).toBe(2);

        const renderedText = Array.from(categoryRows)
            .map((row) => (row as HTMLElement).textContent?.trim() ?? '')
            .join(' ');
        expect(renderedText).toContain('Category 1');
        expect(renderedText).toContain('Category 2');

    });
    it('should show error message when creating category with empty name', () => {
        fixture = TestBed.createComponent(CategoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.createCategory();

        expect(component.categoryNameErrorMessage).toBe('categories.validation.nameRequired');
    });

    it('check if category adding works', () => {
        const newCategory = { name: 'New Category', color: '#123456' };
        mockCategoryService.create.and.returnValue(of({ id: '3', userId: 'user1', ...newCategory }));
        fixture = TestBed.createComponent(CategoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.newCategory = newCategory;
        component.createCategory();
        expect(mockCategoryService.create).toHaveBeenCalledWith(newCategory);
    });
});
