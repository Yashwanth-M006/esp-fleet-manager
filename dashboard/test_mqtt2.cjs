const mqtt = require('mqtt');

const options = {
  username: "esp_fleet",
  password: "strongpassword123",
  reconnectPeriod: 5000,
  // Let default protocol version (4)
};

console.log("Connecting w/ default protocol...");
const client = mqtt.connect('wss://z32b6f21.ala.asia-southeast1.emqxsl.com:8084/mqtt', options);

client.on('connect', () => {
  console.log("Connected successfully!");
  client.end();
  process.exit(0);
});

client.on('error', (err) => {
  console.log("Connection error: ", err);
});

client.on('close', () => {
  console.log("Connection closed.");
});
