import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { Category, CategoryService } from "../core/services/category.service";
import { HttpErrorResponse } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "../core/i18n/translate.pipe";
import { TranslationService } from "../core/i18n/translation.service";

@Component({
    selector: 'app-category',
  imports: [CommonModule, FormsModule, TranslatePipe], 
    templateUrl: './category.html',
    styleUrl: './category.scss'
})
export class CategoryComponent implements OnInit {
  readonly colorPalette = ['#1a3d32', '#2a2d5a', '#4d3319', '#3d1a4d', '#00affe', '#ff6c95'];
  categories: Category[] = [];
  newCategory = {
    name: '',
    color: this.colorPalette[0]
  };
  editingCategory: Category | null = null;
  errorInCategoryNameDetected = false;
  categoryNameErrorMessage = '';

  constructor(private readonly categoryService: CategoryService,
              private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe(categories => {
      this.categories = categories;
      this.cdr.detectChanges();
    });
  }

  createCategory(): void {
    const categoryName = this.newCategory.name.trim();

    if (categoryName.length === 0) {
      this.setCategoryNameError('categories.validation.nameRequired');
      return;
    }

    this.clearCategoryNameError();
    this.categoryService.create({
      ...this.newCategory,
      name: categoryName
    }).subscribe({
      next: () => {
        this.newCategory = {
          name: '',
          color: this.colorPalette[0]
        };
        this.loadCategories();
        this.clearCategoryNameError();
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.setCategoryNameError(
          this.extractErrorMessage(error, 'categories.errors.createFailed')
        );
      }
    });
  }

  onCategoryNameChange(): void {
    if (this.errorInCategoryNameDetected) {
      this.clearCategoryNameError();
    }
  }

  editCategory(category: Category): void {
    const color = category.color && this.colorPalette.includes(category.color)
      ? category.color
      : this.colorPalette[0];
    this.editingCategory = { ...category, color };
  }

  saveEdit(): void {
    if (this.editingCategory) {
      this.categoryService.update(this.editingCategory.id, {
        name: this.editingCategory.name,
        color: this.editingCategory.color
      }).subscribe({
        next: () => {
          this.loadCategories();
          this.editingCategory = null;
        },
        error: (error: HttpErrorResponse) => {
          alert(this.extractErrorMessage(error,'categories.errors.updateFailed'));
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingCategory = null;
  }

  deleteCategory(id: string): void {
    this.categoryService.delete(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (error: HttpErrorResponse) => {
          alert(this.extractErrorMessage(error, 'categories.errors.deleteFailed'));
        }
    });
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(', ');
    }

    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      return backendMessage;
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    return fallback;
  }

  private setCategoryNameError(message: string): void {
    this.errorInCategoryNameDetected = true;
    this.categoryNameErrorMessage = message;
    this.cdr.detectChanges();
  }

  private clearCategoryNameError(): void {
    this.errorInCategoryNameDetected = false;
    this.categoryNameErrorMessage = '';
  }
}
