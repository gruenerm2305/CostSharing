import { ChangeDetectorRef, Component, Inject, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Receipt, ReceiptService } from "../../../core/services/receipt.service";
import { SplittingService } from "../../../core/services/splitting.service";
import { AuthService } from "../../../core/services/auth.service";
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { TranslationService } from "../../../core/i18n/translation.service";

export class ConfirmationDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { message: string }) {}
}

@Component({
  selector: 'app-splitting',
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './spliting.html',
  styleUrl: './spliting.scss'
})
export class CostSplittingComponent implements OnInit {
  receipt: Receipt | null = null;
  inviteUserId = '';
  inviting = false;
  
  customClaimItem: any = null;
  customPercentage: number = 50;
  customQuantity: number = 1;

  shareUrl: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly receiptService: ReceiptService,
    private readonly splittingService: SplittingService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef,
    private readonly translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadReceipt();
  }

  get isOwner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return !!this.receipt && !!currentUser && this.receipt.userId === currentUser.id;
  }

  revokeShare(): void {
    if (!this.receipt) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { message: this.translationService.translate('splitting.confirmations.makePrivate') }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.splittingService.revokeShare(this.receipt!.id).subscribe({
          next: () => {
            this.snackBar.open(
              this.translationService.translate('splitting.messages.success.madePrivate'),
              this.translationService.translate('common.buttons.ok'),
              { duration: 3000 }
            );
            this.router.navigate(['/receipts', this.receipt!.id, 'edit']);
          },
          error: () => {
            this.snackBar.open(
              this.translationService.translate('splitting.errors.revokeShareFailed'),
              this.translationService.translate('common.buttons.ok'),
              { duration: 3000 }
            );
          }
        });
      }
    });
  }

  loadReceipt(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.receiptService.getById(id).subscribe({
        next: (receipt) => {
          this.receipt = receipt;
          this.cdr.detectChanges();
          // Auto-generate share link if owner to ensure "Privat machen" is visible immediately
          if (this.isOwner && !this.shareUrl) {
            this.getShareLink(false); // pass flag to suppress alerts if desired, or just silent
          }
        },
        error: () => {
            this.snackBar.open(
              this.translationService.translate('splitting.errors.loadReceiptFailed'),
              this.translationService.translate('common.buttons.ok'),
              { duration: 3000 }
            );
          this.router.navigate(['/receipts']);
        }
      });
    }
  }

  getShareLink(showAlert = true): void {
    if (!this.receipt) return;

    this.receiptService.getShareLink(this.receipt.id).subscribe({
      next: (data) => {
        this.shareUrl = data.shareUrl;
        // Update local receipt state to shared so "Privat machen" appears immediately
        if (this.receipt) {
          this.receipt.isShared = true;
        }
      },
      error: () => {
        if (showAlert) {
          this.snackBar.open(
            this.translationService.translate('splitting.errors.shareLinkFailed'),
            this.translationService.translate('common.buttons.ok'),
            { duration: 3000 }
          );
        }
      }
    });
  }

  copyShareLink(): void {
    if (this.shareUrl) {
      this.copyToClipboard(this.shareUrl);
      this.snackBar.open(
        this.translationService.translate('splitting.messages.success.linkCopied'),
        this.translationService.translate('common.buttons.ok'),
        { duration: 2000 }
      );
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Success
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        // eslint-disable-next-line deprecation/deprecation
        document.execCommand('copy');
      } catch {
        // Fallback failed silently
      }
      textArea.remove();
    });
  }

  getQuantityOptions(total: number): number[] {
    const count = Math.floor(total);
    if (count <= 1) return [];
    // Returns [1, 2, ..., count-1]
    return Array.from({ length: count - 1 }, (_, i) => i + 1);
  }

  onQuantitySelect(item: any, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = +select.value;
    if (value) {
      this.claimQuantity(item, value);
      select.value = ''; // Reset dropdown
    }
  }

  claimQuantity(item: any, quantity: number): void {
    if (!this.receipt || !quantity) return;
    
    this.splittingService.claimItem(this.receipt.id, item.id, quantity).subscribe({
      next: () => {
        this.loadReceipt();
        this.snackBar.open(
          `${quantity}/${item.quantity} ${this.translationService.translate('splitting.messages.success.itemClaimedSuffix')}`,
          this.translationService.translate('common.buttons.ok'),
          { duration: 2000 }
        );
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || this.translationService.translate('splitting.errors.claimItemFailed'),
          this.translationService.translate('common.buttons.ok'),
          { duration: 3000 }
        );
      }
    });
  }

  inviteUser(): void {
    if (!this.receipt || !this.inviteUserId) return;
    
    this.inviting = true;
    this.splittingService.inviteParticipant(this.receipt.id, this.inviteUserId).subscribe({
      next: () => {
        this.inviteUserId = '';
        this.inviting = false;
        // reload receipt to show sharedWith
        this.loadReceipt();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || this.translationService.translate('splitting.errors.inviteFailed'),
          this.translationService.translate('common.buttons.ok'),
          { duration: 3000 }
        );
        this.inviting = false;
      }
    });
  }

  claimItem(itemId: string | undefined, percentage: number): void {
    if (!this.receipt || !itemId) return;
    
    this.splittingService.claimItem(this.receipt.id, itemId, undefined, percentage / 100).subscribe({
      next: () => {
        this.loadReceipt();
        this.snackBar.open(
          `${percentage}% ${this.translationService.translate('splitting.messages.success.itemClaimedSuffix')}`,
          this.translationService.translate('common.buttons.ok'),
          { duration: 2000 }
        );
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || this.translationService.translate('splitting.errors.claimItemFailed'),
          this.translationService.translate('common.buttons.ok'),
          { duration: 3000 }
        );
      }
    });
  }

  showCustomClaim(item: any): void {
    this.customClaimItem = item;
    this.customPercentage = 50;
    this.customQuantity = item.quantity / 2;
  }

  submitCustomClaim(): void {
    if (!this.receipt || !this.customClaimItem) return;

    const quantity = this.customQuantity > 0 ? this.customQuantity : undefined;
  const percentage = this.customPercentage > 0 ? this.customPercentage / 100 : undefined;

    this.splittingService.claimItem(
      this.receipt.id, 
      this.customClaimItem.id, 
      quantity, 
      percentage
    ).subscribe({
      next: () => {
        this.loadReceipt();
        this.cancelCustomClaim();
        this.snackBar.open(
          this.translationService.translate('splitting.messages.success.itemClaimed'),
          this.translationService.translate('common.buttons.ok'),
          { duration: 2000 }
        );
      },
      error: () => {
        this.snackBar.open(
          this.translationService.translate('splitting.errors.claimFailed'),
          this.translationService.translate('common.buttons.ok'),
          { duration: 3000 }
        );
      }
    });
  }

  cancelCustomClaim(): void {
    this.customClaimItem = null;
    this.customPercentage = 50;
    this.customQuantity = 1;
  }
}
