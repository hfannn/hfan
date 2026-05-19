package com.vn.backend.service.impl;

import com.vn.backend.dto.response.BestSellerProductRow;
import com.vn.backend.dto.response.HomeProductResponse;
import com.vn.backend.dto.response.HomeResponse;
import com.vn.backend.dto.response.PageResponse;
import com.vn.backend.dto.response.ProductListResponse;
import com.vn.backend.repository.ProductRepository;
import com.vn.backend.repository.StatisticsRepository;
import com.vn.backend.service.HomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HomeServiceImpl implements HomeService {

    private final ProductServiceImpl productService;
    private final ProductRepository productRepository;
    private final StatisticsRepository statisticsRepository;

    @Override
    public HomeResponse getHomeData(int limit) {
        int safeLimit = normalizeLimit(limit);
        List<HomeProductResponse> promotionProducts = getPromotionProducts(safeLimit);
        List<Long> usedIds = promotionProducts.stream().map(HomeProductResponse::getProductId).toList();

        List<HomeProductResponse> featuredProducts = getFeaturedProducts(safeLimit * 2).stream()
                .filter(item -> !usedIds.contains(item.getProductId()))
                .limit(safeLimit)
                .toList();

        List<Long> usedAfterFeatured = java.util.stream.Stream
                .concat(usedIds.stream(), featuredProducts.stream().map(HomeProductResponse::getProductId))
                .toList();

        List<HomeProductResponse> bestSellerProducts = getBestSellers(safeLimit * 2).stream()
                .filter(item -> !usedAfterFeatured.contains(item.getProductId()))
                .limit(safeLimit)
                .toList();

        return new HomeResponse(featuredProducts, promotionProducts, bestSellerProducts);
    }

    @Override
    public List<HomeProductResponse> getFeaturedProducts(int limit) {
        PageResponse<ProductListResponse> products = productService.filterProducts(
                0,
                normalizeLimit(limit),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "newest",
                Boolean.FALSE,
                null,
                null,
                null
        );

        return products.getContent().stream()
                .filter(item -> item.getTotalStock() != null && item.getTotalStock() > 0)
                .map(item -> toHomeProduct(item, null))
                .toList();
    }

    @Override
    public List<HomeProductResponse> getPromotionProducts(int limit) {
        PageResponse<ProductListResponse> products = productService.filterProducts(
                0,
                normalizeLimit(limit),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "discountDesc",
                Boolean.TRUE,
                null,
                null,
                null
        );

        return products.getContent().stream()
                .filter(item -> item.getTotalStock() != null && item.getTotalStock() > 0)
                .sorted((left, right) -> nullSafe(right.getDiscountPercent()).compareTo(nullSafe(left.getDiscountPercent())))
                .map(item -> toHomeProduct(item, null))
                .toList();
    }

    @Override
    public List<HomeProductResponse> getBestSellers(int limit) {
        List<BestSellerProductRow> rows = statisticsRepository.getPublicBestSellerProductRows(normalizeLimit(limit));
        if (rows.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> soldByProductId = new LinkedHashMap<>();
        rows.forEach(row -> soldByProductId.put(row.getProductId(), row.getSoldQuantity()));

        Map<Long, ProductListResponse> productById = productRepository
                .findActiveProductsByIds(soldByProductId.keySet().stream().toList())
                .stream()
                .map(productService::mapProductForPublicCard)
                .filter(item -> item.getTotalStock() != null && item.getTotalStock() > 0)
                .collect(LinkedHashMap::new, (map, item) -> map.put(item.getId(), item), Map::putAll);

        return soldByProductId.entrySet().stream()
                .map(entry -> {
                    ProductListResponse product = productById.get(entry.getKey());
                    return product == null ? null : toHomeProduct(product, entry.getValue());
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private HomeProductResponse toHomeProduct(ProductListResponse product, Long soldQuantity) {
        boolean promotionActive = Boolean.TRUE.equals(product.getIsSale());
        BigDecimal price = promotionActive
                ? product.getMinSalePrice()
                : product.getMinPrice();

        return new HomeProductResponse(
                product.getId(),
                product.getName(),
                product.getImageUrl(),
                price,
                product.getMinOriginalPrice() != null ? product.getMinOriginalPrice() : product.getMinPrice(),
                promotionActive ? product.getMinSalePrice() : null,
                promotionActive ? product.getDiscountPercent() : BigDecimal.ZERO,
                soldQuantity,
                promotionActive
        );
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 4;
        }
        return Math.min(limit, 24);
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
