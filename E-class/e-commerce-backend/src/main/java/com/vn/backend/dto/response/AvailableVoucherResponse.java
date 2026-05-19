package com.vn.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class AvailableVoucherResponse {
    private String code;
    private String name;
    private String voucherType; // PROMOTION | COUPON

    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    private BigDecimal maxDiscountAmount;

    private Integer issuedQuantity;
    private Long usedCount;
    private Integer remainingCount;
    private Integer remainingUses;
    private Double usedPercent;
    private Double remainingPercent;

    private BigDecimal estimatedDiscountAmount;
    private Boolean eligible;
    private String ineligibleReason;
    private Boolean bestVoucher;
    private Boolean isBest;

    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
}
