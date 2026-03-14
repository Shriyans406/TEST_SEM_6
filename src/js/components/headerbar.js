import "../../css/Headerbar.css";
import "../../css/ToolbarButton.css";
import React, { Component } from "react";
import ToolbarButton from "./toolbarButton";

export default class Headerbar extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  /**
   * onClick handler for menu button
   */
  handleOnClick(){
    this.props.popover.current.toggleVisibility()
  }

  handleUndo() {
    if (this.props.undo) this.props.undo();
  }

  handleRedo() {
    if (this.props.redo) this.props.redo();
  }

  render() {
    return (
      <div className="headerbar">
        <div className="headerbar-title">
          <h3>Design</h3>
        </div>
        <div className="headerbar-actions" style={{display: 'flex', marginLeft: 'auto', gap: '8px', marginRight: '16px'}}>
          <ToolbarButton
            command="Undo"
            icon={`${process.env.PUBLIC_URL}/icons/tools/undo-symbolic.svg`}
            onClick={this.handleUndo.bind(this)}
            shortcut="ctrl+z"
          />
          <ToolbarButton
            command="Redo"
            icon={`${process.env.PUBLIC_URL}/icons/tools/redo-symbolic.svg`}
            onClick={this.handleRedo.bind(this)}
            shortcut="ctrl+y"
          />
        </div>
        <div className="headerbar-menu">
          <ToolbarButton icon={`${process.env.PUBLIC_URL}/icons/platform/menu-symbolic.svg`} onClick={this.handleOnClick.bind(this)} />
        </div>
      </div> 
    );
  }
}
