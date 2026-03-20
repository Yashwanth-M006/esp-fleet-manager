#pragma once
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Initialize Wi-Fi and connect to AP */
void wifi_mgr_init(void);

/* Returns true if STA is connected */
bool wifi_mgr_is_connected(void);

/* Get RSSI (valid only if connected) */
int wifi_mgr_get_rssi(void);

#ifdef __cplusplus
}
#endif
