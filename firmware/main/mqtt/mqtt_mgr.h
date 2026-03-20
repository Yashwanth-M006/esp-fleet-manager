#pragma once
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Start MQTT client and connect to broker */
void mqtt_client_start(void);

/* Publish helper (used by other modules) */
bool mqtt_client_publish(const char *topic, const char *payload);

/* Returns true if MQTT is connected */
bool mqtt_client_is_connected(void);




#ifdef __cplusplus
}
#endif
