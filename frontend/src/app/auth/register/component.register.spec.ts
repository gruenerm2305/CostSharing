import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './component.register';
import { AuthService } from '../../core/services/auth.service';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { TranslationService } from '../../core/i18n/translation.service';
import { createTranslationServiceMock } from '../../testing/mockServices/translationService.mock';
import { of } from 'rxjs';

describe('component.register', async () =>
    {
        let component: RegisterComponent;
        let fixture: ComponentFixture<RegisterComponent>;

        let mockAuthService: jasmine.SpyObj<AuthService>;
        let mockRouter: jasmine.SpyObj<Router>;
        let mockFromBuilder: FormBuilder;
        let mockTranslationService: jasmine.SpyObj<TranslationService>;

        beforeEach(async () => {
            mockTranslationService = createTranslationServiceMock();
            mockAuthService = jasmine.createSpyObj('AuthService', ['register', 'login']);
            mockRouter = jasmine.createSpyObj('Router', ['navigate']);
            mockFromBuilder = new FormBuilder();

            await TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: Router, useValue: mockRouter },
                { provide: FormBuilder, useValue: mockFromBuilder },
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

            fixture = TestBed.createComponent(RegisterComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });
        describe('onSubmit()', () => {
            it('ensure special cases are caught', () => {
                mockAuthService.register.and.returnValue(of({successful: true} as any));

                component.registerForm.setValue({ username: 't', password: 'p', firstName: 'T', lastName: 'U' });
                component.onSubmit();
                expect(component.submitAttempted).toBeTrue();

                component.registerForm.setValue({ username: 'testuser', password: 'passw', firstName: 'Jon', lastName: 'Doe' }); // to short Password
                component.onSubmit();

                expect(component.submitAttempted).toBeTrue();
                expect(mockAuthService.register).not.toHaveBeenCalled();
            });

            it('check Succesfull Registration', () => {
                mockAuthService.register.and.returnValue(of({successful: true} as any));
                component.registerForm.setValue({ username: 'testuser', password: 'password123', firstName: 'Jon', lastName: 'Doe' });
                component.onSubmit();
                expect(component.error).toBeNull();
                expect(mockAuthService.register).toHaveBeenCalledWith('testuser', 'password123', 'Jon', 'Doe');
                expect(component.successMessage).toBe('auth.registerSuccess');
                expect(component.loading).toBeFalse();
                expect(component.error).toBeNull();
                expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
            });
        });
    });