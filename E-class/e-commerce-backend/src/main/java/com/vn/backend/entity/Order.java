package com.vn.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @ToString.Exclude
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    @ToString.Exclude
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    @ToString.Exclude
    private Store store;

    @Builder.Default
    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "original_subtotal", precision = 15, scale = 2)
    private BigDecimal originalSubtotal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "product_discount_total", precision = 15, scale = 2)
    private BigDecimal productDiscountTotal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "subtotal_before_voucher", precision = 15, scale = 2)
    private BigDecimal subtotalBeforeVoucher = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "discount_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "product_revenue", precision = 15, scale = 2)
    private BigDecimal productRevenue = BigDecimal.ZERO;

    @Column(name = "shipping_fee", precision = 15, scale = 2, nullable = false)
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(name = "voucher_code", length = 50)
    private String voucherCode;

    @Builder.Default
    @Column(name = "customer_paid", precision = 15, scale = 2)
    private BigDecimal customerPaid = BigDecimal.ZERO;

    @Column(name = "order_type", length = 20)
    private String orderType;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Builder.Default
    @Column(name = "inventory_reserved")
    private Boolean inventoryReserved = false;

    @Column(name = "inventory_reserved_at")
    private OffsetDateTime inventoryReservedAt;

    @Builder.Default
    @Column(name = "inventory_released")
    private Boolean inventoryReleased = false;

    @Column(name = "inventory_released_at")
    private OffsetDateTime inventoryReleasedAt;

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private OrderShippingDetails shippingDetails;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.totalAmount == null) {
            this.totalAmount = BigDecimal.ZERO;
        }
        if (this.discountAmount == null) {
            this.discountAmount = BigDecimal.ZERO;
        }
        if (this.productRevenue == null) {
            this.productRevenue = BigDecimal.ZERO;
        }
        if (this.originalSubtotal == null) {
            this.originalSubtotal = BigDecimal.ZERO;
        }
        if (this.productDiscountTotal == null) {
            this.productDiscountTotal = BigDecimal.ZERO;
        }
        if (this.subtotalBeforeVoucher == null) {
            this.subtotalBeforeVoucher = BigDecimal.ZERO;
        }
        if (this.shippingFee == null) {
            this.shippingFee = BigDecimal.ZERO;
        }
        if (this.customerPaid == null) {
            this.customerPaid = BigDecimal.ZERO;
        }
        if (this.inventoryReserved == null) {
            this.inventoryReserved = false;
        }
        if (this.inventoryReleased == null) {
            this.inventoryReleased = false;
        }
    }
}
