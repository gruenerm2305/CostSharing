import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
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

    constructor(private readonly http: HttpClient) {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUserSubject.next(JSON.parse(storedUser));
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
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
        })
    );}
    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
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
}