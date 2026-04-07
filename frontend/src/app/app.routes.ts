import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './auth/register/component.register';
import { ReceiptCaptureComponent } from './receipt/capture/receipt-capture.component';
import { ReceiptEditorComponent } from './receipt/editor/receipt-editor.component';
import { ReceiptListComponent } from './receipt/list/receipt-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CategoryComponent } from './cathegory/category.component';
import { AccountComponent } from './account/account.component';
import { CostSplittingComponent } from './receipt/splitting/split/spliting.component';
import { SharedReceiptComponent } from './receipt/splitting/shared/shared.component';

export const appRoutes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'home', component: HomeComponent },
    { path: 'receipts/capture', component: ReceiptCaptureComponent },
    { path: 'receipts/editor', component: ReceiptEditorComponent },
    { path: 'receipts/:id/editor', component: ReceiptEditorComponent },
    { path: 'receipts/list' , component: ReceiptListComponent },
    { path: 'receipts/:id/split', component: CostSplittingComponent },
    { path: 'share/:shareToken', component: SharedReceiptComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'categories', component: CategoryComponent },
    { path: 'account', component: AccountComponent },
];
