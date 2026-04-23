
/*
#include <Arduino.h>

// --- PIN MAPPING (4-Wire ULN2003 Setup) ---
// X-Axis
const int x_pins[] = {8, 9, 14, 15}; 
// Y-Axis (Adjust these based on your physical wiring)
const int y_pins[] = {0, 1, 2, 3};   
// Z-Axis
const int z_pins[] = {4, 5, 6, 7};

const int STATUS_LED = 25; // Internal RP2040 LED

const float STEPS_PER_MM = 256.0;
float curX = 0, curY = 0, curZ = 0;

// The 4-step sequence for ULN2003 (Wave Drive)
const int step_seq[4][4] = {
  {1, 0, 0, 0},
  {0, 1, 0, 0},
  {0, 0, 1, 0},
  {0, 0, 0, 1}
};

int x_step_idx = 0;
int y_step_idx = 0;
int z_step_idx = 0;

void stepMotor(const int pins[], int &idx, bool forward) {
    if (forward) idx = (idx + 1) % 4;
    else idx = (idx + 3) % 4; // Move backward

    for (int i = 0; i < 4; i++) {
        digitalWrite(pins[i], step_seq[idx][i]);
    }
}

float extractValue(String g, char c, float defaultValue);
void moveAxes(float tx, float ty, float tz);

void setup() {
    Serial.begin(115200);
    delay(2000); 
    Serial.println("\n--- MCU DIRECT CONTROL: PLOTTER READY ---");

    pinMode(STATUS_LED, OUTPUT);

    for(int i=0; i<4; i++) {
        pinMode(x_pins[i], OUTPUT);
        pinMode(y_pins[i], OUTPUT);
        pinMode(z_pins[i], OUTPUT);
    }
}

void loop() {
    if (Serial.available() > 0) {
        String line = Serial.readStringUntil('\n');
        line.trim();

        if (line.startsWith("G1") || line.startsWith("G0")) {
            float tX = extractValue(line, 'X', curX);
            float tY = extractValue(line, 'Y', curY);
            float tZ = extractValue(line, 'Z', curZ);
            
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
    
    bool dirX = (tx - curX) >= 0;
    bool dirY = (ty - curY) >= 0;
    bool dirZ = (tz - curZ) >= 0;

    // Find the max steps to synchronize the movement timing
    long maxSteps = max(sX, max(sY, sZ));

    for (long i = 0; i < maxSteps; i++) {
        if (i < sX) stepMotor(x_pins, x_step_idx, dirX);
        if (i < sY) stepMotor(y_pins, y_step_idx, dirY);
        if (i < sZ) stepMotor(z_pins, z_step_idx, dirZ);
        
        delayMicroseconds(2000); // Control speed here
    }

    curX = tx; curY = ty; curZ = tz;
}

*/





//main code

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
        // Add this to your setup() to "see" inside the board's memory
        File root = LittleFS.open("/", "r");
        File file = root.openNextFile();
        Serial.println("--- FILESYSTEM CONTENTS ---");
        while (file) {
            Serial.print("FILE: "); Serial.print(file.name());
            Serial.print("  SIZE: "); Serial.println(file.size());
            file = root.openNextFile();
        }
        Serial.println("---------------------------");
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
        for(long i=0; i<sX; i++) { digitalWrite(X_STEP, 1); delayMicroseconds(1000); digitalWrite(X_STEP, 0); delayMicroseconds(1000); }
        // Move Y
        for(long i=0; i<sY; i++) { digitalWrite(Y_STEP, 1); delayMicroseconds(1000); digitalWrite(Y_STEP, 0); delayMicroseconds(10000); }
        // Move Z
        for(long i=0; i<sZ; i++) { digitalWrite(Z_STEP, 1); delayMicroseconds(1000); digitalWrite(Z_STEP, 0); delayMicroseconds(1000); }
    }

    curX = tx; curY = ty; curZ = tz;
}

