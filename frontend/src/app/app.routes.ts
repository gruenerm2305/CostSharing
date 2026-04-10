import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { UserRole } from './core/services/auth.service';
import { roleGuard } from './core/guards/role.guard';

export const appRoutes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login', loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent) },
    { path: 'register', loadComponent: () => import('./auth/register/component.register').then((m) => m.RegisterComponent) },
    {
        path: 'admin',
        loadComponent: () => import('./admin/users/useres.component').then((m) => m.UserManagementComponent),
        canActivate: [AuthGuard, roleGuard],
        data: { roles: [UserRole.ADMIN, UserRole.OWNER] },
    },
    { path: 'home', loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent), canActivate: [AuthGuard] },
    { path: 'receipts/capture', loadComponent: () => import('./receipt/capture/receipt-capture.component').then((m) => m.ReceiptCaptureComponent), canActivate: [AuthGuard] },
    { path: 'receipts/editor', loadComponent: () => import('./receipt/editor/receipt-editor.component').then((m) => m.ReceiptEditorComponent), canActivate: [AuthGuard] },
    { path: 'receipts/:id/editor', loadComponent: () => import('./receipt/editor/receipt-editor.component').then((m) => m.ReceiptEditorComponent), canActivate: [AuthGuard] },
    { path: 'receipts/list' , loadComponent: () => import('./receipt/list/receipt-list.component').then((m) => m.ReceiptListComponent), canActivate: [AuthGuard] },
    { path: 'receipts/:id/split', loadComponent: () => import('./receipt/splitting/split/spliting.component').then((m) => m.CostSplittingComponent), canActivate: [AuthGuard] },
    { path: 'receipt/splitting/shared/:shareToken', loadComponent: () => import('./receipt/splitting/shared/shared.component').then((m) => m.SharedReceiptComponent), canActivate: [AuthGuard] },
    { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent), canActivate: [AuthGuard] },
    { path: 'categories', loadComponent: () => import('./cathegory/category.component').then((m) => m.CategoryComponent), canActivate: [AuthGuard] },
    { path: 'account', loadComponent: () => import('./account/account.component').then((m) => m.AccountComponent), canActivate: [AuthGuard] },
];
