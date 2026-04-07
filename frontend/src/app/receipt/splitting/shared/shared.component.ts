import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { Location, CommonModule } from "@angular/common";
import { Receipt, ReceiptService } from "../../../core/services/receipt.service";
import { Subscription } from "rxjs/internal/Subscription";
import { ActivatedRoute, Router } from "@angular/router";
import { SplittingService } from "../../../core/services/splitting.service";
import { AuthService } from "../../../core/services/auth.service";
import { interval } from "rxjs/internal/observable/interval";
import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-shared-receipt',
    imports: [CommonModule, FormsModule],
    templateUrl: './shared.html',
    styleUrl: './shared.scss'
})  
export class SharedReceiptComponent implements OnInit, OnDestroy {
  errorMessage: string | null = null;
  receipt: Receipt | null = null;
  loading = true;
  isAuthenticated = false;
  showLoginPrompt = false;
  myTotal = 0;
  currentUserId: string | null = null;
  userColor = '#667eea'; // Eigene Farbe

  private readonly claims: Map<string, any> = new Map(); // itemId -> claim
  private readonly itemColors = new Map<string, string>();
  private colorIndex = 0;
  private readonly colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  private updateSubscription?: Subscription;

  customClaimItem: any = null;
  customPercentage: number | null = 50;
  customQuantity: number | null = 1;
  customError: string | null = null;
  customMaxPercentage: number = 100;
  customMaxQuantity: number = 0;

