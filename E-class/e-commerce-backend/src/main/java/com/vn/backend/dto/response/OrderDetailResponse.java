package com.vn.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderDetailResponse {
    private Long id;
    private String code;
    private OffsetDateTime createdAt;
    private String status;
    private String customerName;
    private String phone;
    private String address;
    private String province;
    private String district;
    private String ward;

    private String paymentMethodName;
    private String paymentStatus;
    private String paymentMethodCode;
    private BigDecimal subtotalAmount;
    private BigDecimal originalSubtotal;
    private BigDecimal productDiscountTotal;
    private BigDecimal subtotalBeforeVoucher;
    private BigDecimal voucherDiscountAmount;
    private BigDecimal productRevenue;
    private BigDecimal totalAmount;
    private BigDecimal finalTotal;
    private String voucherCode;
    private BigDecimal discountAmount;
    private BigDecimal discountPercent;
    private BigDecimal shippingFee;
    private String fullAddress;
    private String orderType; 
    private Long employeeId;
    private String employeeName; 
    private List<OrderItemResponse> items;
    private List<OrderStatusHistoryResponse> statusHistory;
}
