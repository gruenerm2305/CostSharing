import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { ReceiptService } from '../core/services/receipt.service';
import { Chart, registerables, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslationService } from '../core/i18n/translation.service';

Chart.register(...registerables); 

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
        ticks: { color: '#a5adc6' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' }
      },
      y: {
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
  public test: any;
  
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
        
        const categoryNames = Object.keys(data.byCategory);
        const categoryAmounts = Object.values(data.byCategory) as number[];
        const colors = categoryNames.map(name => data.categoryColors[name] || '#cccccc');
        
        this.pieChartData = {
          labels: categoryNames,
          datasets: [{
            data: categoryAmounts,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        };

        const dates = Object.keys(data.byDate).sort();
        const amounts = dates.map(date => data.byDate[date] as number);
        const barColors = categoryNames.length > 0 ? colors : ['#007bff'];
        
        this.barChartData = {
          labels: dates,
          datasets: [
            { 
              data: amounts, 
              label: this.translationService.translate('dashboard.charts.expensesLabel'),
              backgroundColor: barColors[0] || '#007bff',
              borderColor: barColors[0] || '#0056b3',
              borderWidth: 1
            }
          ]
        };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading statistics', err)
    });
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