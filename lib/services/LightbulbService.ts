import { HAP } from '../HAP';
import { Service } from '../interfaces/HAP';
import { Light, Power } from '../interfaces/PurifierStatus';
import { Logger } from '../Logger';
import { AbstractService } from './AbstractService';

export class LightbulbService extends AbstractService {

  register(): void {
    let lightService = this.getOrCreateLightbulbService();

    lightService.getCharacteristic(HAP.Characteristic.On)
      .on('get', this.getLightIndicator.bind(this))
      .on('set', this.setLightIndicator.bind(this));
  }

  getOrCreateLightbulbService(): Service {
    let lightbulbService = this.accessory.getService(HAP.Service.Lightbulb);

    if (!lightbulbService) {
       lightbulbService = this.accessory.addService(HAP.Service.Lightbulb, this.purifier.name + ' Light');
    }

    return lightbulbService;
  }

  async getLightIndicator(callback): Promise<void> {
    try {
      let status = await this.purifier.waitForStatusUpdate();

      if (status.power == Power.Off) {
        return callback(null, false);
      }

      callback(null, status.light == Light.On);
    } catch(e) {
      callback(e);
    }
  }

  async setLightIndicator(targetState, callback): Promise<void> {
    try {
      await this.client.setLight(this.purifier.id, targetState);

      callback();
    } catch(e) {
      Logger.error('Unable to control light', e);
      callback(e);
    }
  }
}