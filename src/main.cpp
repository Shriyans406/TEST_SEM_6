
#include <Arduino.h>
#include <math.h>

// --- PIN MAPPING (4-Wire ULN2003 Setup) --- MCU ONLY, no FPGA ---
// X-Axis (verified live: was driving Y motor, swapped 2026-09-23)
const int x_pins[] = {5, 6, 7, 8}; // 7, 8, 9, 10
// Y-Axis (verified live: was driving X motor, swapped 2026-09-23)
const int y_pins[] = {21, 22, 23, 24}; // 16, 17, 18, 6
// Z-Axis
const int z_pins[] = {9, 10, 11, 14}; // 11, 14, 15, 19

const int STATUS_LED = 25; // Internal RP2040 LED

// NOTE: calibrate this. 28BYJ-48 in half-step = 4096 steps/rev.
// Example: M8 leadscrew 1.25mm pitch -> 4096/1.25 = 3276.8 steps/mm.
// Keep 256.0 only if your mechanics were tuned for it.
const float STEPS_PER_MM = 256.0;
float curX = 0, curY = 0, curZ = 0;

// Grbl-subset state
bool absMode = true;     // G90 absolute, G91 incremental
float unitScale = 1.0f;  // G21 mm (1.0), G20 inch (25.4)
long stepDelayUs = 2800; // default draw feed for 28BYJ-48 + ULN2003
bool penDown = true;     // pen starts on paper; first G0 travel auto-lifts
bool lastMotionIsRapid = false; // tracks G0 vs G1 for bare X/Y/Z lines

// Pen heights (mm in machine coords). Pen moves use draw-feed speed
// (gentler: no skipped steps lifting the mechanism under load).
// RIG POLARITY (verified live): positive Z drives the pen INTO the paper,
// so hover = smaller number, touch = larger number. Do NOT swap.
const float PEN_UP_MM = -1.0f;
const float PEN_DOWN_MM = 0.5f;
const long RAPID_US = 1800; // G0 travel speed (faster than draw feed)

// 8-step half-step sequence for 28BYJ-48 + ULN2003.
// Much smoother + more torque than 4-step wave drive.
// If a motor only vibrates, its 4 wires are in wrong order: swap middle two.
const int step_seq[8][4] = {{1, 0, 0, 0}, {1, 1, 0, 0}, {0, 1, 0, 0},
                            {0, 1, 1, 0}, {0, 0, 1, 0}, {0, 0, 1, 1},
                            {0, 0, 0, 1}, {1, 0, 0, 1}};

int x_step_idx = 0;
int y_step_idx = 0;
int z_step_idx = 0;

void stepMotor(const int pins[], int &idx, bool forward) {
  if (forward)
    idx = (idx + 1) % 8;
  else
    idx = (idx + 7) % 8; // Move backward
  for (int i = 0; i < 4; i++) {
    digitalWrite(pins[i], step_seq[idx][i]);
  }
}

void releaseMotors() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(x_pins[i], LOW);
    digitalWrite(y_pins[i], LOW);
    digitalWrite(z_pins[i], LOW);
  }
}

float extractValue(String g, char c, float defaultValue);
bool hasWord(String g, char c);
bool hasGcode(String g, int n);
void moveAxes(float tx, float ty, float tz);
void moveAxesUs(float tx, float ty, float tz, long useDelayUs);
void penTo(bool down);
void moveArc(float tx, float ty, float iOff, float jOff, bool clockwise);
void handleLine(String line);

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(10); // avoid 1s block on readStringUntil
  delay(2000);
  // Grbl-style banner helps DesignWebCAD / UGS / Candle stream correctly
  Serial.println("Grbl 1.1h ['$' for help]");
  Serial.println("--- MCU DIRECT CONTROL: PLOTTER READY ---");
  Serial.println("ok");

  pinMode(STATUS_LED, OUTPUT);

  for (int i = 0; i < 4; i++) {
    pinMode(x_pins[i], OUTPUT);
    digitalWrite(x_pins[i], LOW);
    pinMode(y_pins[i], OUTPUT);
    digitalWrite(y_pins[i], LOW);
    pinMode(z_pins[i], OUTPUT);
    digitalWrite(z_pins[i], LOW);
  }
}

void loop() {
  if (Serial.available() > 0) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0)
      return;
    handleLine(line);
  }
}

