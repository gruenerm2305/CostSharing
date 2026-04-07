import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { Receipt, ReceiptService } from "../core/services/receipt.service";
import { Category, CategoryService } from "../core/services/category.service";
import { Router, RouterLink } from "@angular/router";
import { CommonModule, CurrencyPipe, DatePipe } from "@angular/common";

@Component({
  selector: 'app-home',
  imports: [RouterLink,CurrencyPipe, DatePipe, CommonModule],
  templateUrl: 'home.html',
  styleUrl: 'home.scss',

})
export class HomeComponent implements OnInit {
  receipts: Receipt[] = [];
  categories: Category[] = [];
  recentReceipts: Receipt[] = [];
  constructor(
    private readonly receiptService: ReceiptService,
    private readonly categoryService: CategoryService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get totalAmount(): number {
  // If receipts is undefined or null, return 0 immediately
  if (!this.receipts) return 0;
  return this.receipts.reduce((sum, current) => sum + (current.myTotal || 0), 0);
}

  loadData(): void {
    this.receiptService.getAll().subscribe(receipts => {
      this.receipts = receipts;
      this.recentReceipts = receipts.slice(0, 5);
      this.cdr.detectChanges();
    });

    this.categoryService.getAll().subscribe(categories => {
      this.categories = categories;
      this.cdr.detectChanges();
    });
  }

  viewReceipt(receipt: Receipt): void {
    if (receipt.shareToken) {
      this.router.navigate(['/share', receipt.shareToken]);
    } else if (receipt.isShared || receipt.isParticipant) {
      this.router.navigate(['/receipts', receipt.id, 'split']);
    } else {
      this.router.navigate(['/receipts', receipt.id, 'edit']);
    }
  }
}