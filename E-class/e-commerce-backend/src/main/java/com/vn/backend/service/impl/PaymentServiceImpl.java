package com.vn.backend.service.impl;

import com.vn.backend.dto.request.PaymentRequest;
import com.vn.backend.dto.response.PaymentResponse;
import com.vn.backend.entity.Order;
import com.vn.backend.entity.Payment;
import com.vn.backend.entity.PaymentMethod;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.OrderRepository;
import com.vn.backend.repository.PaymentMethodRepository;
import com.vn.backend.repository.PaymentRepository;
import com.vn.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final PaymentMethodRepository paymentMethodRepository;

    @Override
    public Page<PaymentResponse> getAll(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public PaymentResponse getById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán với ID: " + id));
        return mapToResponse(payment);
    }

    @Override
    @Transactional
    public PaymentResponse create(PaymentRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + request.getOrderId()));
        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.getPaymentMethodId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phương thức thanh toán với ID: " + request.getPaymentMethodId()));

        Payment payment = Payment.builder()
                .order(order)
                .paymentMethod(paymentMethod)
                .amount(request.getAmount())
                .status(request.getStatus())
                .build();

        Payment saved = paymentRepository.save(payment);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public PaymentResponse update(Long id, PaymentRequest request) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán với ID: " + id));

        payment.setAmount(request.getAmount());
        payment.setStatus(request.getStatus());

        Payment updated = paymentRepository.save(payment);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        paymentRepository.deleteById(id);
    }

    private PaymentResponse mapToResponse(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setOrderId(payment.getOrder().getId());
        response.setPaymentMethodName(payment.getPaymentMethod().getName());
        response.setAmount(payment.getAmount());
        response.setStatus(payment.getStatus());
        if (payment.getCreatedAt() != null) {
            response.setCreatedAt(payment.getCreatedAt().toLocalDateTime());
        }
        return response;
    }
}