// Strip comments, uppercase, parse Grbl subset. ALWAYS answers "ok"
// so the sender never stalls waiting for acknowledgement.
void handleLine(String line) {
  // Strip ';' comment
  int semi = line.indexOf(';');
  if (semi >= 0)
    line = line.substring(0, semi);
  // Strip '(' ... ')' comments
  while (true) {
    int a = line.indexOf('(');
    int b = line.indexOf(')', a);
    if (a < 0)
      break;
    if (b < 0) {
      line = line.substring(0, a);
      break;
    }
    line = line.substring(0, a) + " " + line.substring(b + 1);
  }
  line.trim();
  line.toUpperCase();
  if (line.length() == 0) {
    Serial.println("ok");
    return;
  }
  // Program start/end markers and O program numbers: acknowledge only
  if (line == "%" || line.startsWith("O")) {
    Serial.println("ok");
    return;
  }
  // Strip leading line numbers "N10 G1 X5" (many CADs emit these)
  if (line.startsWith("N")) {
    int sp = line.indexOf(' ');
    if (sp > 0) {
      line = line.substring(sp + 1);
      line.trim();
    } else {
      Serial.println("ok");
      return;
    }
    if (line.length() == 0) {
      Serial.println("ok");
      return;
    }
  }

  // Status / reset helpers
  if (line == "?" || line == "$" || line == "$$" || line == "$G" ||
      line == "$I" || line == "$N" || line == "$C" || line == "$X") {
    Serial.print("[G90:");
    Serial.print(absMode ? "ABS" : "INC");
    Serial.print(" G");
    Serial.print(unitScale > 1.5f ? "20" : "21");
    Serial.print(" X:");
    Serial.print(curX, 3);
    Serial.print(" Y:");
    Serial.print(curY, 3);
    Serial.print(" Z:");
    Serial.print(curZ, 3);
    Serial.println("]");
    Serial.println("ok");
    return;
  }
  if (line == "!" || line == "~" || line == "\x18") {
    Serial.println("ok");
    return;
  }

  // Feedrate: F<number> anywhere -> step speed (mm/min -> us/step)
  if (hasWord(line, 'F')) {
    float f = extractValue(line, 'F', -1);
    if (f > 1) {
      // steps/sec = F(mm/min)/60 * STEPS_PER_MM ; clamp to motor limits
      float stepsPerSec = (f / 60.0f) * STEPS_PER_MM;
      if (stepsPerSec < 40)
        stepsPerSec = 40; // ignore crawl feeds from CAD
      if (stepsPerSec > 1000)
        stepsPerSec = 1000; // 28BYJ-48 safe ceiling
      stepDelayUs = (long)(1000000.0f / stepsPerSec);
    }
  }

  // Units / distance mode (may appear alongside motion, apply first).
  // Word-aware: "G91.1" must NOT trigger G91.
  if (hasGcode(line, 20))
    unitScale = 25.4f;
  if (hasGcode(line, 21))
    unitScale = 1.0f;
  if (hasGcode(line, 90))
    absMode = true;
  if (hasGcode(line, 91))
    absMode = false;

  // Dwell G4 P<sec> / X<sec>
  if (line.startsWith("G4") || line.indexOf("G04") == 0) {
    float p = hasWord(line, 'P') ? extractValue(line, 'P', 0)
                                 : extractValue(line, 'X', 0);
    if (p > 0 && p < 60)
      delay((unsigned long)(p * 1000));
    Serial.println("ok");
    return;
  }

  // Set position G92 X.. Y.. Z..
  if (line.startsWith("G92")) {
    if (hasWord(line, 'X'))
      curX = extractValue(line, 'X', curX) * unitScale;
    if (hasWord(line, 'Y'))
      curY = extractValue(line, 'Y', curY) * unitScale;
    if (hasWord(line, 'Z'))
      curZ = extractValue(line, 'Z', curZ) * unitScale;
    Serial.println("ok");
    return;
  }
  // Homing G28 / G30 -> pen up, then go to 0,0 (no endstops on plotter)
  if (line.startsWith("G28") || line.startsWith("G30")) {
    float tx = hasWord(line, 'X') ? extractValue(line, 'X', 0) * unitScale : 0;
    float ty = hasWord(line, 'Y') ? extractValue(line, 'Y', 0) * unitScale : 0;
    if (!absMode && !hasWord(line, 'X') && !hasWord(line, 'Y') &&
        !hasWord(line, 'Z')) {
      tx = 0;
      ty = 0; // plain G28 in relative = go home
    }
    digitalWrite(STATUS_LED, HIGH);
    penTo(false); // travel in air, never drag home
    if (hasWord(line, 'Z')) {
      float tz = absMode ? extractValue(line, 'Z', 0) * unitScale
                         : curZ + extractValue(line, 'Z', 0) * unitScale;
      moveAxesUs(curX, curY, tz, RAPID_US);
    }
    moveAxesUs(tx, ty, curZ, RAPID_US);
    lastMotionIsRapid = true;
    digitalWrite(STATUS_LED, LOW);
    Serial.println("ok");
    return;
  }

  // Arcs G2/G3 (must check before G0/G1 because "G02" starts with "G0")
  if (hasGcode(line, 2) || hasGcode(line, 3)) {
    bool cw = hasGcode(line, 2);
    lastMotionIsRapid = false;
    float rawX = hasWord(line, 'X') ? extractValue(line, 'X', 0)
                                    : (absMode ? curX / unitScale : 0);
    float rawY = hasWord(line, 'Y') ? extractValue(line, 'Y', 0)
                                    : (absMode ? curY / unitScale : 0);
    float tx = absMode ? rawX * unitScale : curX + rawX * unitScale;
    float ty = absMode ? rawY * unitScale : curY + rawY * unitScale;
    float iOff =
        hasWord(line, 'I') ? extractValue(line, 'I', 0) * unitScale : 0;
    float jOff =
        hasWord(line, 'J') ? extractValue(line, 'J', 0) * unitScale : 0;
    // R-format arcs: solve center from radius (many CADs emit G2/G3 R..)
    if (hasWord(line, 'R') && !hasWord(line, 'I') && !hasWord(line, 'J')) {
      float r = extractValue(line, 'R', 0) * unitScale;
      float dx = tx - curX, dy = ty - curY;
      float chord = sqrtf(dx * dx + dy * dy);
      if (fabsf(r) * 2 < chord || chord < 0.0001f) {
        // Degenerate: fall back to straight draw move
        digitalWrite(STATUS_LED, HIGH);
        penTo(true);
        moveAxes(tx, ty, curZ);
        digitalWrite(STATUS_LED, LOW);
      } else {
        float h = sqrtf(fmaxf(r * r - (chord * 0.5f) * (chord * 0.5f), 0));
        float nx = -dy / chord, ny = dx / chord; // left of travel
        float mx = (curX + tx) * 0.5f, my = (curY + ty) * 0.5f;
        float side = ((r >= 0) == cw) ? 1.0f : -1.0f;
        float cx = mx + side * h * nx, cy = my + side * h * ny;
        digitalWrite(STATUS_LED, HIGH);
        penTo(true);
        moveArc(tx, ty, cx - curX, cy - curY, cw);
        digitalWrite(STATUS_LED, LOW);
      }
    } else {
      digitalWrite(STATUS_LED, HIGH);
      penTo(true); // arcs are always draw moves
      moveArc(tx, ty, iOff, jOff, cw);
      digitalWrite(STATUS_LED, LOW);
    }
    Serial.println("ok");
    return;
  }

  // Linear G0/G1 (also G00/G01). Plotter convention:
  // G0 = travel in air (pen up first), G1 = draw (pen down first).
  // This fixes CAD files that emit no lift commands at all.
  if (hasGcode(line, 0) || hasGcode(line, 1) || line == "G" ||
      line.startsWith("G ") || line.startsWith("X") || line.startsWith("Y") ||
      line.startsWith("Z") || line.startsWith("F")) {
    bool isRapid = hasGcode(line, 0);
    // Bare-coordinate lines repeat the last motion mode
    if (!hasGcode(line, 0) && !hasGcode(line, 1))
      isRapid = lastMotionIsRapid;
    else
      lastMotionIsRapid = isRapid;
    float tx = curX, ty = curY, tz = curZ;
    if (hasWord(line, 'X')) {
      float v = extractValue(line, 'X', 0) * unitScale;
      tx = absMode ? v : curX + v;
    }
    if (hasWord(line, 'Y')) {
      float v = extractValue(line, 'Y', 0) * unitScale;
      ty = absMode ? v : curY + v;
    }
    bool hasZ = hasWord(line, 'Z');
    if (hasZ) {
      float v = extractValue(line, 'Z', 0) * unitScale;
      tz = absMode ? v : curZ + v;
    }
    digitalWrite(STATUS_LED, HIGH);
    if (hasZ && !hasWord(line, 'X') && !hasWord(line, 'Y')) {
      // Pure Z pen command from CAD: execute directly, track state
      moveAxesUs(curX, curY, tz, RAPID_US);
      penDown = (curZ <= (PEN_UP_MM + PEN_DOWN_MM) * 0.5f);
    } else if (isRapid) {
      if (penDown && (tx != curX || ty != curY))
        penTo(false); // lift before travel
      moveAxesUs(tx, ty, hasZ ? tz : curZ, RAPID_US);
      if (hasZ)
        penDown = (curZ <= (PEN_UP_MM + PEN_DOWN_MM) * 0.5f);
    } else {
      if (!penDown && (tx != curX || ty != curY))
        penTo(true); // drop before draw
      moveAxes(tx, ty, hasZ ? tz : curZ);
      if (hasZ)
        penDown = (curZ <= (PEN_UP_MM + PEN_DOWN_MM) * 0.5f);
    }
    digitalWrite(STATUS_LED, LOW);
    Serial.println("ok");
    return;
  }

  // Spindle/laser/pen M3/M4/M5 S... (many CADs use these for pen up/down).
  // Now PHYSICALLY moves the Z pen motor, not just a flag.
  if (line.startsWith("M3") || line.startsWith("M4") || line.startsWith("M5") ||
      line.startsWith("M2") || line.startsWith("M30") ||
      line.startsWith("M17") || line.startsWith("M18") ||
      line.startsWith("M84") || line.startsWith("M114") ||
      line.startsWith("G17") || line.startsWith("G54") ||
      line.startsWith("G94") || line.startsWith("M6") ||
      line.startsWith("M7") || line.startsWith("M8") || line.startsWith("M9") ||
      line.startsWith("T") || line.startsWith("$") || line.startsWith("G40") ||
      line.startsWith("G41") || line.startsWith("G42") ||
      line.startsWith("G49") || line.startsWith("G61") ||
      line.startsWith("G64")) {
    if (line.startsWith("M3") || line.startsWith("M4")) {
      digitalWrite(STATUS_LED, HIGH);
      penTo(true); // pen down for real
      digitalWrite(STATUS_LED, LOW);
    }
    if (line.startsWith("M5")) {
      digitalWrite(STATUS_LED, HIGH);
      penTo(false); // pen up for real
      digitalWrite(STATUS_LED, LOW);
    }
    if (line.startsWith("M2") || line.startsWith("M30"))
      penTo(false); // park pen up at job end
    if (line.startsWith("M18") || line.startsWith("M84"))
      releaseMotors();
    if (line.startsWith("M114")) {
      Serial.print("X:");
      Serial.print(curX, 3);
      Serial.print(" Y:");
      Serial.print(curY, 3);
      Serial.print(" Z:");
      Serial.println(curZ, 3);
    }
    Serial.println("ok");
    return;
  }

  // Anything else (G21/G90 alone, comments, unknown): acknowledge so stream
  // continues
  Serial.println("ok");
}