  isOwner = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly router: Router,
    private readonly receiptService: ReceiptService,
    private readonly splittingService: SplittingService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef 
  ) {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.currentUserId = this.authService.getCurrentUserId();
  }

  ngOnInit(): void {
    this.loadSharedReceipt();
    
    // Poll for updates every 3 seconds
    this.updateSubscription = interval(3000).subscribe(() => {
      if (this.receipt) {
        this.loadClaims(this.receipt.id, true); // Silent update
      }
    });
  }

  ngOnDestroy(): void {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  loadSharedReceipt(): void {
    const shareToken = this.route.snapshot.paramMap.get('shareToken');
    if (!shareToken) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.receiptService.getSharedReceipt(shareToken).subscribe({
      next: (receipt) => {
        this.receipt = receipt;
        this.cdr.detectChanges();
        if (receipt.claims) {
          this.processClaims(receipt.claims);
        }

        // Check if owner
        if (this.isAuthenticated && this.currentUserId) {
           this.receiptService.getById(receipt.id).subscribe({
             next: (fullReceipt) => {
               if (fullReceipt.userId === this.currentUserId) {
                 this.isOwner = true;
                 this.updateMyTotal(); // Recalculate with owner logic
                 this.cdr.detectChanges();
               }
             },
             error: () => {
               this.isOwner = false;
               this.cdr.detectChanges();    
             }
           });
        }

        // If authenticated, we assume the public endpoint returned claims anyway now.
        // But refreshing claims explicitly is also fine if we want latest data.
        // However, to avoid "pop-in", we processed what we got.
        // If we are authenticated, we might want to fetch claims again ONLY if we suspect the public one was incomplete? 
        // But we made the public one complete.
        // So we can probably skip loadClaims() if receipt.claims is present, OR call it silently to update.
        // To be safe and ensure "my total" is correct with authenticated context definitely:
        if (this.isAuthenticated && receipt.id && !receipt.claims) {
          this.loadClaims(receipt.id);
        } else {
             this.loading = false;
        }
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 404) {
          this.errorMessage = 'Dieser geteilte Link ist abgelaufen oder ungültig. Der Beleg ist möglicherweise wieder privat.';
        } else {
          this.errorMessage = 'Beleg konnte nicht geladen werden.';
        }
      }
    });
  }

  loadClaims(receiptId: string, silent = false): void {
    this.splittingService.getClaims(receiptId).subscribe({
      next: (claims) => {
        this.processClaims(claims);
        if (!silent) this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (!silent) this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private processClaims(claims: any[]): void {
    this.claims.clear();
    for (const claim of claims) {
      if (!this.claims.has(claim.itemId)) {
        this.claims.set(claim.itemId, []);
      }
      this.claims.get(claim.itemId)?.push(claim);
    }
    this.updateMyTotal();
  }

  isItemClaimedByMe(itemId: string | undefined): boolean {
    if (!itemId || !this.currentUserId) return false;
    const itemClaims = this.claims.get(itemId);
    return itemClaims?.some((c: any) => c.claimerUserId === this.currentUserId) ?? false;
  }

  // Returns true if item is fully claimed (approx > 99%)
  isItemFullyClaimed(item: any): boolean {
    return this.getClaimedPercentage(item) >= 99.9;
  }
  
  isItemClaimed(itemId: string | undefined): boolean {
     // Helper for backward compatibility or generic check if ANY claim exists?
     // Used in template for styling 'claimed-other'
     return (this.claims.get(itemId || '')?.length || 0) > 0;
  }

  getClaimedPercentage(item: any): number {
    if (!item || !item.id) return 0;
    const itemClaims = this.claims.get(item.id) || [];
    
    // Sum amounts
    const totalClaimedAmount = itemClaims.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
    const pct = (totalClaimedAmount / Number(item.totalPrice)) * 100;
    return Math.min(pct, 100);
  }

  getOthersClaimedPercentage(item: any): number {
    if (!item || !item.id) return 0;
    const itemClaims = this.claims.get(item.id) || [];
    
    const othersClaims = itemClaims.filter((c: any) => c.claimerUserId !== this.currentUserId);
    const othersTotalAmount = othersClaims.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
    const pct = (othersTotalAmount / Number(item.totalPrice)) * 100;
    return Math.min(pct, 100);
  }

  isItemFullyClaimedByOthers(item: any): boolean {
    return this.getOthersClaimedPercentage(item) >= 99.9;
  }

  getItemAvatars(itemId: string | undefined): Array<{ name: string; color: string; initials: string }> {
    if (!itemId) return [];
    
    const itemClaims = this.claims.get(itemId);
    if (!itemClaims || itemClaims.length === 0) return [];

    const avatars = [];
    
    for (const claim of itemClaims) {
      const isMyItem = claim.claimerUserId === this.currentUserId;
      
      if (isMyItem) {
        avatars.push({
          name: 'Du',
          color: this.userColor,
          initials: 'DU'
        });
      } else {
        // Andere Nutzer - konsistente Farbe pro Nutzer
        if (!this.itemColors.has(claim.claimerUserId)) {
          this.itemColors.set(claim.claimerUserId, this.colors[this.colorIndex % this.colors.length]);
          this.colorIndex++;
        }
        const color = this.itemColors.get(claim.claimerUserId) || this.colors[0];
        avatars.push({
          name: `User ${claim.claimerUserId.substring(0, 4)}`,
          color,
          initials: claim.claimerUserId.substring(0, 2).toUpperCase()
        });
      }
    }
    
    return avatars;
  }

  claimItem(item: any): void {
    if (!this.isAuthenticated) {
      this.promptLogin();
      return;
    }

    if (!item.id || !this.receipt) return;

    // Remove My Claim if I click "Zurücknehmen" (which calls this method in template)
    if (this.isItemClaimedByMe(item.id)) {
      this.removeClaim(item.id);
    }

    // Checking if fully claimed
    if (this.isItemFullyClaimed(item)) {
       alert('Dieser Artikel wurde bereits vollständig übernommen.');
       return;
    }

    // Item claimen (100% der Remaining Quantity)
    this.claimRemainder(item);
    this.cdr.detectChanges();
  }

  claimRemainder(item: any): void {
    const othersPct = this.getOthersClaimedPercentage(item);
    const targetPct = Math.max(0, (100 - othersPct) / 100);
    
    // Safety check: if 100% already taken by others, we can't take anything
    if (othersPct >= 99.9) {
      alert('Dieser Artikel wurde bereits vollständig von anderen übernommen.');
      return;
    }
    
    this.splittingService.claimItem(this.receipt!.id, item.id, 0, targetPct).subscribe({
      next: () => {
        if (this.receipt) this.loadClaims(this.receipt.id);
      },
      error: (err) => this.handleError(err)
    });
  }

  handleError(err: any) {
    console.error('Failed to claim item:', err);
        let errorMessage = 'Fehler beim Übernehmen des Artikels.';
        if (err.error?.message) {
          errorMessage += ' ' + err.error.message;
        } else if (err.status === 403) {
          errorMessage = 'Sie haben keine Berechtigung, diesen Artikel zu übernehmen.';
        } else if (err.status === 409) {
          errorMessage = 'Dieser Anteil übersteigt den verfügbaren Betrag.';
        }
        alert(errorMessage);
  }

  getQuantityOptions(total: number): number[] {
    const count = Math.floor(total);
    if (count <= 1) return [];
    return Array.from({ length: count - 1 }, (_, i) => i + 1);
  }

  onQuantitySelect(item: any, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = +select.value;
    if (value) {
      this.claimQuantity(item, value);
      select.value = '';
    }
  }

  claimQuantity(item: any, quantity: number): void {
    if (!this.isAuthenticated) {
      this.promptLogin();
      return;
    }
    
    this.splittingService.claimItem(this.receipt!.id, item.id, quantity, undefined).subscribe({
      next: () => {
        this.loadClaims(this.receipt!.id);
        alert(`${quantity}/${item.quantity} des Artikels übernommen!`);
      },
      error: (err) => {
        alert(err.error?.message || 'Fehler beim Zuordnen des Artikels');
      }
    });
  }

  showCustomClaim(item: any): void {
    if (!this.isAuthenticated) {
      this.promptLogin();
      return;
    }
    this.customClaimItem = item;
    
    // Calculate what is already claimed by OTHERS only (since I am replacing my claim)
    const itemClaims = this.claims.get(item.id) || [];
    const othersClaims = itemClaims.filter((c: any) => c.claimerUserId !== this.currentUserId);
    const othersTotalAmount = othersClaims.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
    const othersPct = (othersTotalAmount / Number(item.totalPrice)) * 100;

    const availablePct = Math.max(0, 100 - othersPct);
    
    this.customMaxPercentage = Number(availablePct.toFixed(2));
    this.customMaxQuantity = Number((item.quantity * (availablePct / 100)).toFixed(3));

    const myClaim = itemClaims.find((c: any) => c.claimerUserId === this.currentUserId);

    if (myClaim) {
      const myAmount = Number(myClaim.amount);
      const itemTotal = Number(item.totalPrice);
      const myPct = itemTotal > 0 ? (myAmount / itemTotal) * 100 : 0;

      this.customPercentage = Number(Math.min(myPct, this.customMaxPercentage).toFixed(2));
      this.customQuantity = Number((item.quantity * (this.customPercentage / 100)).toFixed(2));
    } else {
      // Fall back to previous behavior when user has no existing allocation yet.
      this.customPercentage = Math.min(50, this.customMaxPercentage);
      this.updateCustomQuantityFromPercentage();
    }

    this.customError = null;
  }

  updateCustomQuantityFromPercentage() {
    if (!this.customClaimItem || this.customPercentage === null) return;
    
    if (this.customPercentage > this.customMaxPercentage) {
      this.customError = `Maximal ${this.customMaxPercentage}% verfügbar`;
    } else {
      this.customError = null;
    }

    const qty = (this.customPercentage / 100) * this.customClaimItem.quantity;
    this.customQuantity = Number(qty.toFixed(2));
  }

  updateCustomPercentageFromQuantity() {
    if (!this.customClaimItem || this.customQuantity === null) return;
    
    if (this.customQuantity > this.customMaxQuantity) {
      this.customError = `Maximal ${this.customMaxQuantity} Stück verfügbar`;
    } else {
      this.customError = null;
    }

    const pct = (this.customQuantity / this.customClaimItem.quantity) * 100;
    this.customPercentage = Number(pct.toFixed(2));
  }

  setCustomSplit(parts: number) {
    if (!this.customClaimItem) return;
    const qty = Number(this.customClaimItem.quantity) / parts;
    this.customQuantity = Number(qty.toFixed(2));
    this.updateCustomPercentageFromQuantity();
  }

  submitCustomClaim(): void {
    if (!this.receipt || !this.customClaimItem) return;
    
    if (this.customError) return;

    if (this.customPercentage && this.customPercentage > 0) {
      const pct = this.customPercentage / 100;
      this.splittingService.claimItem(this.receipt.id, this.customClaimItem.id, 0, pct).subscribe({
        next: () => this.afterCustomClaim(),
        error: (err) => this.handleError(err)
      });
    } else if (this.customQuantity && this.customQuantity > 0) {
       this.splittingService.claimItem(this.receipt.id, this.customClaimItem.id, this.customQuantity).subscribe({
        next: () => this.afterCustomClaim(),
        error: (err) => this.handleError(err)
      });
    }
  }

  afterCustomClaim() {
    if (this.receipt) {
      this.loadClaims(this.receipt.id);
    }
    this.cancelCustomClaim();
  }

  cancelCustomClaim(): void {
    this.customClaimItem = null;
    this.customPercentage = 50;
    this.customQuantity = 1;
    this.customError = null;
  }

  removeClaim(itemId: string): void {
    if (!this.receipt) return;
    
    this.splittingService.removeClaim(this.receipt.id, itemId).subscribe({
      next: () => {
        // Reload claims to ensure we see others' claims correctly (and don't wipe them out locally)
        this.loadClaims(this.receipt!.id);
      },
      error: (err) => {
        console.error('Failed to remove claim:', err);
      }
    });
  }

  updateMyTotal(): void {
    if (!this.receipt || !this.currentUserId) return;
    
    let myExplicitClaims = 0;
    let allClaimsTotal = 0;
    
    this.claims.forEach((itemClaims: any[]) => {
      itemClaims.forEach((c: any) => {
        allClaimsTotal += Number(c.amount);
        if (c.claimerUserId === this.currentUserId) {
          myExplicitClaims += Number(c.amount);
        }
      });
    });
    
    if (this.isOwner) {
      const remainder = Number(this.receipt.totalAmount) - allClaimsTotal;
      this.myTotal = myExplicitClaims + Math.max(0, remainder);
    } else {
      this.myTotal = myExplicitClaims;
    }
  }

  promptLogin(): void {
    this.showLoginPrompt = true;
  }

  closeLoginPrompt(): void {
    this.showLoginPrompt = false;
  }

  navigateToLogin(): void {
    // Speichere aktuelle URL für Redirect nach Login
    localStorage.setItem('returnUrl', this.router.url);
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    localStorage.setItem('returnUrl', this.router.url);
    this.router.navigate(['/register']);
  }

  revokeShare(): void {
    if (!this.receipt || !confirm('Möchten Sie diesen Beleg wirklich wieder privat machen? Der Link wird ungültig und alle Aufteilungen werden entfernt.')) return;
    
    this.splittingService.revokeShare(this.receipt.id).subscribe({
      next: () => {
        alert('Beleg ist nun wieder privat.');
        this.router.navigate(['/receipts', this.receipt!.id, 'edit']);
      },
      error: () => {
        alert('Fehler beim Zurücksetzen des Belegs.');
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
