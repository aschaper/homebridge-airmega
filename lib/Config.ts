export namespace Config {
  export const BASE_URI = 'https://iocareapp.coway.com/bizmob.iocare';
  export const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1';

  export namespace ContentType {
    export const FORM = 'application/x-www-form-urlencoded';
    export const JSON = 'application/json';
  }

  export namespace Auth {
    export const OAUTH_URL = 'https://idp.coway.com/oauth2/v1/authorize'
    export const SIGNIN_URL = 'https://idp.coway.com/user/signin/';
    export const REDIRECT_URL = 'https://iocareapp.coway.com/bizmob.iocare/redirect/redirect.html';
    export const CLIENT_ID = 'UmVuZXdhbCBBcHA';
    export const SERVICE_CODE = 'com.coway.IOCareKor';
    export const COWAY_ACCESS_TOKEN = 'coway_access_token';
    export const COWAY_REFRESH_TOKEN = 'coway_refresh_token';
  }

  export namespace Endpoints {
    export const DEVICE_LIST = 'CWIG0304';
    export const DEVICE_REFRESH = 'CWIG0602';
    export const TOKEN_REFRESH = 'CWIL0100';
    export const STATUS = 'CWIA0120';
    export const CONTROL = 'CWIG0603';
    export const FILTERS = 'CWIA0800';
  }

  export namespace Codes {
    export const POWER = '0001';
    export const MODE = '0002';
    export const FAN = '0003';
    export const LIGHT = '0007';
  }

  export namespace Filters {
    export const PRE_FILTER = '3121332';
    export const MAIN_FILTER = '3111735';
  }
}