bool hasWord(String g, char c) {
  int pos = g.indexOf(c);
  if (pos == -1)
    return false;
  // next char should be digit, '.', '-' or '+' (avoids matching 'G' inside
  // other text)
  if (pos + 1 >= (int)g.length())
    return false;
  char n = g.charAt(pos + 1);
  return (n == '-' || n == '+' || n == '.' || (n >= '0' && n <= '9'));
}

float extractValue(String g, char c, float defaultValue) {
  int pos = g.indexOf(c);
  if (pos == -1)
    return defaultValue;
  int i = pos + 1;
  // skip spaces between letter and number ("X 10.5")
  while (i < (int)g.length() && g.charAt(i) == ' ')
    i++;
  int j = i;
  // optional sign
  if (j < (int)g.length() && (g.charAt(j) == '-' || g.charAt(j) == '+'))
    j++;
  bool dotSeen = false;
  while (j < (int)g.length()) {
    char ch = g.charAt(j);
    if (ch >= '0' && ch <= '9') {
      j++;
      continue;
    }
    if (ch == '.' && !dotSeen) {
      dotSeen = true;
      j++;
      continue;
    }
    break;
  }
  if (j == i)
    return defaultValue;
  return g.substring(i, j).toFloat();
}

// Word-aware G-code match: "G1" must not match "G10"/"G11",
// "G0" must not match "G02"/"G03", "G91" must not match "G91.1".
bool hasGcode(String g, int n) {
  String tag = "G" + String(n);
  int pos = g.indexOf(tag);
  while (pos >= 0) {
    int after = pos + tag.length();
    if (after >= (int)g.length())
      return true;
    char c = g.charAt(after);
    if ((c < '0' || c > '9') && c != '.')
      return true;
    pos = g.indexOf(tag, after);
  }
  return false;
}

