#include "ota_mgr.h"

#include <string.h>
#include <stdlib.h>
#include <ctype.h>

#include "esp_log.h"
#include "esp_https_ota.h"
#include "esp_app_desc.h"
#include "esp_system.h"
#include "esp_crt_bundle.h"
#include "esp_ota_ops.h"
#include "esp_http_client.h"

#include "cJSON.h"

#include "device_config.h"
#include "mqtt_mgr.h"

/* ===================================================== */

static const char *TAG = "OTA_MGR";

static char ota_url[256];
static char ota_version[32];

/* ===================================================== */

static void sanitize_json(char *json)
{
    unsigned char *u = (unsigned char *)json;
    if (u[0] == 0xEF && u[1] == 0xBB && u[2] == 0xBF)
        memmove(json, json + 3, strlen(json + 3) + 1);

    char *start = json;
    while (*start && (isspace((unsigned char)*start) || *start == '\''))
        start++;

    char *end = start + strlen(start);
    while (end > start) {
        unsigned char last = (unsigned char)*(end - 1);
        if (isspace(last) || last == '\'' || last == '\r' || last == '\n')
            end--;
        else
            break;
    }
    *end = '\0';

    if (start != json)
        memmove(json, start, (size_t)(end - start) + 1);

    char *src = json, *dst = json;
    while (*src) {
        if (*src == '\\' && *(src + 1) == '"') { *dst++ = '"'; src += 2; }
        else { *dst++ = *src++; }
    }
    *dst = '\0';
}

/* ===================================================== */

static void publish_status(const char *state, const char *reason)
{
    char payload[256];
    if (reason)
        snprintf(payload, sizeof(payload),
                 "{\"state\":\"%s\",\"version\":\"%s\",\"reason\":\"%s\"}",
                 state, ota_version, reason);
    else
        snprintf(payload, sizeof(payload),
                 "{\"state\":\"%s\",\"version\":\"%s\"}",
                 state, ota_version);
    ESP_LOGI(TAG, "Publishing STATUS: %s", payload);
    mqtt_client_publish(TOPIC_OTA_STATUS, payload);
}

/* ===================================================== */
/*
 * Progress publishing — two modes:
 *
 *  Mode A  (total_len > 0):  Content-Length header was received.
 *          Publishes percentage 0-100 on every 1% step.
 *          Payload: {"progress":42,"version":"1.1.0"}
 *
 *  Mode B  (total_len == 0): GCS uses chunked transfer — no
 *          Content-Length header is sent. This was why progress
 *          messages were never published: the old guard
 *          "if (total_len > 0)" skipped every publish.
 *          Now we publish every PROGRESS_BYTES_STEP bytes instead.
 *          Payload: {"progress":-1,"bytes":65536,"version":"1.1.0"}
 *          (progress = -1 tells subscriber only byte count is available)
 */
#define PROGRESS_BYTES_STEP (16 * 1024)   /* one publish every 16 KB */

static void publish_progress_pct(int pct)
{
    char payload[128];
    snprintf(payload, sizeof(payload),
             "{\"progress\":%d,\"version\":\"%s\"}", pct, ota_version);
    ESP_LOGI(TAG, "PROGRESS: %d%%", pct);
    mqtt_client_publish(TOPIC_OTA_PROGRESS, payload);
}

static void publish_progress_bytes(int bytes)
{
    char payload[128];
    snprintf(payload, sizeof(payload),
             "{\"progress\":-1,\"bytes\":%d,\"version\":\"%s\"}",
             bytes, ota_version);
    ESP_LOGI(TAG, "PROGRESS: %d bytes (chunked, no Content-Length)", bytes);
    mqtt_client_publish(TOPIC_OTA_PROGRESS, payload);
}

/* ===================================================== */

typedef struct {
    int  total_len;            /* from Content-Length header, 0 if absent  */
    int  read_len;             /* bytes received so far                     */
    int  last_reported_pct;    /* last % published          (Mode A)        */
    int  last_reported_step;   /* last 16 KB threshold      (Mode B)        */
    int  http_status;          /* HTTP response status code                 */
    bool status_published;     /* have we published "downloading" yet?      */
} http_progress_ctx_t;

static http_progress_ctx_t s_progress_ctx;

