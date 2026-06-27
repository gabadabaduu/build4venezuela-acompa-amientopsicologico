import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ResourceService } from '../../services/resource.service';
import type { Resource } from '../../models/resource.model';

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './resource-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceListPage implements OnInit {
  private readonly resourceService = inject(ResourceService);

  resources = signal<Resource[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    void this.loadResources();
  }

  async loadResources() {
    this.loading.set(true);
    this.error.set('');

    try {
      const data = await this.resourceService.getResources();
      this.resources.set(data);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar recursos');
    } finally {
      this.loading.set(false);
    }
  }

  typeLabel(type: Resource['type']): string {
    const labels: Record<Resource['type'], string> = {
      article: 'Artículo',
      exercise: 'Ejercicio',
      guide: 'Guía',
    };
    return labels[type];
  }
}
