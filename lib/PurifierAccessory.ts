import { PurifierProperties, PurifierMetadataProperties } from './interfaces/Purifier';
import { Accessory, Service } from './interfaces/HAP';
import { Purifier } from './Purifier';
import { Logger } from './Logger';
import { Hap } from './HAP';

export class PurifierAccessory {
  purifier: Purifier;
  properties: PurifierMetadataProperties;
  accessory: Accessory;
  purifierService: Service;

  constructor(accessory: Accessory, properties: PurifierMetadataProperties) {
    this.properties = properties;
    this.accessory = accessory;
    this.purifier = new Purifier(properties.productId);

    this.setupAccessoryInformationServiceCharacteristics();
    this.setupPurifierServiceCharacteristics();
    this.setupAirQualityServiceCharacteristics();
    this.setupFilterMaintenanceServiceCharacteristics();
    this.setupLightbulbServiceCharacteristics();

    this.accessory.updateReachability(true);
  }

  getOrCreatePurifierService(): Service {
    let purifierService = this.accessory.getService(Hap.Service.AirPurifier);

    if (!purifierService) {
      purifierService = this.accessory.addService(Hap.Service.AirPurifier, this.properties.aliasName);
    }
    
    return purifierService;
  }

  getOrCreateAirQualityService(): Service {
    let airQualityService = this.accessory.getService(Hap.Service.AirQualitySensor);

    if (!airQualityService) {
      airQualityService = this.accessory.addService(Hap.Service.AirQualitySensor, this.properties.aliasName);
    }
    
    return airQualityService;
  }

  getOrCreatePreFilterService(): Service {
    let filterService = this.accessory.getServiceByUUIDAndSubType(Hap.Service.FilterMaintenance, 'pre');

    if (!filterService) {
      filterService = this.accessory.addService(Hap.Service.FilterMaintenance, 'Pre Filter', 'pre');
    }
    
    return filterService;
  }

  getOrCreateMainFilterService(): Service {
    let filterService = this.accessory.getServiceByUUIDAndSubType(Hap.Service.FilterMaintenance, 'main');

    if (!filterService) {
      filterService = this.accessory.addService(Hap.Service.FilterMaintenance, 'Max 2 Filter', 'main');
    }
    
    return filterService;
  }

  getOrCreateLightbulbService(): Service {
    let lightbulbService = this.accessory.getService(Hap.Service.Lightbulb);

    if (!lightbulbService) {
      lightbulbService = this.accessory.addService(Hap.Service.Lightbulb, this.properties.aliasName);
    }
    
    return lightbulbService;
  }

  setupAccessoryInformationServiceCharacteristics(): void {
    this.accessory.getService(Hap.Service.AccessoryInformation)
      .setCharacteristic(Hap.Characteristic.Manufacturer, 'Coway')
      .setCharacteristic(Hap.Characteristic.Model, 'Airmega')
      .setCharacteristic(Hap.Characteristic.SerialNumber, '123-456-789');
  }

  setupPurifierServiceCharacteristics(): void {
    this.purifierService = this.getOrCreatePurifierService();

    this.purifierService.getCharacteristic(Hap.Characteristic.Active)
      .on('get', this.getActive.bind(this))
      .on('set', this.setActiveCharacteristic.bind(this));

    this.purifierService.getCharacteristic(Hap.Characteristic.CurrentAirPurifierState)
      .on('get', this.getCurrentAirPurifierState.bind(this));

    this.purifierService.getCharacteristic(Hap.Characteristic.TargetAirPurifierState)
      .on('get', this.getTargetPurifierState.bind(this))
      .on('set', this.setTargetPurifierState.bind(this));

    this.purifierService.getCharacteristic(Hap.Characteristic.RotationSpeed)
      .on('get', this.getRotationSpeed.bind(this))
      .on('set', this.setRotationSpeed.bind(this));
  }

