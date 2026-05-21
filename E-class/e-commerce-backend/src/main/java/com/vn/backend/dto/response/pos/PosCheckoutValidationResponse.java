package com.vn.backend.dto.response.pos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PosCheckoutValidationResponse {

    private boolean valid;
    private boolean hasChanges;
    private String message;
    private List<ItemIssue> issues;
    private BigDecimal newSubtotal;
    private BigDecimal couponDiscount;
    private BigDecimal finalTotal;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemIssue {
        private Long variantId;
        private String productName;
        private String variantCode;
        private String issueType;
        private String severity;
        private BigDecimal oldPrice;
        private BigDecimal newPrice;
        private Integer requestedQty;
        private Integer availableQty;
        private String message;
    }
}
