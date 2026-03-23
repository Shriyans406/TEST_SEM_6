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
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      console.log("Web Serial Port opened successfully");
      return true;
    } catch (err) {
      console.error("Failed to open serial port:", err);
      if (err.name === 'NotFoundError') {
        alert("No port selected.");
      } else {
        alert("Error opening serial port: " + err.message);
      }
      return false;
    }
  }

  async streamGcode(gcodeLines) {
    if (!this.port) {
      console.error("Not connected to serial port.");
      return;
    }

    const encoder = new TextEncoderStream();
    const writableStreamClosed = encoder.readable.pipeTo(this.port.writable);
    this.writer = encoder.writable.getWriter();

    const decoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();

    try {
      for (let line of gcodeLines) {
        if (!line.trim() || line.startsWith(';')) continue;
        
        console.log("Sending: ", line);
        await this.writer.write(line + "\n");
        await this.waitForOk();
      }
      console.log("Finished streaming G-code.");
      alert("Plotting complete!");
    } catch (error) {
      console.error("Error writing to serial port:", error);
    } finally {
      this.writer.releaseLock();
      this.reader.releaseLock();
      
      // Keep port open or close it? usually, keep open until user disconnects, 
      // but if we need to close it cleanly:
      // await this.port.close();
    }
  }

  async waitForOk() {
    let response = "";
    while (true) {
      const { value, done } = await this.reader.read();
      if (done) {
        break; // Port probably closed
      }
      response += value;
      // Many GRBL or generic firmwares return 'ok\n' or 'ok\r\n'
      if (response.includes("ok")) {
        console.log("Received ok");
        break;
      }
      if (response.includes("error")) {
        console.error("Received error from board:", response);
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
  }
}
