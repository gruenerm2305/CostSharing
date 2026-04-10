import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { Receipt, ReceiptService } from "../../core/services/receipt.service";
import { Router, RouterLink } from "@angular/router";
import { SplittingService } from "../../core/services/splitting.service";
import { CommonModule, CurrencyPipe, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslationService } from "../../core/i18n/translation.service";

@Component({
    selector: 'app-receipt-list',
  imports: [RouterLink, CommonModule, CurrencyPipe, DatePipe, FormsModule, TranslatePipe],
    templateUrl: './receipt-list.html',
    styleUrl: './receipt-list.scss'
})
export class ReceiptListComponent implements OnInit {
  receipts: Receipt[] = [];
  filteredReceipts: Receipt[] = [];
  searchTerm = '';
  loading = false;
  backendUnreachable = false;

  constructor(
    private readonly receiptService: ReceiptService,
    private readonly splittingService: SplittingService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadReceipts();
  }

  loadReceipts(): void {
    this.loading = true;
    this.backendUnreachable = false;
    this.receiptService.getAll().subscribe({
      next: (receipts) => {
        this.receipts = receipts;
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading receipts', err);
        // Check if it is a connection error (status 0) or server error (500+)
        if (err.status === 0 || err.status >= 500) {
           this.backendUnreachable = true;
        }
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredReceipts = [...this.receipts];
      return;
    }

    this.filteredReceipts = this.receipts.filter((receipt) => {
      return (
        receipt.merchant.toLowerCase().includes(term) ||
        receipt.date.toLowerCase().includes(term)
      );
    });
  }

  editReceipt(receipt: any): void {
    if (receipt.shareToken) {
      this.router.navigate(['receipt/splitting/shared/', receipt.shareToken]);
      return;
    }
    if (receipt.isShared || receipt.isParticipant) {
      this.router.navigate(['/receipts', receipt.id, 'split']);
      return;
    }
    
    if (this.isEditDisabled(receipt)) {
        return;
    }
    this.router.navigate(['/receipts', receipt.id, 'editor']);
  }

  openCostSplitting(id: string): void {
    this.router.navigate(['/receipts', id, 'split']);
  }

  isEditDisabled(receipt: any): boolean {
    return !!(receipt.isShared || receipt.isParticipant);
  }

  getEditTooltip(receipt: any): string {
    if (receipt.isParticipant) {
      return this.translationService.translate('receipts.tooltips.sharedByOther');
    }
    if (receipt.isShared) {
      return this.translationService.translate('receipts.tooltips.makePrivateToEdit');
    }
    return this.translationService.translate('receipts.tooltips.editReceipt');
  }

  getShareTooltip(receipt: any): string {
      if (receipt.isParticipant) return this.translationService.translate('receipts.tooltips.participantCantShare');
      return this.translationService.translate('receipts.tooltips.shareCosts');
  }

  revokeShare(receipt: any): void {
    if (!confirm(
      `${this.translationService.translate('receipts.confirmations.makePrivatePrefix')} "${receipt.merchant}" ${this.translationService.translate('receipts.confirmations.makePrivateSuffix')}`
    )) {
      return;
    }

    this.splittingService.revokeShare(receipt.id).subscribe({
      next: () => {
        this.loadReceipts();
      },
      error: (err) => {
         console.error(err);
         alert(this.translationService.translate('receipts.errors.revokeShareFailed'));
      }
    });
  }

  leaveReceipt(receipt: any): void {
    if (!confirm(
      `${this.translationService.translate('receipts.confirmations.removeReceiptPrefix')} "${receipt.merchant}" ${this.translationService.translate('receipts.confirmations.removeReceiptSuffix')}`
    )) {
      return;
    }

    this.splittingService.leaveReceipt(receipt.id).subscribe({
      next: () => {
        this.receipts = this.receipts.filter(r => r.id !== receipt.id);
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to leave receipt', err);
        alert(this.translationService.translate('receipts.errors.removeFailed'));
      }
    });
  }
}
