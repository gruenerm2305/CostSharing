/// <reference types="jasmine" />

import { TranslationService } from "../../core/i18n/translation.service";


export function createTranslationServiceMock(): jasmine.SpyObj<TranslationService> {
  const spy = jasmine.createSpyObj<TranslationService>('TranslationService', [
    'translate',
    'activeLanguage',
    'languagePreference',
    'setLanguagePreference'
  ]);

  // Set up default behaviors (can be overridden in specific tests)
  spy.translate.and.callFake((key: string) => `translated_${key}`);
  spy.activeLanguage.and.returnValue('en');
  spy.languagePreference.and.returnValue('en');

  return spy;
}