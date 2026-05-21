package com.vn.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductDetailResponse {

    private Long id;
    private String code;
    private String name;
    private String description;

    private Long brandId;
    private String brandName;

    private Long categoryId;
    private String categoryName;

    private Long originId;
    private String originName;

    private Long supplierId;
    private String supplierName;

    private Long materialId;
    private String materialName;

    private Boolean isActive;
    private OffsetDateTime deletedAt;

    private List<ProductVariantResponse> variants;
    private List<String> images;
}