#include "reporter.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"
#include "esp_timer.h"
#include "esp_system.h"
#include "esp_app_desc.h"
#include "ds18b20_sensor.h"
#include "water_sensor.h"

#include "mqtt_mgr.h"
#include "device_config.h"

static const char *TAG = "REPORTER";

/* ================= HEARTBEAT CONFIG ================= */
#define HEARTBEAT_INTERVAL_MS 30000   // 30 seconds

static esp_timer_handle_t heartbeat_timer;

/* ==================================================== */

static void publish_heartbeat_cb(void *arg)
{
    char payload[128];

    int64_t uptime_sec = esp_timer_get_time() / 1000000;

    snprintf(payload, sizeof(payload),
             "{"
             "\"uptime_sec\":%lld"
             "}",
             uptime_sec);

    reporter_publish_status_online("online");

    mqtt_client_publish(TOPIC_HEARTBEAT, payload);
    reporter_publish_temperature();
    reporter_publish_water();

    
}

/* ==================================================== */
/* PUBLIC API IMPLEMENTATION                            */
/* ==================================================== */

void reporter_start(void)
{
    ESP_LOGI(TAG, "Starting reporter");

    esp_timer_create_args_t timer_args = {
        .callback = &publish_heartbeat_cb,
        .name = "heartbeat_timer"
    };

    ESP_ERROR_CHECK(
        esp_timer_create(&timer_args, &heartbeat_timer)
    );

    ESP_ERROR_CHECK(
        esp_timer_start_periodic(
            heartbeat_timer,
            HEARTBEAT_INTERVAL_MS * 1000
        )
    );

    ESP_LOGI(TAG, "Heartbeat started (%d ms)", HEARTBEAT_INTERVAL_MS);
}

/* ---------------------------------------------------- */

void reporter_publish_status_online(const char *state)
{
    char payload[128];

    snprintf(payload, sizeof(payload),
             "{"
             "\"state\":\"%s\""
             "}",
             state);

    mqtt_client_publish(TOPIC_STATUS_ONLINE, payload);
}

void reporter_publish_status(const char *state)
{
    char payload[128];

    snprintf(payload, sizeof(payload),
             "{"
             "\"state\":\"%s\""
             "}",
             state);

    mqtt_client_publish(TOPIC_STATUS, payload);
}


/* ---------------------------------------------------- */

void reporter_publish_firmware(void)
{
    const esp_app_desc_t *app = esp_app_get_description();

    char payload[256];

    snprintf(payload, sizeof(payload),
             "{"
             "\"device_id\":\"%s\","
             "\"fw_version\":\"%s\","
             "\"build_date\":\"%s\""
             "}",
             DEVICE_ID,
             app->version,
             app->date);

    mqtt_client_publish(TOPIC_FIRMWARE, payload);
}

/* ---------------------------------------------------- */

void reporter_publish_health(void)
{
    char payload[256];

    snprintf(payload, sizeof(payload),
             "{"
             "\"heap_free\":%lu,"
             "\"heap_min\":%lu,"
             "\"reset_reason\":%d"
             "}",
             esp_get_free_heap_size(),
             esp_get_minimum_free_heap_size(),
             esp_reset_reason());

    mqtt_client_publish(TOPIC_HEALTH, payload);
}

/* ---------------------------------------------------- */

void reporter_publish_heartbeat(void)
{
    /* Immediate heartbeat trigger if needed */
    publish_heartbeat_cb(NULL);
    
}

/* ---------------------------------------------------- */

void reporter_publish_log(const char *level,
                          const char *tag,
                          const char *message)
{
    char payload[256];

    snprintf(payload, sizeof(payload),
             "{"
             "\"level\":\"%s\","
             "\"tag\":\"%s\","
             "\"message\":\"%s\""
             "}",
             level,
             tag,
             message);

    mqtt_client_publish(TOPIC_LOGS, payload);
}


void reporter_publish_temperature(void)
{
    float temp = ds18b20_sensor_read();

    char payload[128];

    snprintf(payload, sizeof(payload),
             "{\"temperature\": %.2f}", temp);

    mqtt_client_publish(TOPIC_TEMPERATURE, payload);
}


void reporter_publish_water()
{
    int value = water_sensor_read();

    char payload[128];

    if (value == 1) {
        snprintf(payload, sizeof(payload),
                 "{\"water\":\"Water detected\"}");
    } else {
        snprintf(payload, sizeof(payload),
                 "{\"water\":\"No water\"}");
    }

    mqtt_client_publish(TOPIC_WATER_SENSOR, payload);
}