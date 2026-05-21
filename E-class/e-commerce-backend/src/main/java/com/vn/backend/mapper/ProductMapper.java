package com.vn.backend.mapper;

import com.vn.backend.dto.response.ProductDetailResponse;
import com.vn.backend.dto.response.ProductVariantResponse;
import com.vn.backend.entity.Product;
import com.vn.backend.entity.ProductImage;
import com.vn.backend.entity.ProductVariant;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class ProductMapper {

    public ProductVariantResponse toVariantResponse(ProductVariant v) {
        Map<String, String> attributes = v.getVariantAttributeValues() == null
                ? Collections.emptyMap()
                : v.getVariantAttributeValues()
                .stream()
                .filter(av -> av.getAttributeValue() != null)
                .filter(av -> av.getAttributeValue().getAttribute() != null)
                .collect(Collectors.toMap(
                        av -> av.getAttributeValue().getAttribute().getCode(),
                        av -> av.getAttributeValue().getValue(),
                        (oldVal, newVal) -> oldVal
                ));

        return new ProductVariantResponse(
                v.getId(),
                v.getCode(),
                v.getBarcode(),
                v.getCostPrice(),
                v.getSellingPrice(),
                v.getStockQuantity(),
                v.getBinLocation(),
                v.getIsActive(),
                attributes
        );
    }

    public ProductDetailResponse toDetailResponse(Product p) {
        List<ProductVariantResponse> variants = p.getVariants() == null
                ? List.of()
                : p.getVariants()
                .stream()
                .filter(v -> v.getDeletedAt() == null)
                .map(this::toVariantResponse)
                .toList();

        List<String> images = p.getImages() == null
                ? List.of()
                : p.getImages()
                .stream()
                .sorted(Comparator
                        .comparing(
                                (ProductImage img) -> Boolean.TRUE.equals(img.getIsPrimary()) ? 0 : 1
                        )
                        .thenComparing(
                                ProductImage::getDisplayOrder,
                                Comparator.nullsLast(Integer::compareTo)
                        ))
                .map(ProductImage::getImageUrl)
                .toList();

        return new ProductDetailResponse(
                p.getId(),
                p.getCode(),
                p.getName(),
                p.getDescription(),

                p.getBrand() != null ? p.getBrand().getId() : null,
                p.getBrand() != null ? p.getBrand().getName() : null,

                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,

                p.getOrigin() != null ? p.getOrigin().getId() : null,
                p.getOrigin() != null ? p.getOrigin().getName() : null,

                p.getSupplier() != null ? p.getSupplier().getId() : null,
                p.getSupplier() != null ? p.getSupplier().getName() : null,

                p.getMaterial() != null ? p.getMaterial().getId() : null,
                p.getMaterial() != null ? p.getMaterial().getValue() : null,

                p.getIsActive(),
                p.getDeletedAt(),

                variants,
                images
        );
    }

}