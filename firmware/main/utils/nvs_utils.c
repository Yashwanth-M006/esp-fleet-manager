#include "nvs_utils.h"

#include "esp_log.h"
#include "nvs_flash.h"

static const char *TAG = "NVS_UTILS";

void nvs_init_safe(void)
{
    esp_err_t ret = nvs_flash_init();

    if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
        ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {

        ESP_LOGW(TAG, "NVS partition corrupted or outdated, erasing...");

        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());

        ESP_LOGI(TAG, "NVS re-initialized successfully");
    } else {
        ESP_ERROR_CHECK(ret);
        ESP_LOGI(TAG, "NVS initialized successfully");
    }
}
