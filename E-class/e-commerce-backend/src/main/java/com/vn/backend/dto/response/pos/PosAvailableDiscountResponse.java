package com.vn.backend.dto.response.pos;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
public class PosAvailableDiscountResponse {
    private String voucherType; // PROMOTION | COUPON
    private Long id;
    private String code;
    private String name;

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

    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private Boolean isActive;

    private BigDecimal estimatedDiscountAmount;
    private Boolean eligible;
    private String ineligibleReason;
    private Boolean bestVoucher;
    private Boolean isBest;
}
