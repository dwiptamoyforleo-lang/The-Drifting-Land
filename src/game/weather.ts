import { WeatherType } from './types';

export class WeatherSystem {
  public current: WeatherType = 'clear';
  private timer: number = 0;
  private changeInterval: number = 90.0;

  constructor(preset: string = 'balanced') {
    if (preset === 'low') {
      this.current = 'clear';
    }
  }

  public update(delta: number, playerAltitude: number) {
    this.timer += delta;
    if (this.timer >= this.changeInterval) {
      this.timer = 0;
      const weatherOptions: WeatherType[] = ['clear', 'windy', 'cloudy', playerAltitude > 20 ? 'storm' : 'clear'];
      const randIdx = Math.floor(Math.random() * weatherOptions.length);
      this.current = weatherOptions[randIdx];
    }
  }
}