  setupFilterMaintenanceServiceCharacteristics(): void {
    let mainFilterService = this.getOrCreateMainFilterService();
    let preFilterService = this.getOrCreatePreFilterService();    

  this.accessory.getServiceByUUIDAndSubType(Hap.Service.FilterMaintenance, 'main')
    .getCharacteristic(Hap.Characteristic.FilterChangeIndication)
    .on('get', this.getMainFilterChangeIndication.bind(this));

  this.accessory.getServiceByUUIDAndSubType(Hap.Service.FilterMaintenance, 'main')
    .getCharacteristic(Hap.Characteristic.FilterLifeLevel)
    .on('get', this.getMainFilterLifeLevel.bind(this));

  this.accessory.getServiceByUUIDAndSubType(Hap.Service.FilterMaintenance, 'pre')
    .getCharacteristic(Hap.Characteristic.FilterChangeIndication)
    .on('get', this.getPreFilterChangeIndication.bind(this));

  this.accessory.getServiceByUUIDAndSubType(Hap.Service.FilterMaintenance, 'pre')
    .getCharacteristic(Hap.Characteristic.FilterLifeLevel)
    .on('get', this.getPreFilterLifeLevel.bind(this));
  }

  setupAirQualityServiceCharacteristics(): void {
    let airQualityService = this.getOrCreateAirQualityService();

    airQualityService.getCharacteristic(Hap.Characteristic.AirQuality)
      .on('get', this.getAirQuality.bind(this));
  }

  setupLightbulbServiceCharacteristics(): void {
    let lightbulbService = this.getOrCreateLightbulbService();

    lightbulbService.getCharacteristic(Hap.Characteristic.On)
      .on('get', this.getLightIndicator.bind(this))
      .on('set', this.setLightIndicator.bind(this));
  }

  getActive(callback): void {
    if (!this.purifier.properties) return;
    
    if (this.purifier.properties.power) {
      Logger.log(this.properties.aliasName, 'is active');
      callback(null, Hap.Characteristic.Active.ACTIVE);
    } else {
      Logger.log(this.properties.aliasName, 'is inactive');
      callback(null, Hap.Characteristic.Active.INACTIVE);        
    }
  }

