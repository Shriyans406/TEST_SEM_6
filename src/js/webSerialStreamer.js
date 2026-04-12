export class WebSerialStreamer {
  constructor() {
    this.port = null;
    this.writer = null;
    this.reader = null;
    this.baudRate = 115200;
  }

  async connect() {
    if (!("serial" in navigator)) {
      alert("Web Serial API not supported in this browser. Please use Chrome/Edge.");
      return false;
    }

    // Reuse existing port if already connected
    if (this.port) {
      console.log("Port already connected. Reusing.");
      return true;
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      console.log("Web Serial Port opened successfully");

      // Initialize streams once per connection
      const encoder = new TextEncoderStream();
      this.writableStreamClosed = encoder.readable.pipeTo(this.port.writable);
      this.writer = encoder.writable.getWriter();

      const decoder = new TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(decoder.writable);
      this.reader = decoder.readable.getReader();

      // Wait for FPGA to program and output CNC Ready
      console.log("Waiting for hardware to boot...");
      await this.waitForCNCReady();

      return true;
    } catch (err) {
      console.error("Failed to open serial port:", err);
      if (err.name === 'NotFoundError') {
        alert("No port selected.");
      } else {
        alert("Error opening serial port: " + err.message);
      }
      this.port = null;
      return false;
    }
  }

  async streamGcode(gcodeLines) {
    if (!this.port || !this.writer || !this.reader) {
      console.error("Not connected to serial port.");
      return;
    }

    try {
      for (let line of gcodeLines) {
        // Strip out inline comments
        let cmd = line;
        if (cmd.includes(';')) {
          cmd = cmd.split(';')[0];
        }
        cmd = cmd.trim();

        if (!cmd) continue; // Skip empty commands
        
        console.log("Sending: ", cmd);
        await this.writer.write(cmd + "\n");
        await this.waitForOk();
      }
      console.log("Finished streaming G-code.");
      alert("Plotting complete!");
    } catch (error) {
      console.error("Error writing to serial port:", error);
    }
    // Do not release locks here; we want to keep the port open for future plots
  }

  async waitForCNCReady() {
    let response = "";
    while (true) {
      const readPromise = this.reader.read();
      // Add a 5 second timeout so we don't hang if we missed the message
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
      
      try {
        const { value, done } = await Promise.race([readPromise, timeoutPromise]);
        if (done) break;
        response += value;
        console.log("Boot log:", value.trim());
        if (response.includes("CNC Ready") || response.includes("ok")) {
          console.log("Hardware is ready!");
          break;
        }
      } catch (err) {
        console.log("Timeout waiting for CNC Ready or port reopened. Proceeding anyway...");
        break;
      }
    }
  }

  async waitForOk() {
    let response = "";
    while (true) {
      const readPromise = this.reader.read();
      // Add a 10 second timeout per command so we don't hang infinitely
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

      try {
        const { value, done } = await Promise.race([readPromise, timeoutPromise]);
        if (done) {
          break; // Port probably closed
        }
        response += value;
        
        if (response.includes("ok")) {
          console.log("Received ok");
          break;
        }
        if (response.includes("error")) {
          console.error("Received error from board:", response);
          break;
        }
      } catch (err) {
        console.warn("Timeout waiting for 'ok'. Resuming layout pass...");
        break;
      }
    }
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
    }
    if (this.writer) {
      await this.writer.close();
      this.writer.releaseLock();
    }
    if (this.port) {
      await this.port.close();
      console.log("Serial port closed.");
    }
    this.port = null;
    this.writer = null;
    this.reader = null;
  }
}
