const mqtt = require('mqtt');

const options = {
  username: "esp_fleet",
  password: "strongpassword123",
  reconnectPeriod: 5000,
  protocolId: "MQIsdp",
  protocolVersion: 3,
  rejectUnauthorized: false
};

console.log("Connecting...");
const client = mqtt.connect('wss://z32b6f21.ala.asia-southeast1.emqxsl.com:8084/mqtt', options);

client.on('connect', () => {
  console.log("Connected successfully!");
  client.end();
});

client.on('error', (err) => {
  console.log("Connection error: ", err);
});

client.on('close', () => {
  console.log("Connection closed.");
});
