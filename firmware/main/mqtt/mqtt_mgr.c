#include "mqtt_mgr.h"

#include <string.h>
#include <stdlib.h>

#include "esp_log.h"
#include "esp_event.h"
#include "mqtt_client.h"
#include "device_config.h"
#include "ota_mgr.h"
#include "reporter.h"

/* =========================================================
 * TLS ROOT CA
 * ========================================================= */
extern const uint8_t emqxsl_ca_pem_start[] asm("_binary_emqxsl_ca_pem_start");
extern const uint8_t emqxsl_ca_pem_end[]   asm("_binary_emqxsl_ca_pem_end");
/* ========================================================= */

static const char *TAG = "MQTT_MGR";

static esp_mqtt_client_handle_t client = NULL;
static bool mqtt_connected = false;

/* ========================================================= */

bool is_mqtt_connected(void)
{
    return mqtt_connected;
}

/* =========================================================
 * MQTT EVENT HANDLER
 * ========================================================= */
static void mqtt_event_handler(void *arg,
                               esp_event_base_t event_base,
                               int32_t event_id,
                               void *event_data)
{
    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;

    switch (event->event_id) {

    case MQTT_EVENT_CONNECTED:
        ESP_LOGI(TAG, "MQTT connected");
        mqtt_connected = true;

        /* Subscribe to OTA topic */
        esp_mqtt_client_subscribe(client, TOPIC_OTA_CMD, 1);

        /* Start reporter AFTER connection */
        reporter_start();

        /* Initial publishes */
        reporter_publish_status("online");
        reporter_publish_firmware();
        reporter_publish_health();

        break;

    case MQTT_EVENT_DISCONNECTED:
        ESP_LOGW(TAG, "MQTT disconnected");
        mqtt_connected = false;

        /* DO NOT publish here (connection already lost) */
        break;

    case MQTT_EVENT_DATA: {
        char *payload = calloc(1, event->data_len + 1);
        if (!payload) {
            ESP_LOGE(TAG, "Payload alloc failed");
            break;
        }

        memcpy(payload, event->data, event->data_len);

        ESP_LOGI(TAG, "MQTT RX topic=%.*s payload=%s",
                 event->topic_len, event->topic, payload);

        /* Safer topic match */
        if (strncmp(event->topic, TOPIC_OTA_CMD, event->topic_len) == 0 &&
            strlen(TOPIC_OTA_CMD) == event->topic_len) {

            ota_mgr_handle_command(payload);
        }

        free(payload);
        break;
    }

    default:
        break;
    }
}

/* =========================================================
 * PUBLIC API
 * ========================================================= */

void mqtt_client_start(void)
{
    ESP_LOGI(TAG, "Starting MQTT client");

    esp_mqtt_client_config_t cfg = {
        .broker.address.uri = MQTT_BROKER_URI,

        .credentials.username = MQTT_USERNAME,
        .credentials.authentication.password = MQTT_PASSWORD,

        /* TLS */
        .broker.verification.certificate =
            (const char *)emqxsl_ca_pem_start,

        .session.keepalive = 60,
        .network.disable_auto_reconnect = false,
    };

    client = esp_mqtt_client_init(&cfg);
    ESP_ERROR_CHECK(client != NULL ? ESP_OK : ESP_FAIL);

    ESP_ERROR_CHECK(
        esp_mqtt_client_register_event(
            client,
            ESP_EVENT_ANY_ID,
            mqtt_event_handler,
            NULL));

    ESP_ERROR_CHECK(esp_mqtt_client_start(client));
}

/* ========================================================= */

bool mqtt_client_publish(const char *topic, const char *payload)
{
    if (!mqtt_connected || client == NULL) {
        ESP_LOGW(TAG, "Publish skipped (not connected)");
        return false;
    }

    ESP_LOGI(TAG, "Publishing -> %s : %s", topic, payload);

    esp_mqtt_client_publish(
        client,
        topic,
        payload,
        0,
        1,
        0
    );

    return true;
}

/* ========================================================= */

bool mqtt_client_is_connected(void)
{
    return mqtt_connected;
}