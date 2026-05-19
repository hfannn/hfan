package com.vn.backend.service.impl;

import com.vn.backend.dto.ghtk.GhtkFeeRequest;
import com.vn.backend.service.GhtkService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
@RequiredArgsConstructor
public class GHTKLogicHandler {

    private final GhtkService ghtkService;

    public BigDecimal calculateShippingFee(String province, String district, String address, BigDecimal subTotal, List<Integer> itemQuantities) {
        Integer totalWeight = itemQuantities.stream().mapToInt(quantity -> 500 * quantity).sum();

        GhtkFeeRequest ghtkFeeRequest = GhtkFeeRequest.builder()
                .province(province)
                .district(district)
                .weight(totalWeight > 0 ? totalWeight : 100)
                .value(subTotal)
                .transport("road")
                .build();

        return ghtkService.calculateShippingFee(ghtkFeeRequest)
                .divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP);
    }

}
