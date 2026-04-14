import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { ReceiptService } from '../core/services/receipt.service';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartData,
  ChartType,
  Legend,
  LinearScale,
  PieController,
  Title,
  Tooltip,
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslationService } from '../core/i18n/translation.service';

Chart.register(PieController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, BaseChartDirective, TranslatePipe], 
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  // Pie Chart (Categories)
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#d8dcef' }
      },
    }
  };
  
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  public pieChartType: ChartType = 'pie';

  // Bar Chart (Time)
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#d8dcef' }
      }
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#a5adc6' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' }
      },
      y: {
        stacked: true,
        ticks: { color: '#a5adc6' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' }
      }
    }
  };

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: '' }]
  };
  public barChartType: ChartType = 'bar';

  public totalAmount: number = 0;
  public receiptCount: number = 0;
  public hasData: boolean = true;
  
  public startDate: string | null = null;
  public endDate: string | null = null;
  public activeFilter: 'month' | 'year' | 'all' = 'all';

  constructor(private readonly receiptService: ReceiptService,
    private readonly cdr: ChangeDetectorRef,
    private readonly translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.receiptService.getStatistics(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (data) => {
        this.totalAmount = data.totalAmount;
        this.receiptCount = data.receiptCount;
        this.hasData = this.receiptCount > 0;

        const categoryNames = Object.keys(data.byCategory);
        const categoryAmounts = Object.values(data.byCategory) as number[];
        const categoryColorMap = this.buildCategoryColorMap(categoryNames, data.categoryColors || {});
        const pieColors = categoryNames.map((name) => categoryColorMap[name]);

        this.pieChartData = {
          labels: categoryNames,
          datasets: [{
            data: categoryAmounts,
            backgroundColor: pieColors,
            borderWidth: 0,
            borderColor: 'transparent'
          }]
        };

        const dates = Object.keys(data.byDate).sort((a, b) => a.localeCompare(b));
        const isDetailedByDate = dates.length > 0 && this.hasDetailedDateData(data.byDate[dates[0]]);

        if (isDetailedByDate) {
          const datasets = categoryNames.map((categoryName) => {
            const categoryColor = categoryColorMap[categoryName] || '#cccccc';

            return {
              data: dates.map((date) => this.getCategoryAmountForDate(data.byDate[date], categoryName)),
              label: categoryName,
              backgroundColor: categoryColor,
              borderColor: categoryColor,
              borderWidth: 1,
            };
          });

          this.barChartData = {
            labels: dates,
            datasets,
          };
        } else {
          const fallbackColor = categoryNames.length > 0 ? categoryColorMap[categoryNames[0]] : '#007bff';
          const amounts = dates.map((date) => Number(data.byDate[date]) || 0);

          this.barChartData = {
            labels: dates,
            datasets: [
              {
                data: amounts,
                label: this.translationService.translate('dashboard.charts.expensesLabel'),
                backgroundColor: fallbackColor,
                borderColor: fallbackColor,
                borderWidth: 1,
              }
            ]
          };
        }

        this.barChartData = {
          ...this.barChartData,
          labels: dates,
        };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading statistics', err)
    });
  }

  private hasDetailedDateData(
    dateEntry: unknown,
  ): dateEntry is { categories: Array<{ name: string; amount: number }> } {
    return !!dateEntry && typeof dateEntry === 'object' && Array.isArray((dateEntry as { categories?: unknown }).categories);
  }

  private getCategoryAmountForDate(
    dateEntry: unknown,
    categoryName: string,
  ): number {
    if (!this.hasDetailedDateData(dateEntry)) {
      return 0;
    }

    const match = dateEntry.categories.find((category) => category.name === categoryName);
    return Number(match?.amount) || 0;
  }

  private buildCategoryColorMap(
    categoryNames: string[],
    categoryColors: Record<string, string>,
  ): Record<string, string> {
    const map: Record<string, string> = {};
    const buckets: Record<string, string[]> = {};

    for (const name of categoryNames) {
      const baseColor = this.normalizeHexColor(categoryColors[name] || '#cccccc');
      if (!buckets[baseColor]) {
        buckets[baseColor] = [];
      }
      buckets[baseColor].push(name);
    }

    Object.entries(buckets).forEach(([baseColor, names]) => {
      names.forEach((name, index) => {
        map[name] = this.applyShadeVariant(baseColor, index, names.length);
      });
    });

    return map;
  }

  private applyShadeVariant(baseHex: string, index: number, total: number): string {
    if (total <= 1) {
      return baseHex;
    }

    const [r, g, b] = this.hexToRgb(baseHex);
    const center = (total - 1) / 2;
    const offset = index - center;
    const strength = 0.18;
    const factor = total === 1 ? 0 : (offset / Math.max(center, 1)) * strength;

    const shaded = [
      this.adjustChannel(r, factor),
      this.adjustChannel(g, factor),
      this.adjustChannel(b, factor),
    ] as const;

    return this.rgbToHex(shaded[0], shaded[1], shaded[2]);
  }

  private adjustChannel(value: number, factor: number): number {
    if (factor >= 0) {
      return Math.round(value + (255 - value) * factor);
    }

    return Math.round(value * (1 + factor));
  }

  private normalizeHexColor(color: string): string {
    const trimmed = color.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    return '#cccccc';
  }

  private hexToRgb(hex: string): [number, number, number] {
    const normalized = this.normalizeHexColor(hex).replace('#', '');
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return [r, g, b];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(this.clampColor(r))}${toHex(this.clampColor(g))}${toHex(this.clampColor(b))}`;
  }

  private clampColor(value: number): number {
    return Math.min(255, Math.max(0, value));
  }

  onFilterChange(type: 'month' | 'year' | 'all'): void {
    this.activeFilter = type;
    const now = new Date();
    if (type === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate = start.toISOString().split('T')[0];
      this.endDate = now.toISOString().split('T')[0];
    } else if (type === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      this.startDate = start.toISOString().split('T')[0];
      this.endDate = now.toISOString().split('T')[0];
    } else {
      this.startDate = null;
      this.endDate = null;
    }
    this.loadStatistics();
  }
}