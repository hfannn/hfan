package com.vn.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CheckoutValidationRequest {

    @NotEmpty
    @Valid
    private List<OrderItemRequest> items;

    private String voucherCode;

    @Valid
    private ShippingInfoRequest shippingInfo;

    // Old snapshots from the last quote — used to detect changes
    private List<OldItemSnapshot> oldItems;
    private BigDecimal oldSubtotal;
    private BigDecimal oldDiscount;
    private BigDecimal oldShippingFee;
    private BigDecimal oldTotal;

    @Data
    public static class OldItemSnapshot {
        private Long variantId;
        private BigDecimal unitPrice;
        private Long promotionId;
    }
}
