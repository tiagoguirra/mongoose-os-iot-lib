load('api_config.js');
load('api_mqtt.js');
load('api_shadow.js');

let IOT = {
  _properties: {},
  ledStatus: function () {
    return ffi('int get_led_gpio_pin()')();
  },
  template: {
    LIGHT: 'light',
    LIGHT_RGB: 'light_rgb',
    LIGHT_BRIGHTNESS: 'light_brightness',
    SMARTLOCK: 'smartlock',
    TEMPERATURE_SENSOR: 'sensorTemperature',
    CONTACT_SENSOR: 'sensorContact',
    DOORBELL: 'doorBell',
  },
  desired: function (state) {
    let desiredState = {
      state: {
        desired: state,
      },
    };
    print('Report desired', JSON.stringify(desiredState));
    MQTT.pub(
      '$aws/things/' + Cfg.get('device.id') + '/shadow/update',
      JSON.stringify(desiredState),
      1
    );
  },
  isPairingMode: function () {
    return Cfg.get('wifi.ap.enable');
  },
  setPairingMode: function () {
    print('Set pairing mode');
    Cfg.set({wifi: {ap: {enable: !Cfg.get('wifi.ap.enable')}}});
  },
  isSensor: function (_template) {
    if (_template === this.template.TEMPERATURE_SENSOR) {
      return true;
    } else if (_template === this.template.CONTACT_SENSOR) {
      return true;
    } else if (_template === this.template.DOORBELL) {
      return true;
    } else {
      return false;
    }
  },
  register: function (template, properties, modes, initialState) {
    let mqttTopic = Cfg.get('iot.events');
    let deviceId = Cfg.get('device.id');
    let device = {
      event: 'register_device',
      device_id: deviceId,
      device_name: Cfg.get('iot.device_name'),
      username: Cfg.get('iot.username'),
      password: Cfg.get('iot.password'),
      properties: properties,
      device_template: template,
      modes: modes,
    };
    this._properties = properties;
    if (!this.isSensor(template)) {
      if (initialState) {
        this.desired(initialState);
      } else {
        let state = {};
        for (let prop in properties) {
          if (prop === 'color') {
            device.properties.color = {
              red: Cfg.get('iot.initial.color.red'),
              green: Cfg.get('iot.initial.color.green'),
              blue: Cfg.get('iot.initial.color.blue'),
            };
            state.red = Cfg.get('iot.initial.color.red');
            state.green = Cfg.get('iot.initial.color.green');
            state.blue = Cfg.get('iot.initial.color.blue');
          } else {
            device.properties[prop] = Cfg.get('iot.initial.' + prop);
            state[prop] = Cfg.get('iot.initial.' + prop);
          }
        }
        this.desired(state);
      }
    }
    print('Register device', JSON.stringify(device));
    MQTT.pub(mqttTopic, JSON.stringify(device), 0);
  },
  interaction: function (property, state, type) {
    let deviceId = Cfg.get('device.id');
    let device = {
      event: type ? type : 'physical_interaction',
      device_id: deviceId,
      property: property,
      state: state,
    };
    this.desired(state);
    MQTT.pub(Cfg.get('iot.events'), JSON.stringify(device), 0);
  },
  handler: function (callback) {
    Shadow.addHandler(callback);
  },
  report: function (state) {
    print('reportState', JSON.stringify(state));
    state.config = {
      user_id: Cfg.get('iot.user_id'),
      device_name: Cfg.get('iot.device_name'),
      pulse: Cfg.get('iot.pulse'),
    };
    state.initialState = {};
    for (let key in this._properties) {
      if (key === 'color') {
        state.initialState['color'] = {
          red: Cfg.get('iot.initial.color.red'),
          green: Cfg.get('iot.initial.color.green'),
          blue: Cfg.get('iot.initial.color.blue'),
        };
        print('Color initial', state.initialState.color);
      } else {
        state.initialState[key] = Cfg.get('iot.initial.' + key);
      }
    }
    Shadow.update(0, state);
  },
  setConfig: function (config) {
    Cfg.set({iot: config});
    Timer.set(
      750,
      0,
      function () {
        Sys.reboot(500);
      },
      null
    );
  },
  setInitialState: function (initial) {
    this.setConfig({initial: initial});
  },
  getPulseTime: function () {
    return Cfg.get('iot.pulse');
  },
  isPulse: function () {
    let pulse = this.getPulseTime();
    if (pulse > 0) {
      return true;
    }
    return false;
  },
  getInitialState: function (property) {
    if (property === 'color') {
      return {
        red: Cfg.get('iot.initial.color.red'),
        green: Cfg.get('iot.initial.color.green'),
        blue: Cfg.get('iot.initial.color.blue'),
      };
    } else {
      return Cfg.get('iot.initial.' + property);
    }
  },
};
