#pragma once

#ifdef __cplusplus
extern "C" {
#endif

/* Start reporting services (heartbeat, health, etc.) */
void reporter_start(void);

/* Publish online / offline state */
void reporter_publish_status(const char *state);

void reporter_publish_status_online(const char *state);


/* Publish firmware identity */
void reporter_publish_firmware(void);

/* Publish health snapshot */
void reporter_publish_health(void);

/* Publish heartbeat immediately */
void reporter_publish_heartbeat(void);

/* Publish log message (remote serial) */
void reporter_publish_log(const char *level,
                          const char *tag,
                          const char *message);


void reporter_publish_temperature(void);

void reporter_publish_water(void);

#ifdef __cplusplus
}
#endif
