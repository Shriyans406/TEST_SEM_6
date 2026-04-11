(* top *) module cnc_sequencer (
    (* iopad_external_pin, clkbuf_inhibit *) input i_clk,   // Map to OSC_CLK
    (* iopad_external_pin *) input i_rst,                  // Map to PIN 16

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

    // Registers to detect the rising edge of the step signals
    reg [1:0] x_phase, y_phase, z_phase;
    reg x_step_prev, y_step_prev, z_step_prev;

    // Phase pattern function
    function [3:0] step_pattern(input [1:0] phase);
        case(phase)
            2'b00: step_pattern = 4'b1000;
            2'b01: step_pattern = 4'b0100;
            2'b10: step_pattern = 4'b0010;
            2'b11: step_pattern = 4'b0001;
        endcase
    endfunction

    // Main synchronous logic block
    always @(posedge i_clk) begin
        if (i_rst) begin
            x_phase <= 0; y_phase <= 0; z_phase <= 0;
            x_step_prev <= 0; y_step_prev <= 0; z_step_prev <= 0;
        end else begin
            // Detect Rising Edge for X (Motor C)
            x_step_prev <= i_x_step;
            if (i_x_step && !x_step_prev)
                x_phase <= (i_x_dir) ? x_phase - 1 : x_phase + 1;

            // Detect Rising Edge for Y (Motor B)
            y_step_prev <= i_y_step;
            if (i_y_step && !y_step_prev)
                y_phase <= (i_y_dir) ? y_phase - 1 : y_phase + 1;

            // Detect Rising Edge for Z (Motor A)
            z_step_prev <= i_z_step;
            if (i_z_step && !z_step_prev)
                z_phase <= (i_z_dir) ? z_phase - 1 : z_phase + 1;
        end
    end

    assign o_x_motor = step_pattern(x_phase);
    assign o_y_motor = step_pattern(y_phase);
    assign o_z_motor = step_pattern(z_phase);

endmodule