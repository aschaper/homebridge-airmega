import { HAP } from '../HAP';
import { Service } from '../interfaces/HAP';
import { Mode, Power } from '../interfaces/PurifierStatus';
import { Logger } from '../Logger';
import { AbstractService } from './AbstractService';

export class PurifierService extends AbstractService {
  purifierService: Service;

  register(): void {
    this.purifierService = this.getOrCreatePurifierService();

    this.purifierService.getCharacteristic(HAP.Characteristic.Active)
      .on('get', this.getActiveState.bind(this))
      .on('set', this.setActiveState.bind(this));

    this.purifierService.getCharacteristic(HAP.Characteristic.CurrentAirPurifierState)
      .on('get', this.getCurrentAirPurifierState.bind(this));

    this.purifierService.getCharacteristic(HAP.Characteristic.TargetAirPurifierState)
      .on('get', this.getTargetPurifierState.bind(this))
      .on('set', this.setTargetPurifierState.bind(this));

    this.purifierService.getCharacteristic(HAP.Characteristic.RotationSpeed)
      .on('get', this.getRotationSpeed.bind(this))
      .on('set', this.setRotationSpeed.bind(this));
  }

  getOrCreatePurifierService(): Service {
    let purifierService = this.accessory.getService(HAP.Service.AirPurifier);

    if (!purifierService) {
        purifierService = this.accessory.addService(HAP.Service.AirPurifier, this.purifier.name + ' Purifier');
    }

    return purifierService;
  }

  async getActiveState(callback): Promise<void> {
    try {
      let status = await this.purifier.waitForStatusUpdate();

      if (status.power == Power.On) {
        callback(null, HAP.Characteristic.Active.ACTIVE);
      } else {
        callback(null, HAP.Characteristic.Active.INACTIVE);
      }
    } catch(e) {
      callback(e);
    }
  }

  async setActiveState(targetState, callback): Promise<void> {
    // Only toggle power when new state is different.
    // Prevents extraneous calls especially when changing
    // the fan speed (setRotationSpeed ensures device is on).
    if (Number(this.purifier.power) == targetState) {
      callback();
      Logger.diagnostic('PurifierService.setActiveState targetState = this.purifier.power');
      return;
    }

    try {
      await this.client.setPower(this.purifier.id, targetState);

      if (targetState) {
        Logger.diagnostic('PurifierService.setActiveState targetState = Power.On');
        this.purifierService.setCharacteristic(HAP.Characteristic.CurrentAirPurifierState, HAP.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        this.purifier.power = Power.On;
      } else {
        Logger.diagnostic('PurifierService.setActiveState targetState = Power.Off');
        this.purifierService.setCharacteristic(HAP.Characteristic.CurrentAirPurifierState, HAP.Characteristic.CurrentAirPurifierState.INACTIVE);
        this.purifier.power = Power.Off;
      }

      // Update light accessory to accurately reflect new state after toggling power
      let lightService = this.accessory.getService(HAP.Service.Lightbulb);
      if (lightService) {
        lightService.getCharacteristic(HAP.Characteristic.On).updateValue(targetState);
      }

      callback();
    } catch(e) {
      Logger.error('Unable to toggle power', e);
      callback(e);
    }
  }

  async getCurrentAirPurifierState(callback): Promise<void> {
    try {
      let status = await this.purifier.waitForStatusUpdate();

      if (status.power == Power.Off) {
        callback(null, HAP.Characteristic.CurrentAirPurifierState.INACTIVE);
        return;
      }

      if (status.mode == Mode.Sleep || status.mode == Mode.AutoSleep) {
        callback(null, HAP.Characteristic.CurrentAirPurifierState.IDLE);
        return;
      }

      callback(null, HAP.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
    } catch(e) {
      Logger.error('Unable to get current state', e);
      callback(e);
    }
  }

  async getTargetPurifierState(callback): Promise<void> {
    try {
      let status = await this.purifier.waitForStatusUpdate();

      if (status.mode == Mode.Auto) {
        callback(null, HAP.Characteristic.TargetAirPurifierState.AUTO);
      } else {
        callback(null, HAP.Characteristic.TargetAirPurifierState.MANUAL);
      }
    } catch(e) {
      callback(e);
    }
  }

  async setTargetPurifierState(targetState, callback): Promise<void> {
      if (Number(this.purifier.mode) == targetState) {
          callback();
          Logger.diagnostic('PurifierService.setTargetPurifierState targetState = this.purifier.mode');
          return;
      }

      try {
      await this.client.setMode(this.purifier.id, targetState);

      if (targetState) {
        Logger.diagnostic('PurifierService.setTargetPurifierState targetState = Mode.Auto');
        this.purifier.mode = Mode.Auto;
        this.purifierService.getCharacteristic(HAP.Characteristic.CurrentAirPurifierState)
                            .updateValue(HAP.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
      } else {
        Logger.diagnostic('PurifierService.setTargetPurifierState targetState = Mode.Manual');
        this.purifier.mode = Mode.Manual;
        this.purifierService.getCharacteristic(HAP.Characteristic.CurrentAirPurifierState)
                            .updateValue(HAP.Characteristic.CurrentAirPurifierState.IDLE);
      }

      callback();
    } catch(e) {
      Logger.error('Unable to set new state', e);
      callback(e);
    }
  }

  async getRotationSpeed(callback): Promise<void> {
    let intervals = {
      1: 20,
      2: 50,
      3: 100
    };

    try {
      let status = await this.purifier.waitForStatusUpdate();

      callback(null, intervals[status.fan]);
    } catch(e) {
      callback(e);
    }
  }

  async setRotationSpeed(targetState, callback) {
    let targetSpeed;
    let ranges = {
      1: [0, 40],
      2: [40, 70],
      3: [70, 100]
    };

    for (let key in ranges) {
      let range = ranges[key];

      if (targetState > range[0] && targetState <= range[1]) {
        targetSpeed = key;
        break;
      }
    }

    if (this.purifier.fan == targetSpeed && this.purifier.mode == Mode.Manual) {
      Logger.diagnostic('PurifierService.setRotationSpeed targetState = this.purifier.fan && mode = Manual');
     
      return callback();
    }
    else
        Logger.diagnostic(`PurifierService.setRotationSpeed Current speed = ${this.purifier.fan} & Target speed = ${targetSpeed} & Mode = ${this.purifier.mode}`);

    try {
      await this.client.setFanSpeed(this.purifier.id, targetSpeed);

      this.purifier.fan = targetSpeed;

      Logger.diagnostic('PurifierService.setRotationSpeed CurrentAirPurifierState = PURIFYING_AIR');
      this.purifierService.getCharacteristic(HAP.Characteristic.CurrentAirPurifierState)
                          .updateValue(HAP.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);

      Logger.diagnostic('PurifierService.setRotationSpeed TargetAirPurifierState = MANUAL');
      this.purifier.mode = Mode.Manual;
      this.purifierService.getCharacteristic(HAP.Characteristic.TargetAirPurifierState)
                          .updateValue(HAP.Characteristic.TargetAirPurifierState.MANUAL);

      callback();
    } catch(e) {
      Logger.error('Unable to set fan speed', e);
      callback(e);
    }
  }
}