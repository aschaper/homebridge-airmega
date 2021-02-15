import * as request from 'request-promise';

import { Config } from './Config';
import { FilterStatus, Status } from './interfaces/PurifierStatus';
import { Message, MessageHeader, Payload } from './interfaces/Request';
import { Logger } from './Logger';
import { TokenStore } from './TokenStore';

export class Client {
  tokenStore: TokenStore;

  constructor() {
    this.tokenStore = new TokenStore();
  }

  async getStatus(id: string): Promise<Status> {
    let payload: Payload = await this.buildStatusPayload(id, Config.Endpoints.STATUS);

    let response = await this.sendRequest(payload);

    let statusResponse = response.body.prodStatus[0];

    let status: Status = {
      power: statusResponse.power,
      light: statusResponse.light,
      fan: statusResponse.airVolume,
      mode: statusResponse.prodMode,
      airQuality: statusResponse.dustPollution
    }

    return status;
  }

  async getFilterStatus(id: string): Promise<FilterStatus[]> {
    let payload: Payload = await this.buildStatusPayload(id, Config.Endpoints.FILTERS);
    Logger.debug('Sending payload', payload);

    let response = await this.sendRequest(payload);
    Logger.debug('Got response', response);

    let filterStatuses = response.body.filterList.map(filter => {
      let filterStatus: FilterStatus = {
        name: filter.filterName,
        lifeLevel: filter.filterPer,
        code: filter.filterCode
      }

      return filterStatus;
    })

    return filterStatuses;
  }

  async setPower(id: string, on: boolean): Promise<void> {
    let value = on ? '1' : '0';
    let payload = await this.buildControlPayload(id, Config.Codes.POWER, value);
    Logger.diagnostic(`Client.setPower: ${value}`);

    await this.sendControlRequest(id, payload);
  }

  async setMode(id: string, auto: boolean): Promise<void> {
    let value = auto ? '1' : '2';
    let payload = await this.buildControlPayload(id, Config.Codes.MODE, value);
    Logger.diagnostic(`Client.setMode: ${value}`);

    await this.sendControlRequest(id, payload);
  }

  async setFanSpeed(id: string, speed: number): Promise<void> {
    let value = speed.toString();
    let payload = await this.buildControlPayload(id, Config.Codes.FAN, value);
    Logger.diagnostic(`Client.setFanSpeed: ${value}`);

    await this.sendControlRequest(id, payload);
  }

  async setLight(id: string, on: boolean): Promise<void> {
    let value = on ? '2' : '0';
    let payload = await this.buildControlPayload(id, Config.Codes.LIGHT, value);

    await this.sendControlRequest(id, payload);
  }

  private async sendControlRequest(id: string, payload: Payload): Promise<void> {
    await this.sendRequest(payload);
    await this.refreshStatus(id);
  }

  // The API requires this endpoint to be called whenever a control request
  // is sent, otherwise they are ignored.
  private async refreshStatus(id: string): Promise<void> {
    let messageHeader: MessageHeader = await this.buildMessageHeader(Config.Endpoints.DEVICE_REFRESH);

    let message: Message = {
      header: messageHeader,
      body: {
        barcode: id,
        dvcBrandCd: 'MG',
        prodName: 'AIRMEGA',
        dvcTypeCd: '004'
      }
    }

    let payload = this.buildPayload(Config.Endpoints.DEVICE_REFRESH, message);

    await this.sendRequest(payload);
  }

  private async buildStatusMessage(id: string, endpoint: string): Promise<Message> {
    let messageHeader: MessageHeader = await this.buildMessageHeader(endpoint);

    let message: Message = {
      header: messageHeader,
      body: {
        barcode: id,
        dvcBrandCd: 'MG',
        prodName: 'AIRMEGA',
        stationCd: '',
        resetDttm: '',
        deviceType: '004'
      }
    }

    return message;
  }

  private async buildStatusPayload(id: string, endpoint: string): Promise<Payload> {
    let message = await this.buildStatusMessage(id, endpoint);
    let payload = this.buildPayload(endpoint, message);

    return payload;
  }

  private async buildControlPayload(id:string, code: string, value: string): Promise<Payload> {
    let endpoint = Config.Endpoints.CONTROL;
    let messageHeader: MessageHeader = await this.buildMessageHeader(endpoint);

    let message: Message = {
      header: messageHeader,
      body: {
        barcode: id,
        dvcBrandCd: 'MG',
        dvcTypeCd: '004',
        prodName: 'AIRMEGA',
        funcList: [{
          comdVal: value,
          funcId: code
        }]
      }
    }

    let payload = this.buildPayload(endpoint, message);

    return payload;
  }

  private async sendRequest(payload: Payload) {
    Logger.debug('Sending payload', payload);

    let response = await request.post(payload);
    Logger.debug('Response', response);

    return response;
  }

  async buildMessageHeader(endpoint: string): Promise<MessageHeader> {
    let tokens = await this.tokenStore.getTokens();

    let header: MessageHeader = {
      trcode: endpoint,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }

    return header;
  }

  buildPayload(endpoint: string, message: Message): Payload {
    let payload: Payload = {
      uri: `${Config.BASE_URI}/${endpoint}.json`,
      headers: {
        'User-Agent': Config.USER_AGENT,
        'Content-Type': Config.ContentType.FORM,
        Accept: 'application/json'
      },
      json: true,
      form: `message=${encodeURIComponent(JSON.stringify(message))}`
    }

    return payload;
  }
}