import { HAP } from '../HAP';
import { Service } from '../interfaces/HAP';
import { AirQuality } from '../interfaces/PurifierStatus';
import { AbstractService } from './AbstractService';

export class AirQualityService extends AbstractService {

  register(): void {
    let airQualityService = this.getOrCreateAirQualityService();

    airQualityService.getCharacteristic(HAP.Characteristic.AirQuality)
      .on('get', this.getAirQuality.bind(this));
  }

  getOrCreateAirQualityService(): Service {
    let airQualityService = this.accessory.getService(HAP.Service.AirQualitySensor);

    if (!airQualityService) {
      airQualityService = this.accessory.addService(HAP.Service.AirQualitySensor, this.purifier.name + ' Air Quality');
    }

    return airQualityService;
  }

  async getAirQuality(callback): Promise<void> {
    let result;

    try {
      let status = await this.purifier.waitForStatusUpdate();

      switch (status.airQuality) {
        case AirQuality.Excellent:
          result = HAP.Characteristic.AirQuality.EXCELLENT;
          break;
        case AirQuality.Good:
          result = HAP.Characteristic.AirQuality.GOOD;
          break;
        case AirQuality.Fair:
          result = HAP.Characteristic.AirQuality.FAIR;
          break;
        case AirQuality.Inferior:
          result = HAP.Characteristic.AirQuality.INFERIOR;
          break;
      }

      callback(null, result);
    } catch(e) {
      callback(e);
    }
  }
}