static esp_err_t http_event_handler(esp_http_client_event_t *evt)
{
    switch (evt->event_id) {

    case HTTP_EVENT_ON_CONNECTED:
        ESP_LOGI(TAG, "HTTP: connected");
        s_progress_ctx.total_len          = 0;
        s_progress_ctx.read_len           = 0;
        s_progress_ctx.last_reported_pct  = -1;
        s_progress_ctx.last_reported_step = 0;
        s_progress_ctx.http_status        = 0;
        s_progress_ctx.status_published   = false;
        break;

    /*
     * HTTP_EVENT_ON_HEADER fires once per response header line.
     * We use it to catch "Content-Length" from the server response
     * so we know total firmware size for percentage calculation.
     *
     * NOTE: HTTP_EVENT_HEADERS_DONE does not exist in ESP-IDF.
     *       HTTP_EVENT_HEADERS_SENT is for request headers going OUT,
     *       not response headers coming IN — do not use that either.
     */
    case HTTP_EVENT_ON_HEADER:
        if (evt->header_key && evt->header_value) {
            ESP_LOGD(TAG, "Header: %s: %s",
                     evt->header_key, evt->header_value);

            /* Case-insensitive match for Content-Length */
            if (strcasecmp(evt->header_key, "Content-Length") == 0) {
                s_progress_ctx.total_len = atoi(evt->header_value);
                ESP_LOGI(TAG, "Content-Length: %d bytes",
                         s_progress_ctx.total_len);
            }
        }
        break;

    /*
     * HTTP_EVENT_ON_DATA — first call is where we read the HTTP status
     * code (it is reliably non-zero here) and publish "downloading".
     * Subsequent calls accumulate bytes and publish progress.
     */
    case HTTP_EVENT_ON_DATA:
        /* Read status code once on first data chunk */
        if (!s_progress_ctx.status_published) {
            s_progress_ctx.http_status =
                esp_http_client_get_status_code(evt->client);

            ESP_LOGI(TAG, "HTTP: status=%d  content-length=%d",
                     s_progress_ctx.http_status,
                     s_progress_ctx.total_len);

            if (s_progress_ctx.total_len <= 0)
                ESP_LOGW(TAG, "HTTP: no Content-Length (chunked) — "
                              "using bytes-based progress");

            if (s_progress_ctx.http_status == 200) {
                publish_status("downloading", NULL);
            } else {
                ESP_LOGE(TAG, "HTTP: server returned error %d",
                         s_progress_ctx.http_status);
            }
            s_progress_ctx.status_published = true;
        }

        /* Only count bytes for a successful 200 response */
        if (s_progress_ctx.http_status == 200 && evt->data_len > 0) {
            s_progress_ctx.read_len += evt->data_len;

            if (s_progress_ctx.total_len > 0) {
                /* Mode A — percentage */
                int p = (s_progress_ctx.read_len * 100) /
                         s_progress_ctx.total_len;
                if (p != s_progress_ctx.last_reported_pct) {
                    publish_progress_pct(p);
                    s_progress_ctx.last_reported_pct = p;
                }
            } else {
                /* Mode B — bytes, throttled to every PROGRESS_BYTES_STEP */
                int step = s_progress_ctx.read_len / PROGRESS_BYTES_STEP;
                if (step > s_progress_ctx.last_reported_step) {
                    publish_progress_bytes(s_progress_ctx.read_len);
                    s_progress_ctx.last_reported_step = step;
                }
            }
        }
        break;

    case HTTP_EVENT_ON_FINISH:
        ESP_LOGI(TAG, "HTTP: transfer complete (%d bytes total)",
                 s_progress_ctx.read_len);
        /*
         * Publish a final marker so subscriber always gets a completion
         * message before the "flashing" status arrives.
         */
        if (s_progress_ctx.total_len > 0)
            publish_progress_pct(100);
        else
            publish_progress_bytes(s_progress_ctx.read_len);
        publish_status("flashing", NULL);
        break;

    case HTTP_EVENT_ERROR:
        ESP_LOGE(TAG, "HTTP: transport error");
        publish_status("failed", "http_transport_error");
        break;

    default:
        break;
    }

    return ESP_OK;
}

/* ===================================================== */

void ota_mgr_init(void)
{
    ESP_LOGI(TAG, "OTA manager initialized");
    memset(ota_url,         0, sizeof(ota_url));
    memset(ota_version,     0, sizeof(ota_version));
    memset(&s_progress_ctx, 0, sizeof(s_progress_ctx));
}

