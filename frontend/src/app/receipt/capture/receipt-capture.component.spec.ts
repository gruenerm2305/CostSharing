import { TranslationService } from "../../core/i18n/translation.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ReceiptService } from "../../core/services/receipt.service";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ReceiptCaptureComponent } from "./receipt-capture.component";
import { of } from "rxjs";

describe('receipt-capture.component', () => {
  let component: ReceiptCaptureComponent;
  let fixture: ComponentFixture<ReceiptCaptureComponent>;
  
  
  let mockReceiptService: jasmine.SpyObj<ReceiptService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;
  let mockActivatedRoute: Partial<ActivatedRoute>;

  beforeEach(async () => {
    mockReceiptService = jasmine.createSpyObj<ReceiptService>('ReceiptService', ['uploadReceipt']);
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    mockTranslationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate']);
    mockActivatedRoute = {
      params: of({}),
      queryParams: of({}),
      fragment: of(null),
      data: of({})
    };

    await TestBed.configureTestingModule({
      imports: [ReceiptCaptureComponent],
      providers: [
        { provide: ReceiptService, useValue: mockReceiptService },
        { provide: Router, useValue: mockRouter },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReceiptCaptureComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set invalid file type error when dropping an unsupported file', () => {
    const invalidFile = new File(['invalid content'], 'receipt.txt', { type: 'text/plain' });
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      dataTransfer: { files: [invalidFile] }
    } as unknown as DragEvent;

    component.isDragging = true;
    component.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.isDragging).toBeFalse();
    expect(component.error).toBe('receipts.capture.errors.invalidFileType');
    expect(component.selectedFile).toBeNull();
  });

  it('should keep previous selection when dropping an unsupported file', () => {
    const validFile = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    const invalidFile = new File(['bad'], 'payload.exe', { type: 'application/x-msdownload' });
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      dataTransfer: { files: [invalidFile] }
    } as unknown as DragEvent;

    component.processFile(validFile);
    component.onDrop(event);

    expect(component.selectedFile).toBe(validFile);
    expect(component.error).toBe('receipts.capture.errors.invalidFileType');

    mockReceiptService.uploadReceipt.and.returnValue(of({ id: 1 } as any));
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    component.uploadReceipt();
    expect(mockReceiptService.uploadReceipt).toHaveBeenCalledWith(validFile);
  });
  
  it('check if cancel works', () => {
    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    component.selectedFile = file;
    component.previewUrl = 'some-preview-url';
    component.error = 'some error';
    component.cancelSelection();
    expect(component.selectedFile).toBeNull();
    expect(component.previewUrl).toBeNull();
    expect(component.error).toBeNull();
   });
});