package com.vn.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class CouponResponse {
    private Long id;
    private String code;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    private BigDecimal maxDiscountAmount;
    private Integer usageLimit;
    private Boolean isActive;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private OffsetDateTime createdAt;

    // Tổng số lượng phát hành
    private Integer issuedQuantity;

    // Tổng số lượt đã dùng toàn hệ thống
    private Long usedCount;

    // Số lượng còn lại
    private Integer remainingCount;
    private Integer remainingUsage;

    // % đã dùng
    private Double usedPercent;

    // % còn lại
    private Double remainingPercent;
}