/* ===================================================== */

void ota_mgr_handle_command(const char *json)
{
    const esp_app_desc_t *app     = esp_app_get_description();
    const char           *current = app->version;

    char json_buf[512];
    strncpy(json_buf, json, sizeof(json_buf) - 1);
    json_buf[sizeof(json_buf) - 1] = '\0';

    ESP_LOGI(TAG, "RAW JSON: %s", json_buf);
    sanitize_json(json_buf);
    ESP_LOGI(TAG, "SANITIZED JSON: %s", json_buf);

    cJSON *root = cJSON_Parse(json_buf);
    if (!root) {
        const char *ep = cJSON_GetErrorPtr();
        if (ep) ESP_LOGE(TAG, "JSON parse error near: [%.30s] 0x%02X",
                         ep, (unsigned char)*ep);
        publish_status("failed", "invalid_json");
        return;
    }

    cJSON *action  = cJSON_GetObjectItem(root, "action");
    cJSON *version = cJSON_GetObjectItem(root, "version");
    cJSON *url     = cJSON_GetObjectItem(root, "url");

    if (!cJSON_IsString(action) || !cJSON_IsString(version) || !cJSON_IsString(url)) {
        publish_status("failed", "missing_fields");
        goto cleanup;
    }
    if (strcmp(action->valuestring, "ota") != 0) {
        publish_status("failed", "unsupported_action");
        goto cleanup;
    }
    if (strcmp(version->valuestring, current) == 0) {
        publish_status("rejected", "same_version");
        goto cleanup;
    }

    strncpy(ota_version, version->valuestring, sizeof(ota_version) - 1);
    ota_version[sizeof(ota_version) - 1] = '\0';
    strncpy(ota_url, url->valuestring, sizeof(ota_url) - 1);
    ota_url[sizeof(ota_url) - 1] = '\0';

    ESP_LOGI(TAG, "OTA: %s -> %s", current, ota_version);
    ESP_LOGI(TAG, "URL: %s", ota_url);

    const esp_partition_t *ota_part = esp_ota_get_next_update_partition(NULL);
    if (!ota_part) {
        ESP_LOGE(TAG, "No OTA partition — check partitions.csv");
        publish_status("failed", "no_ota_partition");
        goto cleanup;
    }
    ESP_LOGI(TAG, "OTA partition '%s': %lu bytes",
             ota_part->label, (unsigned long)ota_part->size);

    publish_status("started", NULL);

    esp_http_client_config_t http_cfg = {
        .url               = ota_url,
        .event_handler     = http_event_handler,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .timeout_ms        = 15000,
        .keep_alive_enable = true,
    };
    esp_https_ota_config_t ota_cfg = { .http_config = &http_cfg };

    esp_err_t ret = esp_https_ota(&ota_cfg);

    if (ret == ESP_OK) {
        publish_status("success", NULL);
        ESP_LOGI(TAG, "OTA SUCCESS -> rebooting");
        vTaskDelay(pdMS_TO_TICKS(1000));
        esp_restart();
    } else {
        char reason[48];
        int  st = s_progress_ctx.http_status;

        if (st == 403) {
            snprintf(reason, sizeof(reason), "http_403_forbidden");
            ESP_LOGE(TAG, "CAUSE: GCS object is not public (403)");
        } else if (st == 404) {
            snprintf(reason, sizeof(reason), "http_404_not_found");
            ESP_LOGE(TAG, "CAUSE: File not found (404)");
        } else if (st != 200 && st != 0) {
            snprintf(reason, sizeof(reason), "http_%d", st);
            ESP_LOGE(TAG, "CAUSE: HTTP error %d", st);
        } else if (ret == ESP_ERR_OTA_VALIDATE_FAILED) {
            snprintf(reason, sizeof(reason), "invalid_image");
            ESP_LOGE(TAG, "CAUSE: Firmware image validation failed");
        } else {
            snprintf(reason, sizeof(reason), "%s", esp_err_to_name(ret));
            ESP_LOGE(TAG, "OTA FAILED: %s", esp_err_to_name(ret));
        }

        publish_status("failed", reason);
    }

cleanup:
    cJSON_Delete(root);
}

/* ===================================================== */

const char *ota_mgr_last_status(void)
{
    return "completed";
}