#pragma once

#include "driver/gpio.h"

#define DS18B20_GPIO GPIO_NUM_5

#define WATER_SENSOR_GPIO 25

/* ========= DEVICE ID ========= */
#define DEVICE_ID        "esp32_01"

/* ========= WIFI CONFIG ========= */
#define WIFI_SSID     "Yashwanth"
#define WIFI_PASSWORD "haha2209"

/* ========= MQTT CONFIG ========= */
#define MQTT_BROKER_URI "mqtts://z32b6f21.ala.asia-southeast1.emqxsl.com:8883"
#define MQTT_USERNAME   "esp_fleet"
#define MQTT_PASSWORD   "strongpassword123"

/* ========= MQTT TOPICS ========= */
#define TOPIC_BASE           "devices/" DEVICE_ID

#define TOPIC_STATUS         TOPIC_BASE "/status"
#define TOPIC_OTA_CMD        TOPIC_BASE "/ota/cmd"
#define TOPIC_OTA_STATUS     TOPIC_BASE "/ota/status"
#define TOPIC_OTA_PROGRESS   TOPIC_BASE "/ota/progress"

#define TOPIC_STATUS_ONLINE  TOPIC_BASE "/status_online"
#define TOPIC_FIRMWARE       TOPIC_BASE "/firmware"
#define TOPIC_HEARTBEAT      TOPIC_BASE "/heartbeat"
#define TOPIC_HEALTH         TOPIC_BASE "/health"

//#define TOPIC_OTA_CMD        TOPIC_BASE "/ota"

#define TOPIC_LOGS           TOPIC_BASE "/logs"

#define TOPIC_SENSORS       TOPIC_BASE "/sensors"

