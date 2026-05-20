package com.vn.backend.service.impl;

import com.vn.backend.entity.InventoryTransaction;
import com.vn.backend.entity.Order;
import com.vn.backend.entity.OrderItem;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.InventoryTransactionRepository;
import com.vn.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class OrderInventoryService {

    private static final String INVENTORY_IN = "IN";
    private static final String INVENTORY_OUT = "OUT";

    private final ProductVariantRepository productVariantRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @Transactional
    public void reserveStockForOnlineOrder(Order order) {
        if (order == null || Boolean.TRUE.equals(order.getInventoryReserved())) {
            return;
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new InvalidRequestException("Đơn hàng phải có ít nhất một sản phẩm");
        }

        for (OrderItem item : order.getItems()) {
            ProductVariant itemVariant = item.getProductVariant();
            if (itemVariant == null || itemVariant.getId() == null) {
                throw new InvalidRequestException("Thiếu biến thể sản phẩm trong đơn hàng");
            }

            ProductVariant variant = productVariantRepository.findByIdForUpdate(itemVariant.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biến thể sản phẩm"));

            validateVariantCanBeReserved(variant);

            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();

            if (quantity <= 0) {
                throw new InvalidRequestException("Số lượng sản phẩm phải lớn hơn 0");
            }

            if (currentStock < quantity) {
                String productName = variant.getProduct() != null ? variant.getProduct().getName() : "";
                throw new InvalidRequestException(
                        "Sản phẩm "
                                + productName
                                + " - "
                                + variant.getCode()
                                + " không đủ tồn kho."
                );
            }

            variant.setStockQuantity(currentStock - quantity);
            productVariantRepository.save(variant);
            createInventoryTransaction(order, variant, quantity, INVENTORY_OUT, "ONLINE_ORDER_RESERVED");
        }

        order.setInventoryReserved(true);
        order.setInventoryReservedAt(OffsetDateTime.now());
        order.setInventoryReleased(false);
        order.setInventoryReleasedAt(null);
    }

    @Transactional
    public void releaseStockForOrder(Order order, String reason) {
        if (order == null
                || !Boolean.TRUE.equals(order.getInventoryReserved())
                || Boolean.TRUE.equals(order.getInventoryReleased())) {
            return;
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }

        for (OrderItem item : order.getItems()) {
            ProductVariant itemVariant = item.getProductVariant();
            if (itemVariant == null || itemVariant.getId() == null) {
                continue;
            }

            ProductVariant variant = productVariantRepository.findByIdForUpdate(itemVariant.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biến thể sản phẩm"));

            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            if (quantity <= 0) {
                continue;
            }

            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            variant.setStockQuantity(currentStock + quantity);
            productVariantRepository.save(variant);
            createInventoryTransaction(order, variant, quantity, INVENTORY_IN, reason);
        }

        order.setInventoryReleased(true);
        order.setInventoryReleasedAt(OffsetDateTime.now());
    }

    /**
     * Tru ton kho khi admin xac nhan don COD.
     * Idempotent: inventoryReserved=true → bo qua ngay, khong tru lan 2.
     * Lock PESSIMISTIC_WRITE tung variant, check stockQuantity truoc khi tru.
     * Throw InvalidRequestException neu khong du hang — khong doi trang thai don.
     */
    @Transactional
    public void deductStockForCodConfirm(Order order) {
        if (order == null || Boolean.TRUE.equals(order.getInventoryReserved())) {
            return;
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new InvalidRequestException("Đơn hàng phải có ít nhất một sản phẩm");
        }

        OffsetDateTime now = OffsetDateTime.now();

        for (OrderItem item : order.getItems()) {
            ProductVariant itemVariant = item.getProductVariant();
            if (itemVariant == null || itemVariant.getId() == null) {
                throw new InvalidRequestException("Thiếu biến thể sản phẩm trong đơn hàng");
            }

            ProductVariant variant = productVariantRepository.findByIdForUpdate(itemVariant.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biến thể sản phẩm"));

            validateVariantCanBeReserved(variant);

            int quantity     = item.getQuantity() == null ? 0 : item.getQuantity();
            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();

            if (quantity <= 0) {
                throw new InvalidRequestException("Số lượng sản phẩm phải lớn hơn 0");
            }

            if (currentStock < quantity) {
                String productName = variant.getProduct() != null ? variant.getProduct().getName() : "";
                throw new InvalidRequestException(
                        "Sản phẩm " + productName + " - " + variant.getCode()
                        + " không đủ tồn kho. Cần: " + quantity + ", còn: " + currentStock);
            }

            variant.setStockQuantity(currentStock - quantity);
            productVariantRepository.save(variant);
            createInventoryTransaction(order, variant, quantity, INVENTORY_OUT, "COD_ADMIN_CONFIRMED");
        }

        order.setInventoryReserved(true);
        order.setInventoryReservedAt(now);
        order.setInventoryReleased(false);
        order.setInventoryReleasedAt(null);
    }

    private void validateVariantCanBeReserved(ProductVariant variant) {
        if (variant == null) {
            throw new InvalidRequestException("Sản phẩm không còn khả dụng");
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

    private void createInventoryTransaction(
            Order order,
            ProductVariant variant,
            int quantity,
            String transactionType,
            String reason
    ) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setProductVariant(variant);
        transaction.setStore(order.getStore());
        transaction.setQuantity(quantity);
        transaction.setTransactionType(transactionType);
        transaction.setReason(reason);
        transaction.setReferenceCode(reason + "-" + order.getId() + "-" + variant.getId());
        transaction.setCreatedAt(LocalDateTime.now());

        inventoryTransactionRepository.save(transaction);
    }
}