// Pen lift/drop using the Z stepper at gentle feed speed
// (rapid caused skipped steps under load -> pen ending too deep).
// No-op if already there.
void penTo(bool down) {
  float target = down ? PEN_DOWN_MM : PEN_UP_MM;
  if (down == penDown && fabsf(curZ - target) < 0.05f)
    return;
  moveAxesUs(curX, curY, target, stepDelayUs);
  penDown = down;
}

// True coordinated motion: Bresenham interleaves X/Y/Z so the tool
// travels a straight line. Old code finished the short axis first
// (dogleg), which turned shapes into broken lines.
void moveAxesUs(float tx, float ty, float tz, long useDelayUs) {
  long sX = lroundf(fabsf((tx - curX) * STEPS_PER_MM));
  long sY = lroundf(fabsf((ty - curY) * STEPS_PER_MM));
  long sZ = lroundf(fabsf((tz - curZ) * STEPS_PER_MM));

  bool dirX = (tx - curX) >= 0;
  bool dirY = (ty - curY) >= 0;
  bool dirZ = (tz - curZ) >= 0;

  long maxSteps = sX;
  if (sY > maxSteps)
    maxSteps = sY;
  if (sZ > maxSteps)
    maxSteps = sZ;
  if (maxSteps == 0) {
    curX = tx;
    curY = ty;
    curZ = tz;
    return;
  }

  long errX = maxSteps / 2;
  long errY = maxSteps / 2;
  long errZ = maxSteps / 2;

  for (long i = 0; i < maxSteps; i++) {
    errX += sX;
    if (errX >= maxSteps) {
      errX -= maxSteps;
      stepMotor(x_pins, x_step_idx, dirX);
    }
    errY += sY;
    if (errY >= maxSteps) {
      errY -= maxSteps;
      stepMotor(y_pins, y_step_idx, dirY);
    }
    errZ += sZ;
    if (errZ >= maxSteps) {
      errZ -= maxSteps;
      stepMotor(z_pins, z_step_idx, dirZ);
    }
    delayMicroseconds((unsigned int)useDelayUs);
  }

  curX = tx;
  curY = ty;
  curZ = tz;
}

