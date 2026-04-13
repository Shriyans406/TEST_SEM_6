#include <Arduino.h>
#include <LittleFS.h>
#include <Shrike.h>

ShrikeFlash fpga;

// --- FINAL PIN MAPPING (RP2040 Handshake Bridge) ---
const int STATUS_LED = 4; // RP_IO4 for onboard status

// RP2040 Pins talking to FPGA Inputs
const int X_STEP = 21; const int X_DIR = 20;
const int Y_STEP = 17; const int Y_DIR = 18;
const int Z_STEP = 15; const int Z_DIR = 14;
const int RST_PIN = 19; // FPGA i_rst (GPIO 03)

const float STEPS_PER_MM = 256.0;
float curX = 0, curY = 0, curZ = 0;

// Helper Functions
float extractValue(String g, char c, float defaultValue);
void moveAxes(float tx, float ty, float tz);

void setup() {
    Serial.begin(115200);
    while (!Serial);
    delay(1000);
    Serial.println("\n--- SHRIKE LITE CNC: FINAL PIN SYNC BOOT ---");

    pinMode(STATUS_LED, OUTPUT);
    
    // STARTUP TEST: Blink GPIO 4 to confirm hardware path
    for(int i=0; i<8; i++) {
        digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
        delay(100);
    }

    // FPGA Logic Reset Sequence
    pinMode(RST_PIN, OUTPUT);
    digitalWrite(RST_PIN, HIGH);
    delay(10);
    digitalWrite(RST_PIN, LOW);

    if (!LittleFS.begin() || !fpga.begin()) {
        Serial.println("SYSTEM ERROR: Check hardware connections.");
        while(1);
    }

    if (fpga.flash("/fpga_logic.bin")) {
        Serial.println("FPGA STATUS: LOADED");
    }

    pinMode(X_STEP, OUTPUT); pinMode(X_DIR, OUTPUT);
    pinMode(Y_STEP, OUTPUT); pinMode(Y_DIR, OUTPUT);
    pinMode(Z_STEP, OUTPUT); pinMode(Z_DIR, OUTPUT);
    
    Serial.println("CNC Ready. Send G1 commands.");
}

void loop() {
    if (Serial.available() > 0) {
        String line = Serial.readStringUntil('\n');
        line.trim();

        if (line.startsWith("G1") || line.startsWith("G0")) {
            float tX = extractValue(line, 'X', curX);
            float tY = extractValue(line, 'Y', curY);
            float tZ = extractValue(line, 'Z', curZ);
            
            // LOGGING: Confirm numbers extracted
            Serial.print("Target Coordinates -> X:"); Serial.print(tX);
            Serial.print(" Y:"); Serial.print(tY);
            Serial.print(" Z:"); Serial.println(tZ);

            digitalWrite(STATUS_LED, HIGH); // LED ON during movement
            moveAxes(tX, tY, tZ);
            digitalWrite(STATUS_LED, LOW);  // LED OFF when done
            
            Serial.println("ok");
        }
    }
}

float extractValue(String g, char c, float defaultValue) {
    int pos = g.indexOf(c);
    if (pos == -1) return defaultValue;
    int endPos = g.indexOf(' ', pos);
    if (endPos == -1) endPos = g.length();
    return g.substring(pos + 1, endPos).toFloat();
}

void moveAxes(float tx, float ty, float tz) {
    // Calculate relative movement steps
    long sX = abs((tx - curX) * STEPS_PER_MM);
    long sY = abs((ty - curY) * STEPS_PER_MM);
    long sZ = abs((tz - curZ) * STEPS_PER_MM);
    
    // LOGGING: Actual pulses calculated
    Serial.print("PULSE COUNT: X="); Serial.print(sX);
    Serial.print(", Y="); Serial.print(sY);
    Serial.print(", Z="); Serial.println(sZ);

    if (sX > 0 || sY > 0 || sZ > 0) {
        digitalWrite(X_DIR, (tx - curX) >= 0 ? HIGH : LOW);
        digitalWrite(Y_DIR, (ty - curY) >= 0 ? HIGH : LOW);
        digitalWrite(Z_DIR, (tz - curZ) >= 0 ? HIGH : LOW);

        // X-Axis Stepping
        for(long i=0; i<sX; i++) {
            digitalWrite(X_STEP, 1); delayMicroseconds(950);
            digitalWrite(X_STEP, 0); delayMicroseconds(950);
        }
        // Y-Axis Stepping
        for(long i=0; i<sY; i++) {
            digitalWrite(Y_STEP, 1); delayMicroseconds(950);
            digitalWrite(Y_STEP, 0); delayMicroseconds(950);
        }
        // Z-Axis Stepping
        for(long i=0; i<sZ; i++) {
            digitalWrite(Z_STEP, 1); delayMicroseconds(950);
            digitalWrite(Z_STEP, 0); delayMicroseconds(950);
        }
    }

    curX = tx; curY = ty; curZ = tz;
}