import { Component, OnInit } from "@angular/core";
import { Category, CategoryService } from "../core/services/category.service";
import { HttpErrorResponse } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-category',
    imports: [CommonModule, FormsModule], 
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

  constructor(private readonly categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe(categories => {
      this.categories = categories;
    });
  }

  createCategory(): void {
    if (!this.newCategory.name) return;

    this.categoryService.create(this.newCategory).subscribe({
      next: () => {
        this.loadCategories();
        this.newCategory = {
          name: '',
          color: this.colorPalette[0]
        };
      },
      error: (error: HttpErrorResponse) => {
        alert(this.extractErrorMessage(error, 'Fehler beim Erstellen der Kategorie'));
      }
    });
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
          alert(this.extractErrorMessage(error, 'Fehler beim Aktualisieren'));
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingCategory = null;
  }

  deleteCategory(id: string): void {
    if (confirm('Kategorie wirklich löschen?')) {
      this.categoryService.delete(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (error: HttpErrorResponse) => {
          alert(this.extractErrorMessage(error, 'Fehler beim Löschen'));
        }
      });
    }
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
}
