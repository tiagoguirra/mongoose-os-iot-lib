load('api_config.js');
load('api_mqtt.js');
load('api_shadow.js');

let IOT = {
  ledStatus: function() {
    return ffi('int get_led_gpio_pin()')();
  },
  template: {
    LIGHT: 'light',
    LIGHT_RGB: 'light_rgb',
    LIGHT_BRIGHTNESS: 'light_brightness',
    SMARTLOCK: 'smartlock',
  },
  desired: function(state) {
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
  isPairingMode: function() {
    return Cfg.get('wifi.ap.enable');
  },
  setPairingMode: function() {
    print('Set pairing mode');
    Cfg.set({wifi: {ap: {enable: !Cfg.get('wifi.ap.enable')}}});
  },
  register: function(template, properties, initialState) {
    let mqttTopic = Cfg.get('iot.events');
    let deviceId = Cfg.get('device.id');
    let device = {
      event: 'register_device',
      device_id: deviceId,
      device_name: Cfg.get('iot.device_name'),
      user_id: Cfg.get('iot.user_id'),
      properties: properties,
      device_template: template,
      topic_events: mqttTopic,
    };
    print('Register device', JSON.stringify(device));
    MQTT.pub(mqttTopic, JSON.stringify(device), 0);
    if (initialState) {
      this.desired(initialState);
    } else {
      let state = {};
      for (let prop in properties) {
        if (prop === 'color') {
          state.red = Cfg.get('iot.initial.color.red');
          state.green = Cfg.get('iot.initial.color.green');
          state.blue = Cfg.get('iot.initial.color.blue');
        } else {
          state[prop] = Cfg.get('iot.initial.' + prop);
        }
      }
      this.desired(state);
    }
  },
  interaction: function(property, state, type) {
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
  handler: function(callback) {
    Shadow.addHandler(callback);
  },
  report: function(state) {
    state.config = {
      user_id: Cfg.get('iot.user_id'),
      device_name: Cfg.get('iot.device_name'),
      pulse: Cfg.get('iot.pulse'),
    };
    state.initialState = Cfg.get('iot.initial');
    print('reportState', JSON.stringify(state));
    Shadow.update(0, state);
  },
  setConfig: function(config) {
    let changeConfig = Cfg.get('iot');
    for (let key in config) {
      changeConfig[key] = config[key];
    }
    Cfg.set({iot: changeConfig});
    Timer.set(
      750,
      0,
      function() {
        Sys.reboot(500);
      },
      null
    );
  },
  setInitialState: function(initial) {
    let changeInitialState = Cfg.get('iot.initial');
    for (let key in initial) {
      changeInitialState[key] = initial[key];
    }
    this.setConfig({initial: changeInitialState});
  },
  getPulseTime: function() {
    return Cfg.get('iot.pulse');
  },
  isPulse: function() {
    let pulse = this.getPulseTime();
    if (pulse > 0) {
      return true;
    }
    return false;
  },
};
