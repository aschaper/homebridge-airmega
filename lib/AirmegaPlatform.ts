import { Authenticator } from './Authenticator';
import { HAP } from './HAP';
import { Accessory, Log, Platform, Service } from './interfaces/HAP';
import { Logger } from './Logger';
import { Purifier } from './Purifier';
import { AirQualityService } from './services/AirQualityService';
import { FilterService } from './services/FilterService';
import { LightbulbService } from './services/LightbulbService';
import { PurifierService } from './services/PurifierService';
import { PluginConfig } from './interfaces/PluginConfig';

export class AirmegaPlatform {
  platform: Platform;
  accessories: Map<string, Accessory>;
  log: Log;

  constructor(log: Log, config: PluginConfig, platform: Platform) {
    Logger.setLogger(log, config.debug, config.diagnostic);

    this.platform = platform;
    this.accessories = new Map<string, Accessory>();

    if (!this.platform) return;

    this.platform.on('didFinishLaunching', () => {
      if (!config.username || !config.password) {
        throw Error('Username and password fields are required in config');
      }

      Logger.log('Authenticating...');

      try {
        let authenticator = new Authenticator();

        authenticator.login(config.username, config.password).then(tokens => {
          authenticator.getPurifiers(tokens).then(purifiers => {
            purifiers.forEach(purifier => this.registerAccessory(purifier, config));
          });
        });
      } catch(e) {
        Logger.error('Unable to authenticate', e);
      }
    });
  }

  configureAccessory(accessory: Accessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  registerAccessory(purifier: Purifier, config: any): void {
    let uuid = HAP.UUID.generate(purifier.name);
    let accessory = this.accessories.get(uuid);

    if (!accessory) {
      accessory = new HAP.Accessory(purifier.name, uuid);
      this.accessories.set(accessory.UUID, accessory);

        this.platform.registerPlatformAccessories('homebridge-airmega', 'Airmega', [accessory]);
    }

    this.registerServices(purifier, accessory, config);

    Logger.log(`Found ${purifier.name}`);
  }

  registerServices(purifier: Purifier, accessory: Accessory, config: PluginConfig): void {
    accessory.getService(HAP.Service.AccessoryInformation)
      .setCharacteristic(HAP.Characteristic.Manufacturer, 'Coway')
      .setCharacteristic(HAP.Characteristic.Model, 'Airmega')
      .setCharacteristic(HAP.Characteristic.SerialNumber, purifier.id);

    let purifierService = new PurifierService(purifier, accessory);
    purifierService.register();

    let airQualityService = new AirQualityService(purifier, accessory);
    airQualityService.register();

    let filterService = new FilterService(purifier, accessory);
    filterService.register();

    let lightService = new LightbulbService(purifier, accessory);

    if (this.shouldExcludeAccessory(config, 'lightbulb')) {
      this.removeService(accessory, HAP.Service.Lightbulb);
    } else {
      lightService.register();
    }
  }

  shouldExcludeAccessory(config: PluginConfig, name: string) {
    if (!config.hasOwnProperty('exclude')) return false;

    return config.exclude.includes(name);
  }

  removeService(accessory: Accessory, service: Service): void {
    accessory.services.forEach(existingService => {
      if (existingService.UUID == service.UUID) {
        accessory.removeService(existingService);
      }
    });
  }
}