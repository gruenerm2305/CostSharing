import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { TranslationService } from '../../core/i18n/translation.service';
import { AuthService } from '../../core/services/auth.service';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { throwError } from 'rxjs/internal/observable/throwError';
import { of } from 'rxjs';
import { createTranslationServiceMock } from '../../testing/mockServices/translationService.mock';

describe('login.component', async () => 
    {
        let component: LoginComponent;
        let fixture: ComponentFixture<LoginComponent>;

        let mockAuthService: jasmine.SpyObj<AuthService>;
        let mockRouter: jasmine.SpyObj<Router>;
        let mockTranslationService: jasmine.SpyObj<TranslationService>;

        beforeEach(async () => {
            mockAuthService = jasmine.createSpyObj('AuthService', ['login']);
            mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
            mockTranslationService = createTranslationServiceMock();

            await TestBed.configureTestingModule({
            imports: [LoginComponent, ReactiveFormsModule],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: Router, useValue: mockRouter },
                { provide: TranslationService, useValue: mockTranslationService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({}),
                            queryParamMap: convertToParamMap({})
                        }
                    }
                }
            ]
            }).compileComponents();

            fixture = TestBed.createComponent(LoginComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        describe('onSubmit()', () => {
            it('should navigate to dashboard on successful login without returnUrl', () => {
            mockAuthService.login.and.returnValue(of({ token: 'fake-jwt' } as any));
            component.loginForm.setValue({ username: 'testuser', password: 'password123' });
            spyOn(localStorage, 'getItem').and.returnValue(null);

            component.onSubmit();

            expect(mockAuthService.login).toHaveBeenCalledWith('testuser', 'password123');
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
            expect(component.loading()).toBeFalse(); // Should reset after success
            });

            it('should set error signal on 401 Unauthorized', () => {
            const errorResponse = { status: 401 };
            mockAuthService.login.and.returnValue(throwError(() => errorResponse));
            component.loginForm.setValue({ username: 'wrong', password: 'wrong' });

            component.onSubmit();

            expect(component.error()).toBe('translated_auth.errors.loginUnauthorized');
            expect(component.loading()).toBeFalse();
            expect(mockRouter.navigate).not.toHaveBeenCalled(); 
            });
        });
    });
