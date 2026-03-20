idf_component_register(
    SRCS
        "main.c"

        "utils/nvs_utils.c"
        "connectivity/wifi_mgr.c"
        "mqtt/mqtt_mgr.c"
        "reporting/reporter.c"
        "ota/ota_mgr.c"
        "sensors/ds18b20_sensor.c"
        "sensors/water_sensor.c"

    INCLUDE_DIRS
        "."
        "config"
        "utils"
        "connectivity"
        "mqtt"
        "ota"
        "reporting"
        "sensors"

    REQUIRES
        driver
        nvs_flash
        esp_wifi
        esp_event
        esp_netif
        mqtt
        cjson
        esp_https_ota
        app_update
        owb 
        ds18b20

    EMBED_TXTFILES
        "certs/emqxsl_ca.pem"
)
