import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from './calculation';

@Pipe({
  name: 'money',
  standalone: true
})
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, prefix = true): string {
    return formatMoney(value, prefix);
  }
}
