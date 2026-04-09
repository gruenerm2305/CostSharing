import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from './translation.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private readonly translationService: TranslationService) {}

  transform(key: string): string {
    this.translationService.activeLanguage();
    return this.translationService.translate(key);
  }
}
