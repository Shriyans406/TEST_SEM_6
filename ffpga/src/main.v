(* top *) module cnc_sequencer (
    (* iopad_external_pin, clkbuf_inhibit *) input i_clk,   // Internal OSC (Target: 24MHz)
    (* iopad_external_pin *) input i_rst,

    // Inputs from RP2040
    (* iopad_external_pin *) input i_x_step, i_x_dir,
    (* iopad_external_pin *) input i_y_step, i_y_dir,
    (* iopad_external_pin *) input i_z_step, i_z_dir,

    // Outputs to ULN2003
    (* iopad_external_pin *) output [3:0] o_x_motor,
    (* iopad_external_pin *) output [3:0] o_y_motor,
    (* iopad_external_pin *) output [3:0] o_z_motor,

    (* iopad_external_pin *) output o_status_led,
    (* iopad_external_pin *) output o_led_en,
    (* iopad_external_pin *) output o_motor_en
);

    assign o_led_en = 1'b1;
    assign o_motor_en = 1'b1;
    assign o_status_led = 1'b1;

    // --- TIMING PROTECTION: Synchronizers ---
    // We use 2-stage shift registers to stabilize the asynchronous MCU signals
    reg [1:0] x_step_sync, x_dir_sync;
    reg [1:0] y_step_sync, y_dir_sync;
    reg [1:0] z_step_sync, z_dir_sync;

    reg [1:0] x_phase, y_phase, z_phase;

    // Phase pattern function
    function [3:0] step_pattern(input [1:0] phase);
        case(phase)
            2'b00: step_pattern = 4'b1000;
            2'b01: step_pattern = 4'b0100;
            2'b10: step_pattern = 4'b0010;
            2'b11: step_pattern = 4'b0001;
        endcase
    endfunction

    always @(posedge i_clk) begin
        // Double-flop the inputs to prevent metastability glitches
        x_step_sync <= {x_step_sync[0], i_x_step};
        x_dir_sync  <= {x_dir_sync[0],  i_x_dir};
        
        y_step_sync <= {y_step_sync[0], i_y_step};
        y_dir_sync  <= {y_dir_sync[0],  i_y_dir};
        
        z_step_sync <= {z_step_sync[0], i_z_step};
        z_dir_sync  <= {z_dir_sync[0],  i_z_dir};

        // Check for Rising Edge on the SYNCHRONIZED signal
        // X-AXIS
        if (x_step_sync == 2'b01) begin // This detects the 0 -> 1 transition cleanly
            if (x_dir_sync[1]) x_phase <= x_phase - 1;
            else               x_phase <= x_phase + 1;
        end

        // Y-AXIS
        if (y_step_sync == 2'b01) begin
            if (y_dir_sync[1]) y_phase <= y_phase - 1;
            else               y_phase <= y_phase + 1;
        end

        // Z-AXIS
        if (z_step_sync == 2'b01) begin
            if (z_dir_sync[1]) z_phase <= z_phase - 1;
            else               z_phase <= z_phase + 1;
        end
    end

    assign o_x_motor = step_pattern(x_phase);
    assign o_y_motor = step_pattern(y_phase);
    assign o_z_motor = step_pattern(z_phase);

endmodule