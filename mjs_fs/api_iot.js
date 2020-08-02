load('api_config.js');
load('api_mqtt.js');

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
      let desired = {
        state: {
          desired: initialState,
        },
      };
      MQTT.pub(
        '$aws/things/' + deviceId + '/shadow/update',
        JSON.stringify(desired),
        1
      );
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
    let desired = {
      state: {
        desired: state,
      },
    };
    MQTT.pub(
      '$aws/things/' + deviceId + '/shadow/update',
      JSON.stringify(desired),
      1
    );
    MQTT.pub(Cfg.get('mqtt_events'), JSON.stringify(device), 0);
  },
};
