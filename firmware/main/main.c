#include "nvs_utils.h"
#include "wifi_mgr.h"
#include "mqtt_mgr.h"
#include "ota_mgr.h"
#include "reporter.h"
#include "ds18b20_sensor.h"

/*
void app_main(void)
{
    nvs_init_safe();
    wifi_mgr_init();
    mqtt_client_start();
    ota_mgr_init();
    reporter_start();
    reporter_publish_firmware();
    reporter_publish_health();
    reporter_publish_heartbeat();

    ds18b20_sensor_init();

    reporter_publish_temperature();
}
*/

void app_main(void)
{
    nvs_init_safe();
    wifi_mgr_init();

    mqtt_client_start();   // triggers event handler later

    ota_mgr_init();
    ds18b20_sensor_init();
}