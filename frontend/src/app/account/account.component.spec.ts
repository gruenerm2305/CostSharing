import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountComponent } from './account.component';
import { AuthService, User, UserRole } from '../core/services/auth.service';
import { UserAdminService } from '../core/services/user-admin.service';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';

describe('account.component', () => {
    let component: AccountComponent;
    let fixture: ComponentFixture<AccountComponent>;

    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockUserAdminService: jasmine.SpyObj<UserAdminService>;
    let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;
    let clipboardWriteTextSpy: jasmine.Spy;
    const baseUser = {
        id: '123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER
    } as User;

    function createComponentWithUser(user: User = baseUser): void {
        mockAuthService.getCurrentUser.and.returnValue(user);
        fixture = TestBed.createComponent(AccountComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(async () => {
        mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'setCurrentUser']);
        mockUserAdminService = jasmine.createSpyObj('UserAdminService', ['updateUsername', 'updatePassword']);
        mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

        const clipboardMock = jasmine.createSpyObj('clipboard', ['writeText']);
        clipboardMock.writeText.and.returnValue(Promise.resolve());
        clipboardWriteTextSpy = clipboardMock.writeText;
        spyOnProperty(navigator, 'clipboard', 'get').and.returnValue(clipboardMock);

        await TestBed.configureTestingModule({
            imports: [AccountComponent],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: UserAdminService, useValue: mockUserAdminService },
                { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef }
            ]
        }).compileComponents();

    });

    describe('test data loading and html displaying', () => {
        it('should load current user on init and render values in HTML', () => {
           const mockUser = baseUser;

            mockAuthService.getCurrentUser.and.returnValue(mockUser);

            fixture = TestBed.createComponent(AccountComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.currentUser).toEqual(mockUser);
            expect(component.usernameDraft).toBe(mockUser.username);

            const usernameInput = fixture.nativeElement.querySelector('#username-input') as HTMLInputElement;
            expect(usernameInput).toBeTruthy();
            expect(usernameInput.value).toBe(mockUser.username);

            component.copyUserId();
            expect(clipboardWriteTextSpy).toHaveBeenCalledWith(mockUser.id);
        });
    });

    describe('setting invalid username and password', () => {
        it('should disable username save buttons when inputs are invalid', () => {
            createComponentWithUser();

            component.usernameDraft = '   ';
            expect(component.canSaveUsername()).toBeFalse();

            component.usernameDraft = baseUser.username;
            expect(component.canSaveUsername()).toBeFalse();

            component.usernameDraft = 'new-user';
            component.usernameSaving = true;
            expect(component.canSaveUsername()).toBeFalse();
        });

        it('should disable password save buttons when inputs are invalid', () => {
            createComponentWithUser();

            component.newPassword = '';
            component.confirmPassword = '';
            expect(component.canSavePassword()).toBeFalse();

            component.newPassword = 'secret1';
            component.confirmPassword = 'secret1';
            component.passwordSaving = true;
            expect(component.canSavePassword()).toBeFalse();
        });

        it('should show error when passwords do not match', () => {
            createComponentWithUser();

            component.newPassword = 'secret1';
            component.confirmPassword = 'secret2';

            component.savePassword();

            expect(component.passwordErrorKey).toBe('account.errors.passwordMismatch');
            expect(mockUserAdminService.updatePassword).not.toHaveBeenCalled();
        });
    });

    describe('setting valid username and password', () => {
        it('should call updateUsername on userAdminService when saving valid username', () => {
            createComponentWithUser();
            mockUserAdminService.updateUsername.and.returnValue(of(void 0));

            component.usernameDraft = 'new-user';
            component.saveUsername();

            expect(mockUserAdminService.updateUsername).toHaveBeenCalledWith(baseUser.id, 'new-user');
            expect(mockAuthService.setCurrentUser).toHaveBeenCalled();
            expect(component.usernameSuccessKey).toBe('account.messages.usernameSaved');
        });

        it('should call updatePassword on userAdminService when saving valid password', () => {
            createComponentWithUser();
            mockUserAdminService.updatePassword.and.returnValue(of(void 0));

            component.newPassword = 'secret1';
            component.confirmPassword = 'secret1';
            component.savePassword();

            expect(mockUserAdminService.updatePassword).toHaveBeenCalledWith(baseUser.id, 'secret1');
            expect(component.passwordSuccessKey).toBe('account.messages.passwordSaved');
            expect(component.newPassword).toBe('');
            expect(component.confirmPassword).toBe('');
        });
     });

});