package com.vn.backend.dto.request.pos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PosCreateOrderRequest {

    private Long employeeId; // ignored — employee is resolved from JWT on the server

    private Long customerId;

    @NotNull(message = "storeId không được để trống")
    private Long storeId;

    private String note;
}