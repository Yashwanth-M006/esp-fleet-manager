#include "ds18b20_sensor.h"
#include "device_config.h"

#include "esp_log.h"

#include "owb.h"
#include "owb_rmt.h"
#include "ds18b20.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "DS18B20";

static OneWireBus *owb;
static DS18B20_Info *sensor;

void ds18b20_sensor_init()
{
    ESP_LOGI(TAG, "Initializing DS18B20");

    owb_rmt_driver_info rmt_driver;

    owb = owb_rmt_initialize(&rmt_driver, DS18B20_GPIO, RMT_CHANNEL_1, RMT_CHANNEL_0);

    owb_use_crc(owb, true);

    sensor = ds18b20_malloc();

    /* FIXED DEVICE DETECTION */
    OneWireBus_SearchState search_state = {0};
    bool found = false;

    owb_search_first(owb, &search_state, &found);

    if (!found) {
        ESP_LOGE(TAG, "DS18B20 NOT FOUND!");
        return;
    }

    OneWireBus_ROMCode rom_code = search_state.rom_code;

    ds18b20_init(sensor, owb, rom_code);

    ds18b20_use_crc(sensor, true);
    ds18b20_set_resolution(sensor, DS18B20_RESOLUTION_12_BIT);

    ESP_LOGI(TAG, "DS18B20 ready");
}


float ds18b20_sensor_read()
{
    ds18b20_convert_all(owb);

    vTaskDelay(pdMS_TO_TICKS(750));

    float temp = 0;

    ds18b20_read_temp(sensor, &temp);

    ESP_LOGI(TAG, "Temperature: %.2f", temp);

    return temp;
}