package com.vn.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.vn.backend.dto.request.OrderItemRequest;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.service.GhnShippingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GhnShippingServiceImpl implements GhnShippingService {

    private final RestTemplate restTemplate;

    @Value("${ghn.base-url}")
    private String ghnBaseUrl;

    @Value("${ghn.token}")
    private String ghnToken;

    @Value("${ghn.shop-id}")
    private Integer shopId;

    @Value("${ghn.from-district-id}")
    private Integer fromDistrictId;

    @Value("${ghn.from-ward-code}")
    private String fromWardCode;

    @Value("${ghn.default-length:30}")
    private Integer defaultLength;

    @Value("${ghn.default-width:20}")
    private Integer defaultWidth;

    @Value("${ghn.default-height:12}")
    private Integer defaultHeight;

    @Value("${ghn.default-weight-per-shoe:500}")
    private Integer defaultWeightPerShoe;

    @Override
    public BigDecimal calculateShippingFee(
            Integer toDistrictId,
            String toWardCode,
            BigDecimal insuranceValue,
            List<OrderItemRequest> items
    ) {
        validateConfig();

        if (toDistrictId == null || !StringUtils.hasText(toWardCode)) {
            throw new InvalidRequestException("Vui lòng chọn đầy đủ quận/huyện và phường/xã để tính phí vận chuyển.");
        }

        int totalQuantity = items == null
                ? 0
                : items.stream()
                .map(OrderItemRequest::getQuantity)
                .filter(quantity -> quantity != null && quantity > 0)
                .mapToInt(Integer::intValue)
                .sum();

        int totalWeight = Math.max(totalQuantity * defaultWeightPerShoe, defaultWeightPerShoe);
        int height = Math.min(30, defaultHeight + Math.max(totalQuantity, 1) * 2);
        int serviceId = resolveServiceId(toDistrictId);

        Map<String, Object> body = new HashMap<>();
        body.put("from_district_id", fromDistrictId);
        body.put("from_ward_code", fromWardCode);
        body.put("service_id", serviceId);
        body.put("to_district_id", toDistrictId);
        body.put("to_ward_code", toWardCode);
        body.put("length", defaultLength);
        body.put("width", defaultWidth);
        body.put("height", height);
        body.put("weight", totalWeight);
        body.put("insurance_value", defaultZero(insuranceValue).intValue());
        body.put("coupon", null);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    ghnBaseUrl + "/v2/shipping-order/fee",
                    HttpMethod.POST,
                    new HttpEntity<>(body, buildHeaders(true)),
                    JsonNode.class
            );

            JsonNode totalNode = response.getBody() == null
                    ? null
                    : response.getBody().path("data").path("total");

            if (totalNode != null && totalNode.isNumber()) {
                return BigDecimal.valueOf(totalNode.asLong());
            }

            log.warn("GHN fee API returned unexpected body: {}", response.getBody());
            throw new InvalidRequestException("Không thể tính phí vận chuyển. Vui lòng kiểm tra lại địa chỉ giao hàng.");
        } catch (RestClientException ex) {
            log.error("GHN fee API error", ex);
            throw new InvalidRequestException("Không thể tính phí vận chuyển. Vui lòng kiểm tra lại địa chỉ giao hàng.");
        }
    }

    private int resolveServiceId(Integer toDistrictId) {
        Map<String, Object> body = new HashMap<>();
        body.put("shop_id", shopId);
        body.put("from_district", fromDistrictId);
        body.put("to_district", toDistrictId);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    ghnBaseUrl + "/v2/shipping-order/available-services",
                    HttpMethod.POST,
                    new HttpEntity<>(body, buildHeaders(false)),
                    JsonNode.class
            );

            JsonNode services = response.getBody() == null
                    ? null
                    : response.getBody().path("data");

            if (services != null && services.isArray() && !services.isEmpty()) {
                JsonNode serviceId = services.get(0).path("service_id");
                if (serviceId.isNumber()) {
                    return serviceId.asInt();
                }
            }

            log.warn("GHN available-services API returned unexpected body: {}", response.getBody());
            throw new InvalidRequestException("Không tìm thấy dịch vụ vận chuyển GHN phù hợp.");
        } catch (RestClientException ex) {
            log.error("GHN available-services API error", ex);
            throw new InvalidRequestException("Không thể tính phí vận chuyển. Vui lòng kiểm tra lại địa chỉ giao hàng.");
        }
    }

    private HttpHeaders buildHeaders(boolean includeShopId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        headers.set("Token", ghnToken);
        if (includeShopId) {
            headers.set("ShopId", String.valueOf(shopId));
        }
        return headers;
    }

    private void validateConfig() {
        if (!StringUtils.hasText(ghnBaseUrl)
                || !StringUtils.hasText(ghnToken)
                || shopId == null
                || fromDistrictId == null
                || !StringUtils.hasText(fromWardCode)) {
            throw new InvalidRequestException("Cấu hình GHN chưa đầy đủ.");
        }
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
