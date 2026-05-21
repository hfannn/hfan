package com.vn.backend.service;

import com.vn.backend.dto.request.CheckoutQuoteRequest;
import com.vn.backend.dto.request.CheckoutValidationRequest;
import com.vn.backend.dto.request.OrderItemRequest;
import com.vn.backend.dto.request.ShippingInfoRequest;
import com.vn.backend.dto.response.CheckoutQuoteResponse;
import com.vn.backend.dto.response.CheckoutValidationResponse;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.security.CustomUserDetails;

import java.util.List;
import java.util.Map;

public interface CheckoutQuoteService {
    CheckoutQuoteResponse quote(CheckoutQuoteRequest request, CustomUserDetails userDetails);

    CheckoutQuoteResponse calculate(
            List<OrderItemRequest> items,
            String voucherCode,
            ShippingInfoRequest shippingInfo,
            CustomUserDetails userDetails,
            Map<Long, ProductVariant> variantOverrides
    );

    CheckoutValidationResponse validateCheckout(CheckoutValidationRequest request, CustomUserDetails userDetails);
}
