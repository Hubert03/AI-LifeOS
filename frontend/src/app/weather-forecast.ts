import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface WeatherForecast {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string | null;
}

@Injectable({ providedIn: 'root' })
export class WeatherForecastService {
  private readonly http = inject(HttpClient);

  getForecast(): Observable<WeatherForecast[]> {
    return this.http.get<WeatherForecast[]>('/WeatherForecast');
  }
}
