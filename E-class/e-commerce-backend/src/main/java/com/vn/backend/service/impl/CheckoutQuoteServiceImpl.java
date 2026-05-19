package com.vn.backend.service.impl;

import com.vn.backend.dto.request.CheckoutQuoteRequest;
import com.vn.backend.dto.request.OrderItemRequest;
import com.vn.backend.dto.request.ShippingInfoRequest;
import com.vn.backend.dto.response.CheckoutQuoteItemResponse;
import com.vn.backend.dto.response.CheckoutQuoteResponse;
import com.vn.backend.dto.response.ProductPriceResponse;
import com.vn.backend.dto.response.ValidateDiscountResponse;
import com.vn.backend.entity.AttributeValue;
import com.vn.backend.entity.ProductImage;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.VariantAttributeValue;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.security.CustomUserDetails;
import com.vn.backend.service.CheckoutQuoteService;
import com.vn.backend.service.DiscountService;
import com.vn.backend.service.GhnShippingService;
import com.vn.backend.service.ProductPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CheckoutQuoteServiceImpl implements CheckoutQuoteService {

    private final ProductVariantRepository productVariantRepository;
    private final ProductPriceService productPriceService;
    private final DiscountService discountService;
    private final GhnShippingService ghnShippingService;

    @Override
    public CheckoutQuoteResponse quote(CheckoutQuoteRequest request, CustomUserDetails userDetails) {
        return calculate(
                request.getItems(),
                request.getVoucherCode(),
                request.getShippingInfo(),
                userDetails,
                null
        );
    }

    @Override
    public CheckoutQuoteResponse calculate(
            List<OrderItemRequest> items,
            String voucherCode,
            ShippingInfoRequest shippingInfo,
            CustomUserDetails userDetails,
            Map<Long, ProductVariant> variantOverrides
    ) {
        if (items == null || items.isEmpty()) {
            throw new InvalidRequestException("Đơn hàng phải có ít nhất một sản phẩm.");
        }

        Map<Long, ProductVariant> variantMap = resolveVariants(items, variantOverrides);
        List<CheckoutQuoteItemResponse> quoteItems = new ArrayList<>();
        BigDecimal originalSubtotal = BigDecimal.ZERO;
        BigDecimal productDiscountTotal = BigDecimal.ZERO;
        BigDecimal subtotalBeforeVoucher = BigDecimal.ZERO;

        for (OrderItemRequest item : items) {
            if (item.getVariantId() == null || item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new InvalidRequestException("Sản phẩm hoặc số lượng không hợp lệ.");
            }

            ProductVariant variant = variantMap.get(item.getVariantId());
            validateVariantCanBeQuoted(variant);

            ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
            BigDecimal originalPrice = defaultZero(price.getOriginalPrice());
            BigDecimal unitPrice = defaultZero(price.getUnitPrice());
            BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());
            BigDecimal itemOriginalSubtotal = originalPrice.multiply(quantity);
            BigDecimal lineTotal = unitPrice.multiply(quantity);

            originalSubtotal = originalSubtotal.add(itemOriginalSubtotal);
            subtotalBeforeVoucher = subtotalBeforeVoucher.add(lineTotal);
            productDiscountTotal = productDiscountTotal.add(itemOriginalSubtotal.subtract(lineTotal));

            quoteItems.add(CheckoutQuoteItemResponse.builder()
                    .productId(variant.getProduct() != null ? variant.getProduct().getId() : null)
                    .variantId(variant.getId())
                    .productName(variant.getProduct() != null ? variant.getProduct().getName() : null)
                    .variantCode(variant.getCode())
                    .size(extractAttributeValue(variant, "SIZE"))
                    .color(extractAttributeValue(variant, "COLOR"))
                    .material(extractAttributeValue(variant, "MATERIAL"))
                    .imageUrl(resolveImageUrl(variant))
                    .quantity(item.getQuantity())
                    .originalPrice(originalPrice)
                    .unitPrice(unitPrice)
                    .discountPercent(defaultZero(price.getDiscountPercent()))
                    .promotionId(price.getPromotionId())
                    .lineTotal(lineTotal)
                    .build());
        }

        BigDecimal voucherDiscountAmount = BigDecimal.ZERO;
        String appliedVoucherCode = null;
        Boolean voucherValid = null;
        String voucherMessage = null;
        if (StringUtils.hasText(voucherCode)) {
            try {
                ValidateDiscountResponse discountResponse = discountService.validateDiscountForSubtotal(
                        voucherCode,
                        subtotalBeforeVoucher,
                        userDetails
                );
                voucherDiscountAmount = defaultZero(discountResponse.getDiscountAmount());
                appliedVoucherCode = discountResponse.getCode();
                voucherValid = true;
                voucherMessage = discountResponse.getMessage();
            } catch (InvalidRequestException | IllegalArgumentException ex) {
                voucherDiscountAmount = BigDecimal.ZERO;
                appliedVoucherCode = null;
                voucherValid = false;
                voucherMessage = ex.getMessage();
            } catch (RuntimeException ex) {
                voucherDiscountAmount = BigDecimal.ZERO;
                appliedVoucherCode = null;
                voucherValid = false;
                voucherMessage = "Không thể kiểm tra mã giảm giá. Vui lòng thử lại.";
            }
        }

        BigDecimal shippingFee = calculateShippingFee(shippingInfo, subtotalBeforeVoucher, items);
        BigDecimal productRevenue = subtotalBeforeVoucher.subtract(voucherDiscountAmount).max(BigDecimal.ZERO);
        BigDecimal finalTotal = productRevenue.add(shippingFee);

        return CheckoutQuoteResponse.builder()
                .items(quoteItems)
                .originalSubtotal(originalSubtotal)
                .productDiscountTotal(productDiscountTotal)
                .subtotalBeforeVoucher(subtotalBeforeVoucher)
                .voucherDiscountAmount(voucherDiscountAmount)
                .shippingFee(shippingFee)
                .productRevenue(productRevenue)
                .finalTotal(finalTotal)
                .voucherCode(appliedVoucherCode)
                .voucherValid(voucherValid)
                .voucherMessage(voucherMessage)
                .build();
    }

    private Map<Long, ProductVariant> resolveVariants(
            List<OrderItemRequest> items,
            Map<Long, ProductVariant> variantOverrides
    ) {
        if (variantOverrides != null && !variantOverrides.isEmpty()) {
            return variantOverrides;
        }

        List<Long> variantIds = items.stream()
                .map(OrderItemRequest::getVariantId)
                .distinct()
                .toList();

        Map<Long, ProductVariant> variantMap = productVariantRepository.findAllById(variantIds)
                .stream()
                .collect(Collectors.toMap(ProductVariant::getId, variant -> variant));

        for (Long variantId : variantIds) {
            if (!variantMap.containsKey(variantId)) {
                throw new ResourceNotFoundException("Không tìm thấy biến thể sản phẩm với ID: " + variantId);
            }
        }

        return variantMap;
    }

    private BigDecimal calculateShippingFee(
            ShippingInfoRequest shippingInfo,
            BigDecimal subtotalBeforeVoucher,
            List<OrderItemRequest> items
    ) {
        if (shippingInfo == null
                || shippingInfo.getDistrictId() == null
                || !StringUtils.hasText(shippingInfo.getWardCode())) {
            return BigDecimal.ZERO;
        }

        return ghnShippingService.calculateShippingFee(
                shippingInfo.getDistrictId(),
                shippingInfo.getWardCode(),
                subtotalBeforeVoucher,
                items
        );
    }

    private void validateVariantCanBeQuoted(ProductVariant variant) {
        if (variant == null) {
            throw new InvalidRequestException("Sản phẩm không còn khả dụng.");
        }

        if (!Boolean.TRUE.equals(variant.getIsActive()) || variant.getDeletedAt() != null) {
            throw new InvalidRequestException("Biến thể sản phẩm đã ngừng bán: " + variant.getCode());
        }

        if (variant.getProduct() == null
                || !Boolean.TRUE.equals(variant.getProduct().getIsActive())
                || variant.getProduct().getDeletedAt() != null) {
            throw new InvalidRequestException("Sản phẩm đã ngừng bán: " + variant.getCode());
        }
    }

    private String extractAttributeValue(ProductVariant variant, String attributeCode) {
        if (variant == null || variant.getVariantAttributeValues() == null) {
            return null;
        }

        return variant.getVariantAttributeValues().stream()
                .map(VariantAttributeValue::getAttributeValue)
                .filter(attributeValue -> attributeValue != null
                        && attributeValue.getAttribute() != null
                        && attributeValue.getAttribute().getCode() != null
                        && attributeCode.equalsIgnoreCase(attributeValue.getAttribute().getCode()))
                .map(AttributeValue::getValue)
                .findFirst()
                .orElse(null);
    }

    private String resolveImageUrl(ProductVariant variant) {
        if (variant == null) {
            return null;
        }

        if (variant.getImages() != null && !variant.getImages().isEmpty()) {
            return variant.getImages().stream()
                    .filter(productImage -> Boolean.TRUE.equals(productImage.getIsPrimary()))
                    .findFirst()
                    .or(() -> variant.getImages().stream().findFirst())
                    .map(ProductImage::getImageUrl)
                    .orElse(null);
        }

        if (variant.getProduct() != null && variant.getProduct().getImages() != null) {
            return variant.getProduct().getImages().stream()
                    .filter(productImage -> Boolean.TRUE.equals(productImage.getIsPrimary()))
                    .findFirst()
                    .or(() -> variant.getProduct().getImages().stream().findFirst())
                    .map(ProductImage::getImageUrl)
                    .orElse(null);
        }

        return null;
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
