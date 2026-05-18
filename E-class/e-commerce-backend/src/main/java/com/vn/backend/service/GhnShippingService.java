package com.vn.backend.service;

import com.vn.backend.dto.request.OrderItemRequest;

import java.math.BigDecimal;
import java.util.List;

public interface GhnShippingService {
    BigDecimal calculateShippingFee(
            Integer toDistrictId,
            String toWardCode,
            BigDecimal insuranceValue,
            List<OrderItemRequest> items
    );
}
