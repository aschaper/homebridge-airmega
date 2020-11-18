export enum Power {
  On = '1',
  Off = '0'
}

export enum Light {
  On = '2',
  Off = '0'
}

export enum Fan {
  Low = '1',
  Medium = '2',
  High = '3'
}

export enum Mode {
  Manual = '0',
  Auto = '1',
  Sleep = '2',
  AutoSleep = '6'
}

export enum AirQuality {
  Excellent = '1',
  Good = '2',
  Fair = '3',
  Inferior = '4'
}

export interface Status {
  power: Power
  light: Light
  fan: Fan
  mode: Mode
  airQuality: AirQuality
}

export interface FilterStatus {
  name: string
  lifeLevel: number
  code: string
}

export interface Metadata {
  nickname: string
  barcode: string
}