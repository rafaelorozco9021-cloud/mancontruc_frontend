import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from './api';
import { WorkCalculation, WorkDetail, WorkInput, WorkSummary } from './models';

@Injectable({ providedIn: 'root' })
export class WorksService {
  private readonly http = inject(HttpClient);

  list(): Observable<WorkSummary[]> {
    return this.http.get<WorkSummary[]>(`${API_BASE}/works`);
  }

  get(id: string): Observable<WorkDetail> {
    return this.http.get<WorkDetail>(`${API_BASE}/works/${id}`);
  }

  create(input: WorkInput): Observable<WorkDetail> {
    return this.http.post<WorkDetail>(`${API_BASE}/works`, input);
  }

  update(id: string, input: WorkInput): Observable<WorkDetail> {
    return this.http.put<WorkDetail>(`${API_BASE}/works/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/works/${id}`);
  }

  preview(input: WorkInput): Observable<WorkCalculation> {
    return this.http.post<WorkCalculation>(`${API_BASE}/works/preview`, input);
  }

  estimatePrices(input: WorkInput): Observable<WorkInput> {
    return this.http.post<WorkInput>(`${API_BASE}/works/estimate-prices`, input);
  }

  generate(description: string): Observable<WorkInput> {
    return this.http.post<WorkInput>(`${API_BASE}/works/generate`, { description });
  }
}
