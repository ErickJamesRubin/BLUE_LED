// ============================================================
// esp32.ino — ESP32 Blue LED Controller
// Polls a PHP server for LED status (0=OFF, 1=ON, 2=BLINK)
// Board: ESP32 Dev Module  |  LED: GPIO 2 (BLUE)
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>   // Install via Library Manager: "ArduinoJson" by Benoit Blanchon

// ── WiFi credentials ──────────────────────────────────────
const char* WIFI_SSID     = "ANG PASSWORD KAY MissUBibi";
const char* WIFI_PASSWORD = "@RubinFamily2026";

// ── Server endpoint ────────────────────────────────────────
// Change to your server's IP / domain.
// e.g. "http://192.168.1.100/esp32_led/get_status.php"
const char* STATUS_URL = "http://192.168.1.42/LED_CONTROL/get_status.php";

// ── Hardware ───────────────────────────────────────────────
const int LED_PIN      = 2;    // Blue LED GPIO pin
const int POLL_DELAY   = 1500; // Polling interval in ms (1.5 s)
const int BLINK_HALF   = 500;  // Blink half-period in ms  (0.5 s on, 0.5 s off)

// ── State ──────────────────────────────────────────────────
int  currentStatus    = -1;    // Last received status
bool blinkState       = false; // Current blink toggle
unsigned long lastBlink   = 0; // Millis of last blink toggle
unsigned long lastPoll    = 0; // Millis of last HTTP poll

// ──────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // LED off on boot

  // ── Connect to WiFi ──
  Serial.printf("\n[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setAutoReconnect(true);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print('.');
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Failed to connect. Will retry in loop.");
  }
}

// ──────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Reconnect WiFi if dropped ──
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconnecting…");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  // ── Poll server ──────────────────────────────────────────
  if (now - lastPoll >= POLL_DELAY) {
    lastPoll = now;
    fetchStatus();
  }

  // ── Handle BLINK in non-blocking fashion ─────────────────
  if (currentStatus == 2) {
    if (now - lastBlink >= BLINK_HALF) {
      lastBlink = now;
      blinkState = !blinkState;
      digitalWrite(LED_PIN, blinkState ? HIGH : LOW);
    }
  }
}

// ──────────────────────────────────────────────────────────
// fetchStatus() — HTTP GET → parse JSON → apply LED state
// ──────────────────────────────────────────────────────────
void fetchStatus() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(STATUS_URL);
  http.setTimeout(4000); // 4-second timeout

  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.printf("[HTTP] Response: %s\n", payload.c_str());

    // Parse JSON
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, payload);

    if (!err) {
      int newStatus = doc["status"] | -1;
      applyStatus(newStatus);
    } else {
      Serial.printf("[JSON] Parse error: %s\n", err.c_str());
    }
  } else {
    Serial.printf("[HTTP] Error code: %d\n", httpCode);
  }

  http.end();
}

// ──────────────────────────────────────────────────────────
// applyStatus() — Set LED hardware based on status value
//   0 → OFF
//   1 → ON (solid)
//   2 → BLINK (handled in loop via millis())
// ──────────────────────────────────────────────────────────
void applyStatus(int status) {
  if (status == currentStatus) return; // No change, skip

  currentStatus = status;
  Serial.printf("[LED] Status changed → %d\n", status);

  switch (status) {
    case 0: // OFF
      digitalWrite(LED_PIN, LOW);
      blinkState = false;
      Serial.println("[LED] OFF");
      break;

    case 1: // ON
      digitalWrite(LED_PIN, HIGH);
      blinkState = false;
      Serial.println("[LED] ON");
      break;

    case 2: // BLINK — non-blocking, driven by loop()
      blinkState = true;
      lastBlink  = millis();
      Serial.println("[LED] BLINK (500ms interval)");
      break;

    default:
      Serial.printf("[LED] Unknown status: %d — ignoring\n", status);
      break;
  }
}