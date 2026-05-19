package com.vn.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrderResponse {
    private Long id;
    private String code;
    private BigDecimal discountAmount;
    private BigDecimal discountPercent;
    private String voucherCode;
    private BigDecimal subtotalAmount;
    private BigDecimal originalSubtotal;
    private BigDecimal productDiscountTotal;
    private BigDecimal subtotalBeforeVoucher;
    private BigDecimal voucherDiscountAmount;
    private BigDecimal productRevenue;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private BigDecimal finalTotal;
    private String status;
    private OffsetDateTime createdAt;
    private CustomerResponse customer;
    private List<OrderItemResponse> items;
    private String customerName;
    private String phone;
    private String address;
    private String province;
    private String district;
    private String ward;
    private String fullAddress;
    private String orderType; 
    private Long employeeId; 
    private String employeeName;

    private String paymentStatus;
    private String paymentMethodCode;
    private String paymentMethodName;
    private Boolean canRetryVnpay;
    private Boolean inventoryReserved;
    private OffsetDateTime inventoryReservedAt;
    private Boolean inventoryReleased;
    private OffsetDateTime inventoryReleasedAt;
}
