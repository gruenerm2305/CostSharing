import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum UserRole {
  USER = 'User',
  ADMIN = 'Admin',
  OWNER = 'Owner',
}

export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
    private readonly currentUser$ = this.currentUserSubject.asObservable();

    getUserDisplayName(user: User): string {
        const parts = [user.firstName, user.lastName].filter(
            (part): part is string => !!part && part.trim().length > 0,
        );

        if (parts.length > 0) {
            return parts.join(' ');
        }

        return user.username;
    }

    constructor(private readonly http: HttpClient) {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser) as User;
            if (!parsedUser.role) {
                parsedUser.role = UserRole.USER;
            }
            this.currentUserSubject.next(parsedUser);
        }
    }

    login(username: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { username, password })
        .pipe(
            tap(response => {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            })
        );
    }

    register(username: string, password: string, firstName?: string, lastName?: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
        username,
        password,
        firstName,
        lastName
        }).pipe(
        tap(response => {
            this.currentUserSubject.next(response.user);
        })
    );}
    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
    }
    hasRole(role: UserRole): boolean {
        const user = this.getCurrentUser();
        return user?.role === role;
    }

    hasAnyRole(roles: UserRole[]): boolean {
        const user = this.getCurrentUser();
        if (!user) {
        return false;
        }
        return roles.includes(user.role);
    }
    getToken(): string | null {
        return localStorage.getItem('token');
    }
    isAuthenticated(): boolean {
        return !!this.getToken();
    }
    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }
    getCurrentUserId(): string | null {
        const user = this.getCurrentUser();
        return user ? user.id : null;
    }

    setCurrentUser(user: User | null): void {
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
        this.currentUserSubject.next(user);
    }
}