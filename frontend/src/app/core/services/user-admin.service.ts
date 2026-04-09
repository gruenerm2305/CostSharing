import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserAdminService {
  constructor(private readonly http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  updateUserRole(userId: string, role: UserRole): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/users/${userId}/role`, { role });
  }

  updateUsername(userId: string, username: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/users/${userId}/username`, { username });
  }

  updatePassword(userId: string, password: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/users/${userId}/password`, { password });
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/${userId}`);
  }
}
