package com.vn.backend.service.impl;

import com.vn.backend.entity.Order;
import com.vn.backend.entity.OrderStatusHistory;
import com.vn.backend.entity.Payment;
import com.vn.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OnlineOrderExpirationScheduler {

    private static final String ORDER_TYPE_ONLINE = "ONLINE";
    private static final String ORDER_STATUS_PENDING = "PENDING";
    private static final String ORDER_STATUS_CANCELLED = "CANCELLED";

    private static final String PAYMENT_STATUS_PENDING = "PENDING";
    private static final String PAYMENT_STATUS_EXPIRED = "EXPIRED";
    private static final String PAYMENT_CODE_VNPAY = "VNPAY";

    private static final long EXPIRE_MINUTES = 5;

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final OrderInventoryService orderInventoryService;

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void autoCancelExpiredOnlineOrders() {
        OffsetDateTime expiredBefore = OffsetDateTime.now().minusMinutes(EXPIRE_MINUTES);

        List<Order> expiredOrders = orderRepository.findByOrderTypeAndStatusAndCreatedAtBefore(
                ORDER_TYPE_ONLINE,
                ORDER_STATUS_PENDING,
                expiredBefore
        );

        for (Order order : expiredOrders) {
            Payment latestPayment = paymentRepository.findByOrder_Id(order.getId())
                    .stream()
                    .max(Comparator.comparing(Payment::getId))
                    .orElse(null);

            if (latestPayment == null) {
                continue;
            }

            if (latestPayment.getPaymentMethod() == null
                    || latestPayment.getPaymentMethod().getCode() == null
                    || !PAYMENT_CODE_VNPAY.equalsIgnoreCase(latestPayment.getPaymentMethod().getCode())) {
                continue;
            }

            if (!PAYMENT_STATUS_PENDING.equalsIgnoreCase(latestPayment.getStatus())) {
                continue;
            }

            latestPayment.setStatus(PAYMENT_STATUS_EXPIRED);
            latestPayment.setNote("Hết thời gian thanh toán VNPAY sau " + EXPIRE_MINUTES + " phút");
            paymentRepository.save(latestPayment);

            orderInventoryService.releaseStockForOrder(order, "ONLINE_VNPAY_EXPIRED");

            String previousStatus = order.getStatus();
            order.setStatus(ORDER_STATUS_CANCELLED);
            orderRepository.save(order);

            couponUsageRepository.deleteByOrder_Id(order.getId());

            OrderStatusHistory history = OrderStatusHistory.builder()
                    .order(order)
                    .fromStatus(previousStatus)
                    .toStatus(ORDER_STATUS_CANCELLED)
                    .changedAt(OffsetDateTime.now())
                    .build();

            orderStatusHistoryRepository.save(history);
        }
    }
}
