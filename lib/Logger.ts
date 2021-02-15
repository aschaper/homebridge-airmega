import { Log } from "./interfaces/HAP";

class AirmegaLogger {
  public  log: Log;
  private debugMode: boolean;
  private diagnosticMode: boolean;

  setLogger(log: Log, debugMode: boolean, diagnosticMode: boolean): void {
    this.log = log;
    this.debugMode = debugMode;
    this.diagnosticMode = diagnosticMode;
  }

  debug(message: string, data?: any): void {
    if (!this.debugMode) return;

    let result = message;
    if (data) {
      result += `: ${JSON.stringify(data)}`
    }

    this.log(result);
  }

  diagnostic(message: string, data?: any): void {
      if (!this.diagnosticMode) return;

      let result = message;
      if (data) {
          result += `: ${JSON.stringify(data)}`
      }

      this.log(result);
  }

  error(message: string, error: Error) {
    this.log(`[ERROR] ${message}. ${error.message}`)
  }
}

export const Logger = new AirmegaLogger();