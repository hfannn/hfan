package com.vn.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HomeResponse {
    private List<HomeProductResponse> featuredProducts;
    private List<HomeProductResponse> promotionProducts;
    private List<HomeProductResponse> bestSellerProducts;
}
