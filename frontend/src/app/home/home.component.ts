import { Component, OnInit } from "@angular/core";
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
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.receiptService.getAll().subscribe(receipts => {
      this.receipts = receipts;
      this.recentReceipts = receipts.slice(0, 5);
    });

    this.categoryService.getAll().subscribe(categories => {
      this.categories = categories;
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