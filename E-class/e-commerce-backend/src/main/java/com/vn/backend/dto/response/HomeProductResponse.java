package com.vn.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HomeProductResponse {
    private Long productId;
    private String name;
    private String imageUrl;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private BigDecimal salePrice;
    private BigDecimal discountPercent;
    private Long soldQuantity;
    private Boolean isPromotionActive;
}