void moveAxes(float tx, float ty, float tz) {
  moveAxesUs(tx, ty, tz, stepDelayUs);
}

// Arc interpolation: split G2/G3 into short linear segments (~0.5mm)
void moveArc(float tx, float ty, float iOff, float jOff, bool clockwise) {
  float cx = curX + iOff;
  float cy = curY + jOff;
  float r = sqrtf(iOff * iOff + jOff * jOff);
  if (r < 0.0001f) {
    moveAxes(tx, ty, curZ);
    return;
  }
  float a0 = atan2f(curY - cy, curX - cx);
  float a1 = atan2f(ty - cy, tx - cx);
  float sweep;
  if (clockwise) {
    sweep = a0 - a1;
    while (sweep <= 0)
      sweep += 2 * PI;
  } else {
    sweep = a1 - a0;
    while (sweep <= 0)
      sweep += 2 * PI;
  }
  float arcLen = fabsf(sweep) * r;
  int segs = (int)ceilf(arcLen / 0.5f);
  if (segs < 4)
    segs = 4;
  if (segs > 400)
    segs = 400; // cap serial blocking time
  for (int s = 1; s <= segs; s++) {
    float a = clockwise ? (a0 - sweep * s / segs) : (a0 + sweep * s / segs);
    moveAxes(cx + r * cosf(a), cy + r * sinf(a), curZ);
  }
  moveAxes(tx, ty, curZ); // snap to exact endpoint
}

