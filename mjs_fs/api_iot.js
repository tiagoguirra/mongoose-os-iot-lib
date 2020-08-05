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
    let mqttTopic = Cfg.get('mqtt_events');
    let deviceId = Cfg.get('device.id');
    let device = {
      event: 'register_device',
      device_id: deviceId,
      device_name: Cfg.get('custom.device_name'),
      user_id: Cfg.get('custom.user_id'),
      properties: properties,
      device_template: template,
      topic_events: mqttTopic,
    };
    print('Register device', JSON.stringify(device));
    MQTT.pub(mqttTopic, JSON.stringify(device), 0);
    if (initialState) {
      this.desired(initialState);
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
    MQTT.pub(Cfg.get('mqtt_events'), JSON.stringify(device), 0);
  },
  sensorChange: function(property, state, type) {
    let deviceId = Cfg.get('device.id');
    let device = {
      event: type ? type : 'physical_interaction',
      device_id: deviceId,
      property: property,
      state: state,
    };
    MQTT.pub(Cfg.get('mqtt_events'), JSON.stringify(device), 0);
  },
  handler: function(callback) {
    Shadow.addHandler(callback);
  },
  report: function(state) {
    print('reportState', JSON.stringify(state));
    Shadow.update(0, state);
  },
};
