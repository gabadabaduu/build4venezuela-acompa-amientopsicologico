import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import {
  changePasswordPageGuard,
  mustChangePasswordGuard,
} from './guards/password-change.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then(m => m.RegisterPage) },
  {
    path: 'change-password',
    loadComponent: () => import('./pages/change-password/change-password').then(m => m.ChangePasswordPage),
    canActivate: [authGuard, changePasswordPageGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfilePage),
    canActivate: [authGuard, mustChangePasswordGuard, roleGuard(['volunteer'])],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then(m => m.AdminPage),
    canActivate: [authGuard, mustChangePasswordGuard, roleGuard(['admin'])],
  },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage) },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' },
];
