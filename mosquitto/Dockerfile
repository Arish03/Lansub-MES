FROM eclipse-mosquitto:2.0

# Build-time MQTT credentials (overridable via docker-compose build args)
ARG MQTT_USER=lansub_mqtt
ARG MQTT_PASS=lansub_mqtt_2024

# Generate password file using mosquitto_passwd (batch mode, no prompt)
RUN mosquitto_passwd -b -c /mosquitto/config/passwd ${MQTT_USER} ${MQTT_PASS}