// main code
/*
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
        for(int i=0; i<10; i++) { digitalWrite(STATUS_LED,
!digitalRead(STATUS_LED)); delay(50); } return;
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
        for(long i=0; i<sX; i++) { digitalWrite(X_STEP, 1);
delayMicroseconds(2500); digitalWrite(X_STEP, 0); delayMicroseconds(2000); }
        // Move Y
        for(long i=0; i<sY; i++) { digitalWrite(Y_STEP, 1);
delayMicroseconds(2500); digitalWrite(Y_STEP, 0); delayMicroseconds(2000); }
        // Move Z
        for(long i=0; i<sZ; i++) { digitalWrite(Z_STEP, 1);
delayMicroseconds(2000); digitalWrite(Z_STEP, 0); delayMicroseconds(2000); }
    }

    curX = tx; curY = ty; curZ = tz;
}

*/
/*
#include <Arduino.h>
#include <LittleFS.h>
#include <Shrike.h>

ShrikeFlash fpga;

// --- PIN MAPPING (Current FPGA Bitstream Setup) ---
const int X_STEP  = 15; // Directly bridged to FPGA F4 (i_x_step)
const int X_DIR   = 14; // Directly bridged to FPGA F5 (i_x_dir)
const int Y_STEP  = 4;  // Jumper wire GP4 -> F8 (i_y_step)
const int Y_DIR   = 5;  // Jumper wire GP5 -> F9 (i_y_dir)
const int Z_STEP  = 6;  // Jumper wire GP6 -> F10 (i_z_step)
const int Z_DIR   = 13; // Unused (internally tied in FPGA)
const int RST_PIN = 7;  // Jumper wire GP7 -> F11 (i_rst)

const int STATUS_LED = 25;

const float STEPS_PER_MM = 256.0;
float curX = 0, curY = 0, curZ = 0;

void moveAxes(float tx, float ty, float tz);
float extractValue(String g, char c, float defaultValue);

void setup() {
    Serial.begin(115200);
    delay(2000);
    Serial.println("\n--- CNC MASTER CONTROLLER: INITIALIZING ---");

    pinMode(STATUS_LED, OUTPUT);
    digitalWrite(STATUS_LED, HIGH);

    // =========================
    // 1. Init FPGA Interface (Mounts LittleFS internally)
    // =========================
    if (!fpga.begin()) {
        Serial.println("FATAL ERROR: FPGA init failed.");
        return;
    }

    // =========================
    // 2. List Files (DEBUG)
    // =========================
    Serial.println("--- FILES IN FLASH ---");
    File root = LittleFS.open("/", "r");
    File file = root.openNextFile();
    while (file) {
        Serial.print("FILE: ");
        Serial.println(file.name());
        file = root.openNextFile();
    }
    Serial.println("----------------------");

    // =========================
    // 4. Flash FPGA
    // =========================
    if (LittleFS.exists("/fpga_logic.bin")) {
        Serial.println("Flashing fpga_logic.bin...");

        if (fpga.flash("/fpga_logic.bin")) {
            Serial.println("FPGA STATUS: LOADED SUCCESSFULLY");
            SPI.end(); // Release SPI pins to GPIO mode
        } else {
            Serial.println("FPGA STATUS: FLASH FAILED");
            return;
        }

    } else {
        Serial.println("ERROR: fpga_logic.bin NOT FOUND");
        return;
    }

    // =========================
    // 5. Configure Pins AFTER flash
    // =========================
    pinMode(RST_PIN, OUTPUT);
    pinMode(X_STEP, OUTPUT); pinMode(X_DIR, OUTPUT);
    pinMode(Y_STEP, OUTPUT); pinMode(Y_DIR, OUTPUT);
    pinMode(Z_STEP, OUTPUT); pinMode(Z_DIR, OUTPUT);

    // Ensure unused bridged pins (which are FPGA outputs) are placed in
high-impedance INPUT mode to prevent driver fights pinMode(0, INPUT); pinMode(1,
INPUT); pinMode(2, INPUT); pinMode(3, INPUT);

    // =========================
    digitalWrite(RST_PIN, HIGH);
    delay(100);
    digitalWrite(RST_PIN, LOW);
    Serial.println("FPGA RESET DONE (Released LOW)");

    // =========================
    // 7. Basic FPGA TEST (VERY IMPORTANT)
    // =========================
    Serial.println("Testing FPGA response (STEP pulse X, Y, Z)...");

    digitalWrite(X_STEP, HIGH);
    digitalWrite(Y_STEP, HIGH);
    digitalWrite(Z_STEP, HIGH);
    delay(200);
    digitalWrite(X_STEP, LOW);
    digitalWrite(Y_STEP, LOW);
    digitalWrite(Z_STEP, LOW);

    Serial.println("If LEDs blink -> FPGA is working");

    digitalWrite(STATUS_LED, LOW);
    Serial.println("SYSTEM READY: Send G1 X.. Y.. Z..");
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

void moveAxes(float tx, float ty, float tz) {
    long sX = abs((tx - curX) * STEPS_PER_MM);
    long sY = abs((ty - curY) * STEPS_PER_MM);
    long sZ = abs((tz - curZ) * STEPS_PER_MM);

    Serial.print("Pulses -> X:"); Serial.print(sX);
    Serial.print(" Y:"); Serial.print(sY);
    Serial.print(" Z:"); Serial.println(sZ);

    digitalWrite(X_DIR, (tx - curX) >= 0 ? HIGH : LOW);
    digitalWrite(Y_DIR, (ty - curY) >= 0 ? HIGH : LOW);
    digitalWrite(Z_DIR, (tz - curZ) >= 0 ? HIGH : LOW);

    const int pulseDelay = 1500;

    long maxSteps = max(sX, max(sY, sZ));

    for (long i = 0; i < maxSteps; i++) {
        if (i < sX) digitalWrite(X_STEP, 1);
        if (i < sY) digitalWrite(Y_STEP, 1);
        if (i < sZ) digitalWrite(Z_STEP, 1);

        delayMicroseconds(pulseDelay);

        if (i < sX) digitalWrite(X_STEP, 0);
        if (i < sY) digitalWrite(Y_STEP, 0);
        if (i < sZ) digitalWrite(Z_STEP, 0);

        delayMicroseconds(pulseDelay);
    }

    curX = tx; curY = ty; curZ = tz;
}

float extractValue(String g, char c, float defaultValue) {
    int pos = g.indexOf(c);
    if (pos == -1) return defaultValue;
    int endPos = g.indexOf(' ', pos);
    if (endPos == -1) endPos = g.length();
    return g.substring(pos + 1, endPos).toFloat();
}
*/

