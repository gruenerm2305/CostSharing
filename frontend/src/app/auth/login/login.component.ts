import { Component } from "@angular/core";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { AuthService } from "../../core/services/auth.service";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: 'login.html',
  styleUrl: 'login.scss'
})
export class LoginComponent {
    loginForm: FormGroup;
    loading = false;
    error: string | null = null;
    submitAttempted = false;
    constructor(
        private readonly fb: FormBuilder,
        private readonly authService: AuthService,
        private readonly router: Router
    ) {
        this.loginForm = this.fb.group({
            username: ['',[Validators.required]],
            password: ['',[Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
        });
    }
    onSubmit(): void {
        return;
    }
    isFieldInvalid(fieldName: string): boolean {
        return false;
  }
}