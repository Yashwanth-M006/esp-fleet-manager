#pragma once

#ifdef __cplusplus
extern "C" {
#endif

/* Initialize OTA subsystem */
void ota_mgr_init(void);

/*
 * Handle OTA command JSON
 * Called ONLY by MQTT module when OTA topic is received
 */
void ota_mgr_handle_command(const char *json_payload);

/* Get last OTA result as string */
const char *ota_mgr_last_status(void);

#ifdef __cplusplus
}
#endif