/*
#include <Arduino.h>
#include <LittleFS.h>
#include <Shrike.h>

ShrikeFlash fpga;

// --- INTERNAL BRIDGE PINS ---
const int X_STEP  = 15;
const int X_DIR   = 14;
const int Y_STEP  = 0;
const int Y_DIR   = 3;
const int Z_STEP  = 1;
const int Z_DIR   = 13;
const int RST_PIN = 2; // FPGA Reset

const int STATUS_LED = 25;
bool flashSuccess = false;

void setup() {
Serial.begin(115200);
delay(2000);
Serial.println("\n--- AUTO-SPIN TEST MODE ---");

pinMode(STATUS_LED, OUTPUT);

// 1. Init System
if (!LittleFS.begin() || !fpga.begin()) {
    Serial.println("SYSTEM ERROR: Check hardware/LittleFS.");
    return;
}

// 2. Flash FPGA
if (fpga.flash("/fpga_logic.bin")) {
    Serial.println("FPGA LOADED. STARTING MOTORS...");
    flashSuccess = true;

    // Configure pins
    pinMode(RST_PIN, OUTPUT);
    pinMode(X_STEP, OUTPUT); pinMode(X_DIR, OUTPUT);
    pinMode(Y_STEP, OUTPUT); pinMode(Y_DIR, OUTPUT);
    pinMode(Z_STEP, OUTPUT); pinMode(Z_DIR, OUTPUT);

    // Set direction to Forward
    digitalWrite(X_DIR, HIGH);
    digitalWrite(Y_DIR, HIGH);
    digitalWrite(Z_DIR, HIGH);

    // Release Reset
    digitalWrite(RST_PIN, LOW);
    delay(100);
    digitalWrite(RST_PIN, HIGH);
} else {
    Serial.println("FPGA FLASH FAILED.");
}
}

void loop() {
// If flashing worked, spin forever at 100Hz
if (flashSuccess) {
    digitalWrite(STATUS_LED, HIGH);

    // Pulse HIGH
    digitalWrite(X_STEP, HIGH);
    digitalWrite(Y_STEP, HIGH);
    digitalWrite(Z_STEP, HIGH);
    delayMicroseconds(5000); // 5ms

    // Pulse LOW
    digitalWrite(X_STEP, LOW);
    digitalWrite(Y_STEP, LOW);
    digitalWrite(Z_STEP, LOW);
    delayMicroseconds(5000); // 5ms

    digitalWrite(STATUS_LED, LOW);
}
}
*/