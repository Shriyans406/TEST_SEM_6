#include <Arduino.h>
#include <LittleFS.h>
#include <Shrike.h>

ShrikeFlash fpga;

// --- PIN MAPPING (Strictly following your Internal Bridge Table) ---
const int STATUS_LED = 4; // RP_IO4

// RP2040 PINs from your table -> FPGA Internal Pins
const int X_STEP  = 15; // -> FPGA 17
const int X_DIR   = 14; // -> FPGA 18
const int Y_STEP  = 3;  // -> FPGA 5
const int Y_DIR   = 0;  // -> FPGA 6
const int Z_STEP  = 1;  // -> FPGA 4
const int Z_DIR   = 13; // -> FPGA EN
const int RST_PIN = 2;  // -> FPGA 3 (SPI_SCLK)

const float STEPS_PER_MM = 256.0;
float curX = 0, curY = 0, curZ = 0;

float extractValue(String g, char c, float defaultValue);
void moveAxes(float tx, float ty, float tz);

void setup() {
    Serial.begin(115200);
    // Removed while(!Serial) to prevent hanging if monitor isn't open
    delay(2000); 
    Serial.println("\n--- SHRIKE LITE: SYNCED BOOT ---");

    pinMode(STATUS_LED, OUTPUT);
    
    // 1. Initial Handshake with the Library
    if (!LittleFS.begin() || !fpga.begin()) {
        Serial.println("SYSTEM ERROR: Handshake failed.");
        // Blink LED rapidly to show error
        for(int i=0; i<10; i++) { digitalWrite(STATUS_LED, !digitalRead(STATUS_LED)); delay(50); }
        return; 
    }

    // 2. Flash the FPGA (Must happen before we reconfigure pins 0-3)
    Serial.println("Flashing FPGA...");
    if (fpga.flash("/fpga_logic.bin")) {
        Serial.println("FPGA STATUS: LOADED");
    } else {
        Serial.println("FPGA STATUS: FLASH FAILED");
    }

    // 3. NOW set pins to Output (After SPI flash is done)
    pinMode(RST_PIN, OUTPUT);
    pinMode(X_STEP, OUTPUT); pinMode(X_DIR, OUTPUT);
    pinMode(Y_STEP, OUTPUT); pinMode(Y_DIR, OUTPUT);
    pinMode(Z_STEP, OUTPUT); pinMode(Z_DIR, OUTPUT);

    // 4. Clean Reset of the FPGA Logic
    digitalWrite(RST_PIN, HIGH);
    delay(10);
    digitalWrite(RST_PIN, LOW);
    
    Serial.println("CNC Ready. Send G1.");
}

void loop() {
    if (Serial.available() > 0) {
        String line = Serial.readStringUntil('\n');
        line.trim();

        if (line.startsWith("G1") || line.startsWith("G0")) {
            float tX = extractValue(line, 'X', curX);
            float tY = extractValue(line, 'Y', curY);
            float tZ = extractValue(line, 'Z', curZ);
            
            Serial.print("Target -> X:"); Serial.print(tX);
            Serial.print(" Y:"); Serial.print(tY);
            Serial.print(" Z:"); Serial.println(tZ);

            digitalWrite(STATUS_LED, HIGH);
            moveAxes(tX, tY, tZ);
            digitalWrite(STATUS_LED, LOW);
            
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
    long sX = abs((tx - curX) * STEPS_PER_MM);
    long sY = abs((ty - curY) * STEPS_PER_MM);
    long sZ = abs((tz - curZ) * STEPS_PER_MM);
    
    Serial.print("Pulses -> X:"); Serial.print(sX);
    Serial.print(" Y:"); Serial.print(sY);
    Serial.print(" Z:"); Serial.println(sZ);

    if (sX > 0 || sY > 0 || sZ > 0) {
        digitalWrite(X_DIR, (tx - curX) >= 0 ? HIGH : LOW);
        digitalWrite(Y_DIR, (ty - curY) >= 0 ? HIGH : LOW);
        digitalWrite(Z_DIR, (tz - curZ) >= 0 ? HIGH : LOW);

        // Move X 
        for(long i=0; i<sX; i++) { digitalWrite(X_STEP, 1); delayMicroseconds(5000); digitalWrite(X_STEP, 0); delayMicroseconds(5000); }
        // Move Y
        for(long i=0; i<sY; i++) { digitalWrite(Y_STEP, 1); delayMicroseconds(5000); digitalWrite(Y_STEP, 0); delayMicroseconds(5000); }
        // Move Z
        for(long i=0; i<sZ; i++) { digitalWrite(Z_STEP, 1); delayMicroseconds(5000); digitalWrite(Z_STEP, 0); delayMicroseconds(5000); }
    }

    curX = tx; curY = ty; curZ = tz;
}