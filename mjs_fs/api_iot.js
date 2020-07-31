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
  register: function(template, properties) {
    let mqttTopic = Cfg.get('mqtt_events');
    let device = {
      event: 'register_device',
      device_id: Cfg.get('device.id'),
      device_name: Cfg.get('custom.device_name'),
      user_id: Cfg.get('custom.user_id'),
      properties: properties,
      device_template: template,
      topic_events: mqttTopic,
    };
    print('Register device', JSON.stringify(device));
    MQTT.pub(mqttTopic, JSON.stringify(device), 0);
  },
  interaction: function(property, state, type) {
    let device = {
      event: type ? type : 'physical_interaction',
      device_id: Cfg.get('device.id'),
      property: property,
      state: state,
    };
    MQTT.pub(Cfg.get('mqtt_events'), JSON.stringify(device), 0);
  },
};
