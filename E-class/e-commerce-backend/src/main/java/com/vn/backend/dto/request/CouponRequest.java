package com.vn.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class CouponRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String discountType;
    @NotNull
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    private BigDecimal maxDiscountAmount;
    private Integer usageLimit;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private Boolean isActive;
}
