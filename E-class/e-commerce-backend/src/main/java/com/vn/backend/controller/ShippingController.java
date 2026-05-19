package com.vn.backend.controller;

import com.vn.backend.dto.request.OrderItemRequest;
import com.vn.backend.dto.request.ShippingEstimateRequest;
import com.vn.backend.dto.response.ShippingEstimateResponse;
import com.vn.backend.dto.response.ProductPriceResponse;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.service.GhnShippingService;
import com.vn.backend.service.ProductPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/shipping")
@RequiredArgsConstructor
public class ShippingController {

    private final GhnShippingService ghnShippingService;
    private final ProductVariantRepository productVariantRepository;
    private final ProductPriceService productPriceService;

    @PostMapping("/estimate")
    public ResponseEntity<ShippingEstimateResponse> estimateShippingFee(@RequestBody ShippingEstimateRequest request) {
        BigDecimal subTotal = request.getItems().stream()
                .map(item -> {
                    ProductVariant variant = productVariantRepository.findById(item.getVariantId())
                            .orElseThrow(() -> new RuntimeException("Variant not found"));
                    ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
                    return price.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<OrderItemRequest> items = request.getItems().stream()
                .map(item -> {
                    OrderItemRequest orderItem = new OrderItemRequest();
                    orderItem.setVariantId(item.getVariantId());
                    orderItem.setQuantity(item.getQuantity());
                    return orderItem;
                })
                .toList();

        BigDecimal shippingFee = ghnShippingService.calculateShippingFee(
                request.getShippingInfo().getDistrictId(),
                request.getShippingInfo().getWardCode(),
                subTotal,
                items
        );

        ShippingEstimateResponse response = new ShippingEstimateResponse();
        response.setShippingFee(shippingFee);

        return ResponseEntity.ok(response);
    }
}
