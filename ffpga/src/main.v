(* top *) module cnc_sequencer (
    (* iopad_external_pin, clkbuf_inhibit *) input i_clk,
    (* iopad_external_pin *) input i_rst,

    // Inputs from RP2040
    (* iopad_external_pin *) input i_x_step, i_x_dir,
    (* iopad_external_pin *) input i_y_step, i_y_dir,
    //(* iopad_external_pin *) input i_z_step, i_z_dir,
    (* iopad_external_pin *) input i_z_step, 
    input i_z_dir,

    // Outputs to ULN2003
    (* iopad_external_pin *) output [3:0] o_x_motor,
    (* iopad_external_pin *) output [3:0] o_y_motor,
    (* iopad_external_pin *) output [3:0] o_z_motor,

    (* iopad_external_pin *) output o_status_led,
    (* iopad_external_pin *) output o_led_en,
    (* iopad_external_pin *) output o_motor_en
);

    // Constant enables
    assign o_led_en   = 1'b1;
    assign o_motor_en = 1'b1;

    // ==========================================
    // Synchronizers & Edge Detection for ALL Axes
    // ==========================================
    reg [2:0] x_sync, y_sync, z_sync; // 3 bits to handle sync + edge detection
    reg [1:0] x_phase, y_phase, z_phase; // 2 bits = 0 to 3 (Perfect for 4-step)

    always @(posedge i_clk) begin
        if (i_rst) begin
            x_sync <= 3'b0; y_sync <= 3'b0; z_sync <= 3'b0;
            x_phase <= 2'd0; y_phase <= 2'd0; z_phase <= 2'd0;
        end else begin
            // Shift in the step signals for synchronization
            x_sync <= {x_sync[1:0], i_x_step};
            y_sync <= {y_sync[1:0], i_y_step};
            z_sync <= {z_sync[1:0], i_z_step};

            // Detect Rising Edge (Comparing bit 2 and bit 1 of the sync regs)
            // X-AXIS
            if (x_sync[1] && !x_sync[2]) begin
                if (i_x_dir) x_phase <= x_phase - 1;
                else         x_phase <= x_phase + 1;
            end

            // Y-AXIS
            if (y_sync[1] && !y_sync[2]) begin
                if (i_y_dir) y_phase <= y_phase - 1;
                else         y_phase <= y_phase + 1;
            end

            // Z-AXIS
            if (z_sync[1] && !z_sync[2]) begin
                if (i_z_dir) z_phase <= z_phase - 1;
                else         z_phase <= z_phase + 1;
            end
        end
    end

    // ==========================================
    // 4-Step Wave Drive Sequence
    // ==========================================
    function [3:0] step_pattern(input [1:0] phase);
        case (phase)
            2'd0: step_pattern = 4'b1000; // IN1
            2'd1: step_pattern = 4'b0100; // IN2
            2'd2: step_pattern = 4'b0010; // IN3
            2'd3: step_pattern = 4'b0001; // IN4
            default: step_pattern = 4'b0000;
        endcase
    endfunction

    // Assign patterns to outputs
    assign o_x_motor = step_pattern(x_phase);
    assign o_y_motor = step_pattern(y_phase);
    assign o_z_motor = step_pattern(z_phase);

    // Debug LED
    assign o_status_led = x_sync[1];

endmodule