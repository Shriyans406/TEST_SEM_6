#include <Arduino.h>
#include <LittleFS.h>
#include <Shrike.h>

ShrikeFlash fpga;

// --- CONFIGURATION ---
const int STATUS_LED = 25;  // Onboard LED for Pico/Shrike-Lite

// SAFE PIN MAPPING (Avoids GPIO 1, 2, 3, 4 during boot)
const int X_STEP = 14; 
const int X_DIR  = 15; 
const int Y_STEP = 18; 
const int Y_DIR  = 17; 
const int Z_STEP = 21; 
const int Z_DIR  = 22; 

const float STEPS_PER_MM = 256.0; // 2048 steps / 8mm pitch
float curX = 0, curY = 0, curZ = 0;

// Function Prototypes
void moveAxes(float tx, float ty, float tz);
float extractValue(String g, char c, float defaultValue);

void setup() {
    Serial.begin(115200); 
    // Wait for Serial Monitor so you can see the boot sequence
    while (!Serial); 
    delay(1000); 
    
    Serial.println("\n\n=== SHRIKE CNC MASTER START ===");

    // Initialize Onboard LED
    pinMode(STATUS_LED, OUTPUT);
    digitalWrite(STATUS_LED, HIGH); // Turn on during boot

    // 1. Mount LittleFS
    if (!LittleFS.begin()) {
        Serial.println("ERROR: LittleFS failed. Did you 'Upload Filesystem Image'?");
        digitalWrite(STATUS_LED, LOW);
        return;
    }

    // 2. Hardware Handshake with ForgeFPGA
    if (!fpga.begin()) {
        Serial.println("ERROR: FPGA hardware handshake failed.");
        while(1);
    }

    // 3. Flash Bitstream from Filesystem
    Serial.println("Attempting to Flash FPGA...");
    if (fpga.flash("/fpga_logic.bin")) {
        Serial.println("=== FPGA LOGIC LOADED SUCCESSFULLY ===");
        // Success Blink
        for(int i=0; i<3; i++){
            digitalWrite(STATUS_LED, LOW); delay(100);
            digitalWrite(STATUS_LED, HIGH); delay(100);
        }
    } else {
        Serial.println("=== FPGA FLASH FAILED ===");
        while(1);
    }

    // 4. Initialize Motor Pins ONLY AFTER successful flash
    pinMode(X_STEP, OUTPUT); pinMode(X_DIR, OUTPUT);
    pinMode(Y_STEP, OUTPUT); pinMode(Y_DIR, OUTPUT);
    pinMode(Z_STEP, OUTPUT); pinMode(Z_DIR, OUTPUT);

    digitalWrite(STATUS_LED, LOW); // Ready state
    Serial.println("CNC Ready. Send G1 commands.");
}

void loop() {
    if (Serial.available() > 0) {
        String line = Serial.readStringUntil('\n');
        line.trim(); // Remove whitespace/hidden chars

        if (line.startsWith("G1") || line.startsWith("G0")) {
            // Visual feedback: LED ON during command processing
            digitalWrite(STATUS_LED, HIGH);

            // Robust Parsing: If coordinate is missing, keep current position
            float tX = extractValue(line, 'X', curX);
            float tY = extractValue(line, 'Y', curY);
            float tZ = extractValue(line, 'Z', curZ);
            
            moveAxes(tX, tY, tZ);

            // Handshake: Tell React CAD we are ready for more
            Serial.println("ok");
            digitalWrite(STATUS_LED, LOW);
        }
    }
}

// Helper function to find coordinates in G-code strings
float extractValue(String g, char c, float defaultValue) {
    int pos = g.indexOf(c);
    if (pos == -1) return defaultValue;
    
    // Find where the number ends (space or end of string)
    int endPos = g.indexOf(' ', pos);
    if (endPos == -1) endPos = g.length();
    
    return g.substring(pos + 1, endPos).toFloat();
}

void moveAxes(float tx, float ty, float tz) {
    // 1. Set Directions
    digitalWrite(X_DIR, (tx - curX) >= 0 ? HIGH : LOW);
    digitalWrite(Y_DIR, (ty - curY) >= 0 ? HIGH : LOW);
    digitalWrite(Z_DIR, (tz - curZ) >= 0 ? HIGH : LOW);

    // 2. Calculate steps
    long sX = abs((tx - curX) * STEPS_PER_MM);
    long sY = abs((ty - curY) * STEPS_PER_MM);
    long sZ = abs((tz - curZ) * STEPS_PER_MM);

    // 3. Execution (Sequential X then Y then Z)
    // 950us is the torque sweet spot for geared motors
    for(long i=0; i<sX; i++) { digitalWrite(X_STEP, 1); delayMicroseconds(950); digitalWrite(X_STEP, 0); delayMicroseconds(950); }
    for(long i=0; i<sY; i++) { digitalWrite(Y_STEP, 1); delayMicroseconds(950); digitalWrite(Y_STEP, 0); delayMicroseconds(950); }
    for(long i=0; i<sZ; i++) { digitalWrite(Z_STEP, 1); delayMicroseconds(950); digitalWrite(Z_STEP, 0); delayMicroseconds(950); }

    // Update global positions
    curX = tx; curY = ty; curZ = tz;
}