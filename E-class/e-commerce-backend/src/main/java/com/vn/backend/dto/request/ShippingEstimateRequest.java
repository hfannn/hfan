package com.vn.backend.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class ShippingEstimateRequest {
    private ShippingInfo shippingInfo;
    private List<ShippingItem> items;

    @Data
    public static class ShippingInfo {
        private String province;
        private String district;
        private Integer districtId;
        private String wardCode;
        private String address;
    }

    @Data
    public static class ShippingItem {
        private Long variantId;
        private Integer quantity;
    }
}
