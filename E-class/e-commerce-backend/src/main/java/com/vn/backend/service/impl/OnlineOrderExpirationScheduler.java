package com.vn.backend.service.impl;

import com.vn.backend.entity.Order;
import com.vn.backend.entity.OrderStatusHistory;
import com.vn.backend.entity.Payment;
import com.vn.backend.entity.StockReservation;
import com.vn.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OnlineOrderExpirationScheduler {

    private static final String ORDER_STATUS_PENDING   = "PENDING";
    private static final String ORDER_STATUS_CANCELLED = "CANCELLED";

    private static final String PAYMENT_STATUS_PENDING = "PENDING";
    private static final String PAYMENT_STATUS_EXPIRED = "EXPIRED";

    private static final String RESERVATION_RESERVED = "RESERVED";
    private static final String RESERVATION_EXPIRED  = "EXPIRED";

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final StockReservationRepository stockReservationRepository;

    /**
     * Chay moi 30 giay.
     * Tim cac reservation RESERVED da het han (expiresAt < now).
     * Expire chung va cancel order/payment tuong ung neu con PENDING.
     * Khong cong lai stockQuantity vi VNPay dung soft reservation (khong tru that).
     */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void expireStaleReservations() {
        OffsetDateTime now = OffsetDateTime.now();

        List<StockReservation> expiredList = stockReservationRepository.findExpiredReservations(now);
        if (expiredList.isEmpty()) {
            return;
        }

        // Group theo orderId — xu ly tung don mot lan
        Map<Long, List<StockReservation>> byOrder = expiredList.stream()
                .collect(Collectors.groupingBy(StockReservation::getOrderId));

        for (Map.Entry<Long, List<StockReservation>> entry : byOrder.entrySet()) {
            Long orderId = entry.getKey();

            // Expire tat ca reservation cua don nay
            for (StockReservation reservation : entry.getValue()) {
                if (RESERVATION_RESERVED.equals(reservation.getStatus())) {
                    reservation.setStatus(RESERVATION_EXPIRED);
                    reservation.setReleasedAt(now);
                    reservation.setReleaseReason("TIMEOUT");
                    stockReservationRepository.save(reservation);
                }
            }

            // Cap nhat payment va order neu van con PENDING
            orderRepository.findById(orderId).ifPresent(order -> {
                Payment latestPayment = paymentRepository.findByOrder_Id(orderId)
                        .stream()
                        .max(Comparator.comparing(Payment::getId))
                        .orElse(null);

                if (latestPayment != null
                        && PAYMENT_STATUS_PENDING.equalsIgnoreCase(latestPayment.getStatus())) {
                    latestPayment.setStatus(PAYMENT_STATUS_EXPIRED);
                    latestPayment.setNote("Het thoi gian thanh toan VNPay (15 phut)");
                    paymentRepository.save(latestPayment);
                }

                if (ORDER_STATUS_PENDING.equalsIgnoreCase(order.getStatus())) {
                    String previousStatus = order.getStatus();
                    order.setStatus(ORDER_STATUS_CANCELLED);
                    orderRepository.save(order);

                    couponUsageRepository.deleteByOrder_Id(orderId);

                    orderStatusHistoryRepository.save(OrderStatusHistory.builder()
                            .order(order)
                            .fromStatus(previousStatus)
                            .toStatus(ORDER_STATUS_CANCELLED)
                            .changedAt(now)
                            .build());
                }
            });
        }
    }
}
