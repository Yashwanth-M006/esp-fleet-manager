#pragma once

#ifdef __cplusplus
extern "C" {
#endif

/* Initialize NVS safely (handles OTA partition changes) */
void nvs_init_safe(void);

#ifdef __cplusplus
}
#endif
