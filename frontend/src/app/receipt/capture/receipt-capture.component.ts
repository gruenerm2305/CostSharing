import { Component, ElementRef, ViewChild } from "@angular/core";
import { ReceiptService } from "../../core/services/receipt.service";
import { Router, RouterLink, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-receipt-capture',
    imports: [CommonModule, RouterLink],
    templateUrl: './receipt-capture.html',
    styleUrl: './receipt-capture.scss',
})
export class ReceiptCaptureComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isDragging = false;
  uploading = false;
  error: string | null = null;

  constructor(
    private readonly receiptService: ReceiptService,
    private readonly router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  processFile(file: File): void {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.error = 'Nur JPG, PNG und PDF Dateien sind erlaubt.';
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'Datei ist zu groß. Maximum 10MB.';
      return;
    }

    this.selectedFile = file;
    this.error = null;

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.previewUrl = null;
    }
  }

  uploadReceipt(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.error = null;

    this.receiptService.uploadReceipt(this.selectedFile).subscribe({
      next: (receipt) => {
        console.log('Receipt uploaded successfully:', receipt);
        
        if (!receipt?.id) {
          this.error = 'Ungültige Antwort vom Server. Bitte versuche es erneut.';
          this.uploading = false;
          return;
        }

        // Navigate to editor for review/editing
        this.router.navigate(['/receipts', receipt.id, 'edit']).then(
          () => {
            console.log('Navigation to editor successful');
          },
          (err) => {
            console.error('Navigation error:', err);
            this.error = 'Navigation fehlgeschlagen. Bitte versuche es manuell.';
            this.uploading = false;
          }
        );
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.error = err.error?.message || 'Upload fehlgeschlagen. Bitte versuche es erneut.';
        this.uploading = false;
      }
    });
  }

  cancelSelection(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.error = null;
    
    // Reset file inputs
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    if (this.cameraInput) {
      this.cameraInput.nativeElement.value = '';
    }
  }
}