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
import { AuthGuard } from './core/guards/auth.guard';
import { UserRole } from './core/services/auth.service';
import { roleGuard } from './core/guards/role.guard';
import { UserManagementComponent } from './admin/users/useres.component';

export const appRoutes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: 'admin',
        component: UserManagementComponent,
        canActivate: [AuthGuard, roleGuard],
        data: { roles: [UserRole.ADMIN, UserRole.OWNER] },
    },
    { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'receipts/capture', component: ReceiptCaptureComponent, canActivate: [AuthGuard] },
    { path: 'receipts/editor', component: ReceiptEditorComponent, canActivate: [AuthGuard] },
    { path: 'receipts/:id/editor', component: ReceiptEditorComponent, canActivate: [AuthGuard] },
    { path: 'receipts/list' , component: ReceiptListComponent, canActivate: [AuthGuard] },
    { path: 'receipts/:id/split', component: CostSplittingComponent, canActivate: [AuthGuard] },
    { path: 'share/:shareToken', component: SharedReceiptComponent, canActivate: [AuthGuard] },
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
    { path: 'categories', component: CategoryComponent, canActivate: [AuthGuard] },
    { path: 'account', component: AccountComponent, canActivate: [AuthGuard] },
];
