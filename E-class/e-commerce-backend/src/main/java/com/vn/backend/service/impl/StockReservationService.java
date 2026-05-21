package com.vn.backend.service.impl;

import com.vn.backend.entity.Order;
import com.vn.backend.entity.OrderItem;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.StockReservation;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.StockReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockReservationService {

    static final String STATUS_RESERVED  = "RESERVED";
    static final String STATUS_CONFIRMED = "CONFIRMED";
    static final String STATUS_RELEASED  = "RELEASED";
    static final String STATUS_EXPIRED   = "EXPIRED";

    private final StockReservationRepository reservationRepository;
    private final ProductVariantRepository   productVariantRepository;

    /**
     * Tao reservation mem (soft) cho don VNPay - khong tru stockQuantity that.
     * availableStock = stockQuantity - activeReservations tu cac don khac.
     * Throw InvalidRequestException neu khong du available.
     */
    @Transactional
    public void createReservationsForVnpay(Order order, int durationMinutes) {
        OffsetDateTime now       = OffsetDateTime.now();
        OffsetDateTime expiresAt = now.plusMinutes(durationMinutes);

        for (OrderItem item : order.getItems()) {
            Long variantId = item.getProductVariant().getId();

            ProductVariant variant = productVariantRepository.findByIdForUpdate(variantId)
                    .orElseThrow(() -> new InvalidRequestException(
                            "Khong tim thay bien the san pham: " + variantId));

            int stockQty      = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            int activeReserved = reservationRepository.sumActiveReservedQuantity(variantId, now);
            int available      = stockQty - activeReserved;

            if (available < item.getQuantity()) {
                String productName = variant.getProduct() != null ? variant.getProduct().getName() : "";
                throw new InvalidRequestException(
                        "San pham " + productName + " - " + variant.getCode()
                        + " khong du ton kho kha dung. Can: " + item.getQuantity()
                        + ", con kha dung: " + available);
            }

            reservationRepository.save(StockReservation.builder()
                    .orderId(order.getId())
                    .productVariantId(variantId)
                    .quantity(item.getQuantity())
                    .status(STATUS_RESERVED)
                    .expiresAt(expiresAt)
                    .build());
        }
    }

    /**
     * Xac nhan reservation va tru stockQuantity that khi VNPay thanh cong.
     * Idempotent: neu da CONFIRMED hoac khong co RESERVED → return false (da xu ly roi).
     * Return false neu reservation da het han → goi expireOrderReservations de don dep.
     */
    @Transactional
    public boolean confirmAndDeductStock(Long orderId) {
        List<StockReservation> reservations = reservationRepository.findByOrderIdForUpdate(orderId);
        OffsetDateTime now = OffsetDateTime.now();

        List<StockReservation> activeList = reservations.stream()
                .filter(r -> STATUS_RESERVED.equals(r.getStatus()))
                .toList();

        if (activeList.isEmpty()) {
            return false;
        }

        boolean anyExpired = activeList.stream()
                .anyMatch(r -> r.getExpiresAt() != null && r.getExpiresAt().isBefore(now));

        if (anyExpired) {
            expireOrderReservations(orderId, now);
            return false;
        }

        for (StockReservation reservation : activeList) {
            ProductVariant variant = productVariantRepository.findByIdForUpdate(reservation.getProductVariantId())
                    .orElseThrow(() -> new InvalidRequestException(
                            "Khong tim thay bien the san pham: " + reservation.getProductVariantId()));

            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            if (currentStock < reservation.getQuantity()) {
                throw new InvalidRequestException(
                        "Ton kho khong du de confirm don VNPay, variant: " + reservation.getProductVariantId());
            }

            variant.setStockQuantity(currentStock - reservation.getQuantity());
            productVariantRepository.save(variant);

            reservation.setStatus(STATUS_CONFIRMED);
            reservation.setConfirmedAt(now);
            reservationRepository.save(reservation);
        }

        return true;
    }

    /**
     * Release reservation khi VNPay fail/cancel hoac admin/customer huy don.
     * Khong tru stockQuantity (vi chua tru that).
     */
    @Transactional
    public void releaseReservations(Long orderId, String reason) {
        List<StockReservation> reservations = reservationRepository.findByOrderIdForUpdate(orderId);
        OffsetDateTime now = OffsetDateTime.now();

        for (StockReservation reservation : reservations) {
            if (STATUS_RESERVED.equals(reservation.getStatus())) {
                reservation.setStatus(STATUS_RELEASED);
                reservation.setReleasedAt(now);
                reservation.setReleaseReason(reason);
                reservationRepository.save(reservation);
            }
        }
    }

    /**
     * Expire reservation het han - goi boi scheduler.
     * Khong tru stockQuantity (vi chua tru that).
     */
    @Transactional
    public void expireOrderReservations(Long orderId, OffsetDateTime now) {
        List<StockReservation> reservations = reservationRepository.findByOrderIdForUpdate(orderId);

        for (StockReservation reservation : reservations) {
            if (STATUS_RESERVED.equals(reservation.getStatus())) {
                reservation.setStatus(STATUS_EXPIRED);
                reservation.setReleasedAt(now);
                reservation.setReleaseReason("TIMEOUT");
                reservationRepository.save(reservation);
            }
        }
    }

    /**
     * availableStock = stockQuantity - SUM(RESERVED.quantity where expiresAt > now)
     */
    public int getAvailableStock(Long variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId).orElse(null);
        if (variant == null) return 0;
        return computeAvailable(variant);
    }

    public int getAvailableStock(ProductVariant variant) {
        if (variant == null) return 0;
        return computeAvailable(variant);
    }

    /**
     * Chi lay phan active reserved (dung cho POS check)
     */
    public int getActiveReservedQuantity(Long variantId) {
        return reservationRepository.sumActiveReservedQuantity(variantId, OffsetDateTime.now());
    }

    // ──────────────────── private ────────────────────

    private int computeAvailable(ProductVariant variant) {
        int stockQty      = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
        int activeReserved = reservationRepository.sumActiveReservedQuantity(
                variant.getId(), OffsetDateTime.now());
        return Math.max(0, stockQty - activeReserved);
    }
}
