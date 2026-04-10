import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './useres.component';
import { UserAdminService } from '../../core/services/user-admin.service';
import { AuthService, UserRole } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import { createTranslationServiceMock } from '../../testing/mockServices/translationService.mock';
import { of } from 'rxjs';

describe('users.component', () => {
    let component: UserManagementComponent;
    let fixture: ComponentFixture<UserManagementComponent>;

    let mockUserAdminService: jasmine.SpyObj<UserAdminService>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
    let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;
    let mockElementRef: jasmine.SpyObj<ElementRef<HTMLElement>>;
    let mockTranslationService: jasmine.SpyObj<TranslationService>;
    

    beforeEach(async () => {
        mockUserAdminService = jasmine.createSpyObj('UserAdminService', ['getAllUsers', 'updateUserRole', 'deleteUser']);
        mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'hasAnyRole', 'getUserDisplayName']);
        mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
        mockElementRef = jasmine.createSpyObj('ElementRef', ['nativeElement']);
        mockTranslationService = createTranslationServiceMock();
        mockAuthService.hasAnyRole.and.returnValue(false);
        mockAuthService.getCurrentUser.and.returnValue(null);
        mockAuthService.getUserDisplayName.and.callFake((user) =>
            `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username,
        );

        await TestBed.configureTestingModule({
            imports: [UserManagementComponent],
            providers: [
                { provide: UserAdminService, useValue: mockUserAdminService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: MatSnackBar, useValue: mockSnackBar },
                { provide: ChangeDetectorRef, useValue: mockCdr },
                { provide: ElementRef, useValue: mockElementRef },
                { provide: TranslationService, useValue: mockTranslationService }
            ]
        }).compileComponents();
    });

    it('verify user loading on init in Html', () => {
        const mockUsers = [
            { id: '1', username: 'user1', firstName: 'User', lastName: 'One', role: UserRole.USER },
            { id: '2', username: 'user2', firstName: 'User', lastName: 'Two', role: UserRole.ADMIN }
        ];
        mockUserAdminService.getAllUsers.and.returnValue(of(mockUsers));
        fixture = TestBed.createComponent(UserManagementComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.users).toEqual(mockUsers);

        const userRows = fixture.nativeElement.querySelectorAll('article.list-row');
        expect(userRows.length).toBe(mockUsers.length);
    });


});