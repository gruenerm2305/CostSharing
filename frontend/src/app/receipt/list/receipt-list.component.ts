import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { Receipt, ReceiptService } from "../../core/services/receipt.service";
import { Router } from "@angular/router";
import { SplittingService } from "../../core/services/splitting.service";
import { CommonModule, CurrencyPipe, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-receipt-list',
    imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
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
    private readonly cdr: ChangeDetectorRef
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
      this.router.navigate(['/share', receipt.shareToken]);
      return;
    }
    if (receipt.isShared || receipt.isParticipant) {
      this.router.navigate(['/receipts', receipt.id, 'split']);
      return;
    }
    
    if (this.isEditDisabled(receipt)) {
        return;
    }
    this.router.navigate(['/receipts', receipt.id, 'edit']);
  }

  openCostSplitting(id: string): void {
    this.router.navigate(['/receipts', id, 'split']);
  }

  isEditDisabled(receipt: any): boolean {
    return !!(receipt.isShared || receipt.isParticipant);
  }

  getEditTooltip(receipt: any): string {
    if (receipt.isParticipant) {
      return 'Der Beleg wurde von einem anderen Nutzer geteilt.';
    }
    if (receipt.isShared) {
      return 'Um den Beleg zu bearbeiten, muss er privat werden.';
    }
    return 'Beleg bearbeiten';
  }

  getShareTooltip(receipt: any): string {
      if (receipt.isParticipant) return 'Teilnehmer können den Beleg nicht weiter teilen.';
      return 'Kosten teilen';
  }

  revokeShare(receipt: any): void {
    if (!confirm(`Möchten Sie den Beleg "${receipt.merchant}" wirklich wieder privat machen? Alle geteilten Kosten und Teilnehmer werden entfernt.`)) {
      return;
    }

    this.splittingService.revokeShare(receipt.id).subscribe({
      next: () => {
        this.loadReceipts();
      },
      error: (err) => {
         console.error(err);
         alert('Fehler beim Zurücksetzen des Belegs.');
      }
    });
  }

  leaveReceipt(receipt: any): void {
    if (!confirm(`Möchten Sie den geteilten Beleg "${receipt.merchant}" wirklich entfernen? Ihre übernommenen Kosten werden freigegeben.`)) {
      return;
    }

    this.splittingService.leaveReceipt(receipt.id).subscribe({
      next: () => {
        this.receipts = this.receipts.filter(r => r.id !== receipt.id);
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to leave receipt', err);
        alert('Fehler beim Entfernen des Belegs.');
      }
    });
  }
}
