import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { apiErrorMessage } from '../../core/http-error';
import { WorkSummary } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';
import { WorksService } from '../../core/works.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, MoneyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardPage implements OnInit {
  private readonly worksService = inject(WorksService);
  private readonly auth = inject(AuthService);

  readonly works = signal<WorkSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly user = this.auth.user;

  readonly firstName = computed(() => this.user()?.fullName?.trim().split(/\s+/)[0] || 'maestro');

  readonly totals = computed(() =>
    this.works().reduce(
      (accumulator, work) => ({
        material: accumulator.material + work.materialTotal,
        labor: accumulator.labor + work.laborTotal,
        total: accumulator.total + work.total
      }),
      { material: 0, labor: 0, total: 0 }
    )
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.worksService.list().subscribe({
      next: (works) => {
        this.works.set(works);
        this.loading.set(false);
      },
      error: (cause: unknown) => {
        this.error.set(apiErrorMessage(cause));
        this.loading.set(false);
      }
    });
  }

  remove(work: WorkSummary, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!window.confirm(`¿Eliminar la obra "${work.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.worksService.remove(work.id).subscribe({
      next: () => this.works.update((list) => list.filter((item) => item.id !== work.id)),
      error: (cause: unknown) => this.error.set(apiErrorMessage(cause))
    });
  }

  share(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }
}
