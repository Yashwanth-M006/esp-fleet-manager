

#include "water_sensor.h"
#include "device_config.h"

#include "driver/gpio.h"
#include "esp_log.h"

static const char *TAG = "WATER_SENSOR";

void water_sensor_init(void)
{
    ESP_LOGI(TAG, "Initializing water sensor");

    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << WATER_SENSOR_GPIO),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };

    gpio_config(&io_conf);
}

int water_sensor_read(void)
{
    int state = gpio_get_level(WATER_SENSOR_GPIO);

    if (state == 1)
    {
        ESP_LOGI(TAG, "Water Detected");
    }
    else
    {
        ESP_LOGI(TAG, "No Water");
    }

    return state;
}