  setActiveCharacteristic(targetState, callback) {
    if (!this.purifier.properties) return;

    // Only toggle power when new state is different.
    // Prevents extraneous calls especially when changing
    // the fan speed (setRotationSpeed ensures device is on).
    if (this.purifier.properties.power == targetState) {
      callback(null);
      return;
    }

    this.purifier.togglePower(targetState).then(() => {
      Logger.log(this.properties.aliasName, `Turning ${targetState ? 'on' : 'off'}`);

      // Need to set the current purifier state characteristic here
      // otherwise accessory hangs on 'Turning on...'/'Turning off...'
      if (targetState) {
        this.purifierService.setCharacteristic(Hap.Characteristic.CurrentAirPurifierState, Hap.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
      } else {
        this.purifierService.setCharacteristic(Hap.Characteristic.CurrentAirPurifierState, Hap.Characteristic.CurrentAirPurifierState.INACTIVE);
      }

      callback(null);
    }).catch((err) => {
      Logger.log(err);
      callback(err);
    });
  }

  getCurrentAirPurifierState(callback): void {
    if (!this.purifier.properties) return;
    this.purifier.getLatestData();
    
    if (!this.purifier.properties.power) {
      callback(null, Hap.Characteristic.CurrentAirPurifierState.INACTIVE);
      return;
    }

    if (this.purifier.properties.fanSpeed == 0 || this.purifier.properties.mode == 2 || this.purifier.properties.mode == 6) {
      Logger.log('Current state is idle');
      callback(null, Hap.Characteristic.CurrentAirPurifierState.IDLE);
      return;
    }

    Logger.log('Current state is purifying');
    callback(null, Hap.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
  }

  getTargetPurifierState(callback): void {
    if (!this.purifier.properties) return;
    
    if (this.purifier.properties.mode == 0) {
      Logger.log('Target purifier state is manual');
      callback(null, Hap.Characteristic.TargetAirPurifierState.MANUAL);
    } else {
      Logger.log('Target purifier state is auto');
      callback(null, Hap.Characteristic.TargetAirPurifierState.AUTO);
    }
  }

  setTargetPurifierState(targetState, callback): void {
    let targetMode;
    
    if (targetState) {
      Logger.log('Setting mode to auto');
      targetMode = -1;
    } else {
      Logger.log('Setting mode to manual');
      targetMode = 1;
    }

    this.purifier.setFanSpeed(targetMode).then(() => {
      callback(null);
    }).catch((err) => {
      Logger.log(err);
      callback(err);
    });
  }

  getRotationSpeed(callback) {
    let intervals = {1: 20, 2: 50, 3: 100};
    let fanSpeed = intervals[this.purifier.properties.fanSpeed];

    Logger.log(`Rotation speed is ${fanSpeed}`);
    callback(null, fanSpeed);
  }

  setRotationSpeed(targetState, callback) {
    let targetSpeed;
    let ranges = {1: [0, 40], 2: [40, 70], 3: [70, 100]};

    for (var key in ranges) {
      var currentSpeed = ranges[key];

      if (targetState > currentSpeed[0] && targetState <= currentSpeed[1]) {
        targetSpeed = key;
        break;
      }
    }

    Logger.log(`Setting rotation speed to ${targetSpeed}`);

    this.purifier.setFanSpeed(targetSpeed).then(() => {
      callback(null);
    }).catch((err) => {
      Logger.log(err);
      callback(err);
    });
  }

  getPreFilterChangeIndication(callback) {
    if (this.purifier.properties.filter2ExchAlarm) {
      callback(null, Hap.Characteristic.FilterChangeIndication.CHANGE_FILTER);
    } else {
      callback(null, Hap.Characteristic.FilterChangeIndication.FILTER_OK);
    }
  }

  getPreFilterLifeLevel(callback) {
    this.purifier.getFilterLifeLevels().then((data) => {
      callback(null, data.prefilter);
    }).catch((err) => {
      Logger.log(err);
      callback(err);
    });
  }

  getMainFilterChangeIndication(callback) {
    if (!this.purifier.properties) return;

    if (this.purifier.properties.filter1ExchAlarm) {
      callback(null, Hap.Characteristic.FilterChangeIndication.CHANGE_FILTER);
    } else {
      callback(null, Hap.Characteristic.FilterChangeIndication.FILTER_OK);
    }
  }

  getMainFilterLifeLevel(callback) {
    if (!this.purifier.properties) return;

    this.purifier.getFilterLifeLevels().then((data) => {
      callback(null, data.hepafilter);
    }).catch((err) => {
      Logger.log(err);
      callback(err);
    });
  }

  getAirQuality(callback): void {
    if (!this.purifier.properties) return;

    let result;
    switch (this.purifier.properties.dustPollutionLev) {
      case 1:
        result = Hap.Characteristic.AirQuality.EXCELLENT;
        break;
      case 2:
        result = Hap.Characteristic.AirQuality.GOOD;
        break;
      case 3:
        result = Hap.Characteristic.AirQuality.FAIR;
        break;
      case 4:
        result = Hap.Characteristic.AirQuality.INFERIOR;
        break;
    }

    callback(null, result);
  }

  getLightIndicator(callback): void {
    if (!this.purifier.properties) return;
    
    this.purifier.getLatestData().then(() => {
      let isOn: boolean = (this.purifier.properties.mood == 2);

      callback(null, isOn);
    }).catch((err) => {
      callback(err);
    });
  }

  setLightIndicator(targetState, callback): void {
    Logger.log(`Turning light ${(targetState ? 'on' : 'off')}`);

    this.purifier.toggleLight(targetState).then(() => {
      callback(null);
    }).catch((err) => {
      callback(err);
    });
  }
}