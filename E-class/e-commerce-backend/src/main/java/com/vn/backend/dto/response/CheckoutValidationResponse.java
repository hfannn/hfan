package com.vn.backend.dto.response;

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
public class CheckoutValidationResponse {

    /** "OK" | "BLOCKING" | "REQUIRES_CONFIRMATION" */
    private String status;

    private List<ValidationIssue> issues;

    /** Recalculated items with current prices */
    private List<CheckoutQuoteItemResponse> latestItems;

    private BigDecimal oldSubtotal;
    private BigDecimal newSubtotal;
    private BigDecimal oldDiscount;
    private BigDecimal newDiscount;
    private BigDecimal oldShippingFee;
    private BigDecimal newShippingFee;
    private BigDecimal oldTotal;
    private BigDecimal newTotal;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationIssue {
        /**
         * PRODUCT_PRICE_CHANGED | PROMOTION_CHANGED | VOUCHER_CHANGED |
         * VOUCHER_INVALID | OUT_OF_STOCK | PRODUCT_INACTIVE | VARIANT_INACTIVE
         */
        private String type;

        /** BLOCKING | REQUIRES_CONFIRMATION */
        private String severity;

        private Long productId;
        private Long variantId;
        private String productName;
        private BigDecimal oldValue;
        private BigDecimal newValue;
        private String message;
    }
}
