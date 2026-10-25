import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { calculateWork, emptyWorkInput } from '../../core/calculation';
import { apiErrorMessage } from '../../core/http-error';
import {
  LaborInput,
  MaterialInput,
  WorkDetail,
  WorkInput,
  WorkItemInput
} from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';
import { WorksService } from '../../core/works.service';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

@Component({
  selector: 'app-work-editor-page',
  imports: [ReactiveFormsModule, RouterLink, MoneyPipe],
  templateUrl: './work-editor.html',
  styleUrl: './work-editor.scss'
})
export class WorkEditorPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly worksService = inject(WorksService);
  private readonly subscription: Subscription;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly estimating = signal(false);
  readonly generating = signal(false);
  readonly generationPrompt = signal('');
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly workId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  readonly isEdit = computed(() => this.workId() !== null);
  readonly formValue = signal<WorkInput>(emptyWorkInput());
  readonly calculation = computed(() => calculateWork(this.formValue()));

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    clientName: ['', [Validators.maxLength(160)]],
    location: ['', [Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(1000)]],
    items: this.fb.array<FormGroup>([])
  });

  constructor() {
    this.subscription = this.form.valueChanges.subscribe((value) => {
      this.formValue.set(this.toInput(value));
      this.notice.set(null);
    });
  }

  ngOnInit(): void {
    this.formValue.set(this.toInput(this.form.getRawValue()));
    const id = this.workId();
    if (id) {
      this.loadWork(id);
    } else {
      this.addItem();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  materials(item: AbstractControl): FormArray {
    return item.get('materials') as FormArray;
  }

  labors(item: AbstractControl): FormArray {
    return item.get('labors') as FormArray;
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  addMaterial(item: AbstractControl): void {
    this.materials(item).push(this.createMaterialGroup());
  }

  removeMaterial(item: AbstractControl, index: number): void {
    this.materials(item).removeAt(index);
  }

  addLabor(item: AbstractControl): void {
    this.labors(item).push(this.createLaborGroup());
  }

  removeLabor(item: AbstractControl, index: number): void {
    this.labors(item).removeAt(index);
  }

  save(): void {
    if (this.saving() || this.loading()) {
      return;
    }

    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos marcados en rojo antes de guardar.');
      return;
    }

    const input = this.toInput(this.form.getRawValue());
    const structuralError = this.validate(input);
    if (structuralError) {
      this.error.set(structuralError);
      return;
    }

    const id = this.workId();
    const request = id ? this.worksService.update(id, input) : this.worksService.create(input);

    this.saving.set(true);
    request.subscribe({
      next: (detail) => {
        this.saving.set(false);

        if (!id) {
          void this.router.navigate(['/obras', detail.id], { replaceUrl: true });
          return;
        }

        this.applyDetail(detail);
        this.notice.set('Cambios guardados. El servidor recalculó y confirmó los totales.');
      },
      error: (cause: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(cause));
      }
    });
  }

  removeWork(): void {
    const id = this.workId();
    if (!id || this.saving()) {
      return;
    }

    if (!window.confirm('¿Eliminar esta obra y todos sus cálculos? Esta acción no se puede deshacer.')) {
      return;
    }

    this.saving.set(true);
    this.worksService.remove(id).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/']);
      },
      error: (cause: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(cause));
      }
    });
  }

  estimatePrices(): void {
    if (this.estimating() || this.saving() || this.loading()) {
      return;
    }

    this.error.set(null);

    const input = this.toInput(this.form.getRawValue());
    const structuralError = this.validate(input);
    if (structuralError) {
      this.error.set(structuralError);
      return;
    }

    this.estimating.set(true);
    this.worksService.estimatePrices(input).subscribe({
      next: (estimated) => {
        this.estimating.set(false);

        for (let i = 0; i < this.items.length; i++) {
          const item = this.items.at(i);
          const estimatedItem = estimated.items[i];
          if (!estimatedItem) {
            continue;
          }

          const materials = this.materials(item);
          for (let j = 0; j < materials.length; j++) {
            const estimatedMaterial = estimatedItem.materials[j];
            if (estimatedMaterial) {
              materials.at(j).get('unitPrice')?.setValue(estimatedMaterial.unitPrice);
            }
          }

          const labors = this.labors(item);
          for (let j = 0; j < labors.length; j++) {
            const estimatedLabor = estimatedItem.labors[j];
            if (estimatedLabor) {
              labors.at(j).get('unitRate')?.setValue(estimatedLabor.unitRate);
            }
          }
        }

        this.notice.set('Precios estimados con IA. Revisa y ajusta antes de guardar.');
      },
      error: (cause: unknown) => {
        this.estimating.set(false);
        this.error.set(apiErrorMessage(cause));
      }
    });
  }

  generateWork(): void {
    if (this.generating() || this.saving() || this.loading()) {
      return;
    }

    const description = this.generationPrompt().trim();
    if (!description) {
      this.error.set('Describe el trabajo que quieres presupuestar.');
      return;
    }

    this.generating.set(true);
    this.error.set(null);

    this.worksService.generate(description).subscribe({
      next: (generated) => {
        this.generating.set(false);
        this.applyInput(generated);
        this.notice.set('Presupuesto generado con IA. Revisa cantidades, precios y ajusta antes de guardar.');
      },
      error: (cause: unknown) => {
        this.generating.set(false);
        this.error.set(apiErrorMessage(cause));
      }
    });
  }

  private applyInput(input: WorkInput): void {
    this.items.clear();

    for (const item of input.items) {
      const group = this.createItemGroup({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        wastePercent: item.wastePercent,
        notes: item.notes
      });

      const materialArray = group.get('materials') as FormArray;
      for (const material of item.materials) {
        materialArray.push(
          this.createMaterialGroup({
            description: material.description,
            unit: material.unit,
            quantityPerUnit: material.quantityPerUnit,
            unitPrice: material.unitPrice
          })
        );
      }

      const laborArray = group.get('labors') as FormArray;
      for (const labor of item.labors) {
        laborArray.push(
          this.createLaborGroup({
            description: labor.description,
            unit: labor.unit,
            quantityPerUnit: labor.quantityPerUnit,
            unitRate: labor.unitRate
          })
        );
      }

      this.items.push(group);
    }

    this.form.patchValue({
      name: input.name,
      clientName: input.clientName,
      location: input.location,
      description: input.description
    });
    this.form.markAsPristine();
    this.formValue.set(this.toInput(this.form.getRawValue()));
  }

  printBudget(): void {
    const calculation = this.calculation();
    const form = this.form.getRawValue() as Record<string, unknown>;
    const money = (value: number) =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(value);

    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) {
      return;
    }

    const itemName = (value: unknown) => (typeof value === 'string' ? value : '');
    const escape = (value: unknown) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Presupuesto</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #111; }
        h1 { margin-bottom: 4px; }
        h2 { margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
        th { background: #f2f2f2; text-align: left; }
        .totals { text-align: right; font-weight: 700; margin-top: 8px; }
        .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
      </style></head><body>`;

    html += `<h1>${escape(form['name'] || 'Presupuesto de obra')}</h1>`;
    html += `<div class="meta">`;
    if (form['clientName']) html += `Cliente: ${escape(form['clientName'])}<br>`;
    if (form['location']) html += `Ubicación: ${escape(form['location'])}<br>`;
    if (form['description']) html += `Descripción: ${escape(form['description'])}<br>`;
    html += `</div>`;

    calculation.items.forEach((item, index) => {
      html += `<h2>${index + 1}. ${escape(item.name || 'Partida')}</h2>`;
      html += `<p class="meta">${item.quantity} ${escape(item.unit)} · desperdicio ${item.wastePercent}%</p>`;

      if (item.materials.length) {
        html += `<table><thead><tr><th>Material</th><th>Unidad</th><th>Cant./unidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead><tbody>`;
        item.materials.forEach((material) => {
          html += `<tr><td>${escape(material.description)}</td><td>${escape(material.unit)}</td><td>${material.quantityPerUnit}</td><td>${money(material.unitPrice)}</td><td>${money(material.lineTotal)}</td></tr>`;
        });
        html += `</tbody></table>`;
        html += `<p class="totals">Materiales: ${money(item.materialTotal)}</p>`;
      }

      if (item.labors.length) {
        html += `<table><thead><tr><th>Mano de obra</th><th>Unidad</th><th>Cant./unidad</th><th>Tarifa</th><th>Subtotal</th></tr></thead><tbody>`;
        item.labors.forEach((labor) => {
          html += `<tr><td>${escape(labor.description)}</td><td>${escape(labor.unit)}</td><td>${labor.quantityPerUnit}</td><td>${money(labor.unitRate)}</td><td>${money(labor.lineTotal)}</td></tr>`;
        });
        html += `</tbody></table>`;
        html += `<p class="totals">Mano de obra: ${money(item.laborTotal)}</p>`;
      }

      html += `<p class="totals">Total partida: ${money(item.total)} (${money(item.unitTotal)} / ${escape(item.unit)})</p>`;
    });

    html += `<h2>Total de la obra</h2>`;
    html += `<p class="totals">Materiales: ${money(calculation.materialTotal)}</p>`;
    html += `<p class="totals">Mano de obra: ${money(calculation.laborTotal)}</p>`;
    html += `<p class="totals">TOTAL: ${money(calculation.total)}</p>`;
    html += `</body></html>`;

    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  share(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  private loadWork(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.worksService.get(id).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.loading.set(false);
      },
      error: (cause: unknown) => {
        this.error.set(apiErrorMessage(cause));
        this.loading.set(false);
      }
    });
  }

  private applyDetail(detail: WorkDetail): void {
    this.workId.set(detail.id);
    this.items.clear();

    for (const item of detail.items) {
      const group = this.createItemGroup({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        wastePercent: item.wastePercent,
        notes: item.notes
      });

      const materialArray = group.get('materials') as FormArray;
      for (const material of item.materials) {
        materialArray.push(
          this.createMaterialGroup({
            description: material.description,
            unit: material.unit,
            quantityPerUnit: material.quantityPerUnit,
            unitPrice: material.unitPrice
          })
        );
      }

      const laborArray = group.get('labors') as FormArray;
      for (const labor of item.labors) {
        laborArray.push(
          this.createLaborGroup({
            description: labor.description,
            unit: labor.unit,
            quantityPerUnit: labor.quantityPerUnit,
            unitRate: labor.unitRate
          })
        );
      }

      this.items.push(group);
    }

    this.form.patchValue({
      name: detail.name,
      clientName: detail.clientName,
      location: detail.location,
      description: detail.description
    });
    this.form.markAsPristine();
    this.formValue.set(this.toInput(this.form.getRawValue()));
  }

  private createItemGroup(data?: Partial<WorkItemInput>): FormGroup {
    return this.fb.group({
      name: [data?.name ?? '', [Validators.required, Validators.maxLength(200)]],
      unit: [data?.unit ?? 'm2', [Validators.required, Validators.maxLength(24)]],
      quantity: [data?.quantity ?? 1, [Validators.required, Validators.min(0.0001)]],
      wastePercent: [data?.wastePercent ?? 0, [Validators.min(0), Validators.max(100)]],
      notes: [data?.notes ?? '', [Validators.maxLength(500)]],
      materials: this.fb.array<FormGroup>([]),
      labors: this.fb.array<FormGroup>([])
    });
  }

  private createMaterialGroup(data?: Partial<MaterialInput>): FormGroup {
    return this.fb.group({
      description: [data?.description ?? '', [Validators.required, Validators.maxLength(200)]],
      unit: [data?.unit ?? 'un', [Validators.required, Validators.maxLength(24)]],
      quantityPerUnit: [
        data?.quantityPerUnit ?? 1,
        [Validators.required, Validators.min(0), Validators.max(1_000_000)]
      ],
      unitPrice: [
        data?.unitPrice ?? 0,
        [Validators.required, Validators.min(0), Validators.max(1_000_000_000)]
      ]
    });
  }

  private createLaborGroup(data?: Partial<LaborInput>): FormGroup {
    return this.fb.group({
      description: [data?.description ?? '', [Validators.required, Validators.maxLength(200)]],
      unit: [data?.unit ?? 'h', [Validators.required, Validators.maxLength(24)]],
      quantityPerUnit: [
        data?.quantityPerUnit ?? 1,
        [Validators.required, Validators.min(0), Validators.max(1_000_000)]
      ],
      unitRate: [
        data?.unitRate ?? 0,
        [Validators.required, Validators.min(0), Validators.max(1_000_000_000)]
      ]
    });
  }

  private toInput(value: unknown): WorkInput {
    const raw = asRecord(value);
    const items = asArray(raw['items']).map((item) => ({
      name: asString(item['name']),
      unit: asString(item['unit']) || 'un',
      quantity: asNumber(item['quantity']),
      wastePercent: asNumber(item['wastePercent']),
      notes: asString(item['notes']),
      materials: asArray(item['materials']).map((material) => ({
        description: asString(material['description']),
        unit: asString(material['unit']) || 'un',
        quantityPerUnit: asNumber(material['quantityPerUnit']),
        unitPrice: asNumber(material['unitPrice'])
      })),
      labors: asArray(item['labors']).map((labor) => ({
        description: asString(labor['description']),
        unit: asString(labor['unit']) || 'h',
        quantityPerUnit: asNumber(labor['quantityPerUnit']),
        unitRate: asNumber(labor['unitRate'])
      }))
    }));

    return {
      name: asString(raw['name']),
      clientName: asString(raw['clientName']),
      location: asString(raw['location']),
      description: asString(raw['description']),
      items
    };
  }

  private validate(input: WorkInput): string | null {
    if (!input.name.trim()) {
      return 'Escribe el nombre de la obra.';
    }

    if (input.items.length === 0) {
      return 'Agrega al menos una partida a la obra.';
    }

    for (let index = 0; index < input.items.length; index++) {
      const item = input.items[index];
      if (!item.name.trim()) {
        return `Escribe el nombre de la partida #${index + 1}.`;
      }

      if (!(item.quantity > 0)) {
        return `La cantidad de la partida #${index + 1} debe ser mayor que cero.`;
      }

      if (item.materials.length === 0 && item.labors.length === 0) {
        return `La partida #${index + 1} necesita al menos un material o una actividad de mano de obra.`;
      }

      if (item.materials.some((material) => !material.description.trim())) {
        return `Completa la descripción de todos los materiales de la partida #${index + 1}.`;
      }

      if (item.labors.some((labor) => !labor.description.trim())) {
        return `Completa la descripción de toda la mano de obra de la partida #${index + 1}.`;
      }
    }

    return null;
  }
}
