import "../css/DesignWeb.css";
import React, { Component } from "react";

// Use CDN for production
import { Core } from "./Design-Core/core/core.js";
import { Text } from "./Design-Core/entities/text.js";

import Headerbar from "./components/headerbar.js";
import Canvas from "./components/canvas.js";
import Commandline from "./components/commandline.js";
import Toolbar from "./components/toolbar.js";
import Popover from "./components/popover.js";
import PopoverMenuItem from "./components/popoverMenuItem.js";

import { saveAs } from "file-saver";
import LayersWindow from "./components/layersWindow.js";

// === MONKEY PATCH FIX ===
// The TextMetrics object returned by ctx.measureText loses context when deep cloned,
// throwing 'Illegal invocation' during 'm' (move) or other clone operations.
// We patch Text.draw to convert it to a plain object.
const originalTextDraw = Text.prototype.draw;
Text.prototype.draw = function(ctx, scale) {
  originalTextDraw.call(this, ctx, scale);
  if (this.boundingRect && this.boundingRect.width !== undefined && this.boundingRect.constructor.name === "TextMetrics") {
    this.boundingRect = { width: this.boundingRect.width, height: this.height };
  }
};
// ========================

export default class DesignWeb extends Component {
  constructor() {
    super();
    this.core = new Core();
    this.state = { mousePos: "" };

    this.popoverRef = React.createRef();
    this.layersWindowRef = React.createRef();
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        this.undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Z' && e.shiftKey) {
        e.preventDefault();
        this.redo();
      }
    }
  }

  undo() {
    if (this.core && this.core.scene) {
      this.core.scene.undo();
    }
  }

  redo() {
    if (this.core && this.core.scene) {
      this.core.scene.redo();
    }
  }

  updateMousePos(mousePos) {
    this.setState({ mousePos: mousePos });
  }

  // --- NEW: Conversion Logic ---
  handleConvertToSVG() {
    this.popoverRef.current.close();
    console.log("Sending DXF to server for SVG conversion...");

    // Get the actual CAD data
    const dxfData = this.core.saveFile();

    // Send to your Node.js backend (Adjust the URL to your server's IP)
    fetch("http://localhost:5000/api/convert-svg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dxf: dxfData }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Server conversion failed");
        return response.blob();
      })
      .then((blob) => {
        // Download the SVG returned by Aspose
        saveAs(blob, "plotter-design.svg");
      })
      .catch((err) => {
        console.error(err);
        alert("Conversion failed. Is your Node.js server running?");
      });
  }

  handleOpenFile(e) {
    this.popoverRef.current.close();
    const fileSelector = document.createElement("input");
    fileSelector.setAttribute("type", "file");
    fileSelector.setAttribute("multiple", "multiple");
    fileSelector.addEventListener("change", this.openFile.bind(this));
    fileSelector.click();
  }

  openFile(e) {
    const fileSelector = e.target;
    const file = fileSelector.files && fileSelector.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      this.core.openFile(text);
    };
    reader.readAsText(file);
  }

  handleSaveFile() {
    this.popoverRef.current.close();
    const dxfData = this.core.saveFile();
    var blob = new Blob([dxfData], { type: "text/plain;" });
    saveAs(blob, "design.dxf");
  }

  handleExportFile() {
    this.popoverRef.current.close();
    console.log("Export File");
  }

  showLayersWindow() {
    this.popoverRef.current.close();
    this.layersWindowRef.current.toggleVisibility();
  }

  render() {
    return (
      <div className="DesignWeb">
        <LayersWindow core={this.core} ref={this.layersWindowRef} />
        <Popover ref={this.popoverRef}>
          <PopoverMenuItem
            action={this.handleOpenFile.bind(this)}
            title="Open"
          />
          <PopoverMenuItem
            action={this.handleSaveFile.bind(this)}
            title="Save"
          />

          {/* ADDED THE CONVERT BUTTON HERE */}
          <PopoverMenuItem
            action={this.handleConvertToSVG.bind(this)}
            title="Convert to SVG"
          />

          <PopoverMenuItem
            action={this.handleExportFile.bind(this)}
            title="Export"
          />
          <PopoverMenuItem
            action={this.showLayersWindow.bind(this)}
            title="Layers"
          />
        </Popover>

        <Headerbar
          core={this.core}
          popover={this.popoverRef}
          redo={this.redo.bind(this)}
          undo={this.undo.bind(this)}
        />
        <Canvas
          core={this.core}
          mousePosCallback={this.updateMousePos.bind(this)}
        />
        <Toolbar core={this.core} style="left" type="Entity" />
        <Toolbar core={this.core} style="right" type="Tool" />
        <Commandline core={this.core} mousePos={this.state.mousePos} />
      </div>
    );
  }
}
