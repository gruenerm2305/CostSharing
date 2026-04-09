import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type SupportedLanguage = 'en' | 'de';
export type LanguagePreference = SupportedLanguage;

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly storageKey = 'costsharing.languagePreference';
  private readonly fallbackLanguage: SupportedLanguage = 'en';

  private readonly dictionary = signal<Record<string, unknown>>({});
  readonly activeLanguage = signal<SupportedLanguage>(this.fallbackLanguage);
  readonly languagePreference = signal<LanguagePreference>(this.fallbackLanguage);

  constructor(private readonly http: HttpClient) {}

  async init(): Promise<void> {
    const storedPreference = this.readStoredPreference();
    if (storedPreference) {
      await this.setLanguagePreference(storedPreference, false);
      return;
    }

    // Only use browser language when there is no persisted user preference yet.
    const browserLanguage = this.getBrowserLanguage();
    await this.setLanguagePreference(browserLanguage, true);
  }

  async setLanguagePreference(preference: LanguagePreference, persist = true): Promise<void> {
    this.languagePreference.set(preference);
    await this.loadDictionary(preference);
    this.activeLanguage.set(preference);

    if (persist) {
      localStorage.setItem(this.storageKey, preference);
    }
  }

  translate(key: string): string {
    const value = this.resolvePath(this.dictionary(), key);
    return typeof value === 'string' ? value : key;
  }

  private async loadDictionary(language: SupportedLanguage): Promise<void> {
    try {
      const dictionary = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`/i18n/${language}.json`)
      );
      this.dictionary.set(dictionary);
    } catch {
      if (language !== this.fallbackLanguage) {
        await this.loadDictionary(this.fallbackLanguage);
        this.activeLanguage.set(this.fallbackLanguage);
      }
    }
  }

  private getBrowserLanguage(): SupportedLanguage {
    const browserLanguage = navigator.language.toLowerCase();
    return browserLanguage.startsWith('de') ? 'de' : 'en';
  }

  private readStoredPreference(): LanguagePreference | null {
    const storedValue = localStorage.getItem(this.storageKey);
    if (storedValue === 'de' || storedValue === 'en') {
      return storedValue;
    }
    return null;
  }

  private resolvePath(dictionary: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, dictionary);
  }
}
