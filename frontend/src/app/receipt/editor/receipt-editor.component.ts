import { Component, OnInit } from "@angular/core";
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Receipt, ReceiptItem, ReceiptService } from "../../core/services/recipt.service";
import { Category, CategoryService } from "../../core/services/category.service";
import { CommonModule } from "@angular/common";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-receipt-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './receipt-editor.html',
  styleUrl: './receipt-editor.scss',
})
export class ReceiptEditorComponent implements OnInit {
  receiptForm!: FormGroup;
  receipt: Receipt | null = null;
  categories: Category[] = [];
  loading = false;
  saving = false;
  isReadOnly = false;
  submitAttempted = false;
  formError: string | null = null;
  displayedColumns: string[] = ['name', 'quantity', 'unitPrice', 'totalPrice', 'actions'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly receiptService: ReceiptService,
    private readonly categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadReceipt();
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe(categories => {
      this.categories = categories;
    });
  }

  loadReceipt(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading = true;
      this.receiptService.getById(id).subscribe({
        next: (receipt) => {
          console.log('Receipt loaded:', receipt);
          
          if (!receipt) {
            alert('Beleg nicht gefunden');
            this.router.navigate(['/receipts']);
            this.loading = false;
            return;
          }

          this.receipt = receipt;
          
          // Check if receipt is read-only (shared with claims)
          this.isReadOnly = receipt.isParticipant === true || 
                           (receipt.hasAnyClaims === true) || 
                           (receipt.isShared === true && receipt.myTotal !== undefined && receipt.myTotal > 0);
          
          // Initialize form with receipt data
          this.initForm(receipt);
          
          // Disable form if read-only
          if (this.isReadOnly) {
            this.receiptForm.disable();
          }
          
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading receipt:', err);
          this.loading = false;
          alert('Beleg konnte nicht geladen werden: ' + (err.error?.message || err.message));
          this.router.navigate(['/receipts']);
        }
      });
    } else {
      // Creation mode
      this.initForm();
    }
  }

  initForm(receipt?: Receipt): void {
    // Ensure items array exists and log for debugging
    const items = receipt?.items && Array.isArray(receipt.items) && receipt.items.length > 0 
      ? receipt.items 
      : [];
    
    console.log('Initializing form with receipt:', receipt);
    console.log('Items array:', items);
    console.log('Items count:', items.length);

    this.receiptForm = this.fb.group({
      date: [this.parseDateValue(receipt?.date), Validators.required],
      merchant: [receipt?.merchant || '', Validators.required],
      categoryId: [receipt?.categoryId || ''],
      items: this.fb.array(
        items.map(item => {
          console.log('Creating form group for item:', item);
          return this.createItemFormGroup(item);
        })
      )
    });

    // Force initial validity/value propagation so Material inputs render values immediately
    this.receiptForm.updateValueAndValidity({ emitEvent: false });

    console.log('Form initialized. Items FormArray length:', this.items.length);

    // If no items were provided, add one empty item for user to fill in
    if (this.items.length === 0) {
      console.log('No items in receipt, adding empty item');
      this.items.push(this.createItemFormGroup());
    }
    
    console.log('Final items count:', this.items.length);
  }

  createItemFormGroup(item?: ReceiptItem): FormGroup {
    const itemGroup = this.fb.group({
      id: [item?.id || null],
      name: [item?.name || '', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(0.001)]],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      totalPrice: [item?.totalPrice || 0, [Validators.required, Validators.min(0)]],
      confidence: [item?.confidence || 1],
      needsReview: [item?.needsReview || false]
    });
    
    // Subscribe to quantity and unitPrice changes to auto-calculate totalPrice
    const recalculate = () => {
      const quantity = itemGroup.get('quantity')?.value || 0;
      const unitPrice = itemGroup.get('unitPrice')?.value || 0;
      const total = quantity * unitPrice;
      itemGroup.patchValue({ totalPrice: Number(total.toFixed(2)) }, { emitEvent: false });
    };

    itemGroup.get('quantity')?.valueChanges.subscribe(() => recalculate());
    itemGroup.get('unitPrice')?.valueChanges.subscribe(() => recalculate());
    // Initialize computed total immediately so values are visible on first render
    recalculate();
    
    console.log('Created item form group:', itemGroup.value);
    return itemGroup;
  }

  get items(): FormArray {
    return this.receiptForm.get('items') as FormArray;
  }

  addItem(): void {
    this.items.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    if (confirm('Artikel wirklich löschen?')) {
      this.items.removeAt(index);
    }
  }

  recalculateItemTotal(index: number): void {
    const item = this.items.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const total = quantity * unitPrice;
    item.patchValue({ totalPrice: Number(total.toFixed(2)) });
  }

  calculateItemsTotal(): number {
    return this.items.controls.reduce((sum, item) => {
      return sum + (item.get('totalPrice')?.value || 0);
    }, 0);
  }

  hasValidationError(field: string): boolean {
    return this.receipt?.validationErrors?.includes(field) || false;
  }

  hasItemValidationError(index: number): boolean {
    const item = this.items.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const totalPrice = item.get('totalPrice')?.value || 0;
    const calculated = quantity * unitPrice;
    return Math.abs(calculated - totalPrice) > 0.02;
  }

  getItemNeedsReview(index: number): boolean {
    return this.items.at(index).get('needsReview')?.value || false;
  }

  getItemConfidence(index: number): number {
    return this.items.at(index).get('confidence')?.value || 1;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.receiptForm?.get(fieldName);
    return !!control && control.invalid && (control.touched || this.submitAttempted);
  }

  isItemFieldInvalid(index: number, fieldName: string): boolean {
    const control = this.items.at(index)?.get(fieldName);
    return !!control && control.invalid && (control.touched || this.submitAttempted);
  }

  parseDateValue(dateValue?: string): Date {
    if (!dateValue) {
      return new Date();
    }

    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  formatDateForApi(dateValue: Date | string): string {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  saveReceipt(): void {
    if (this.isReadOnly) {
      alert('Dieser Beleg kann nicht bearbeitet werden, da er bereits geteilt wurde.');
      return;
    }

    if (!this.receiptForm.valid) {
      this.submitAttempted = true;
      this.receiptForm.markAllAsTouched();

      const missingItemNameIndex = this.items.controls.findIndex((item) => {
        const name = item.get('name')?.value;
        return !name || String(name).trim().length === 0;
      });

      if (missingItemNameIndex >= 0) {
        this.formError = `Artikelname fehlt bei Position ${missingItemNameIndex + 1}.`;
      } else {
        this.formError = 'Bitte alle Pflichtfelder ausfullen.';
      }
      return;
    }

    this.submitAttempted = false;
    this.formError = null;

    this.saving = true;

    const formValue = this.receiptForm.value;
    
    // Automatisch berechnete Gesamtsumme aus allen Artikeln
    const calculatedTotal = this.calculateItemsTotal();
    
    // Clean up items - remove confidence and needsReview, ensure numbers are actually numbers
    const cleanedItems = formValue.items.map((item: any) => ({
      id: item.id || undefined,
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice)
    }));
    
    const baseData = {
      date: this.formatDateForApi(formValue.date),
      merchant: formValue.merchant,
      categoryId: formValue.categoryId || undefined,
      totalAmount: Number(calculatedTotal),
      items: cleanedItems
    };
    
    console.log('Saving receipt data:', baseData);
    
    if (this.receipt) {
      this.receiptService.update(this.receipt.id, baseData).subscribe({
        next: (updated) => {
          console.log('Receipt updated successfully:', updated);
          this.router.navigate(['/receipts']);
        },
        error: (err) => {
          console.error('Error saving receipt:', err);
          alert('Fehler beim Speichern: ' + (err.error?.message || err.message));
          this.saving = false;
        }
      });
    } else {
      // Create manual receipt - backend sets status to VALIDATED automatically
      // CreateReceiptDto does not allow 'status' property
      this.receiptService.createManual(baseData).subscribe({
        next: (created) => {
          console.log('Receipt created successfully:', created);
          alert('Beleg erfolgreich erstellt!');
          this.router.navigate(['/receipts']);
        },
        error: (err) => {
          console.error('Error creating receipt:', err);
          alert('Fehler beim Erstellen: ' + (err.error?.message || err.message));
          this.saving = false;
        }
      });
    }
  }

  deleteReceipt(): void {
    if (this.receipt && confirm('Beleg wirklich löschen?')) {
      this.receiptService.delete(this.receipt.id).subscribe({
        next: () => {
          alert('Beleg gelöscht');
          this.router.navigate(['/receipts']);
        },
        error: () => {
          alert('Fehler beim Löschen');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/receipts']);
  }
}