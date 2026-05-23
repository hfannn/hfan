package com.vn.backend.controller;

import com.vn.backend.dto.request.OrderReturnRequest;
import com.vn.backend.dto.request.OrderReturnReviewRequest;
import com.vn.backend.dto.request.PlaceOrderRequest;
import com.vn.backend.dto.response.OrderDetailResponse;
import com.vn.backend.dto.response.OrderResponse;
import com.vn.backend.dto.response.OrderShippingAddressResponse;
import com.vn.backend.dto.response.pos.PosVnpayCreateResponse;
import com.vn.backend.dto.response.pos.PosVnpayReturnResponse;
import com.vn.backend.security.CustomUserDetails;
import com.vn.backend.service.OrderService;
import com.vn.backend.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/orders")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final VnpayService vnpayService;

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(
            @Valid @RequestBody PlaceOrderRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.placeOrder(userDetails.getUserId(), request));
    }

    @PostMapping("/{orderId}/vnpay")
    public ResponseEntity<PosVnpayCreateResponse> createOnlineVnpayPayment(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest request
    ) {
        return ResponseEntity.ok(
                vnpayService.createOnlinePaymentUrl(orderId, userDetails.getUserId(), request)
        );
    }

    @GetMapping("/vnpay/return")
    public ResponseEntity<PosVnpayReturnResponse> onlineVnpayReturn(
            @RequestParam Map<String, String> params
    ) {
        return ResponseEntity.ok(vnpayService.handleOnlineReturn(params));
    }

    @GetMapping("/vnpay/ipn")
    public ResponseEntity<String> onlineVnpayIpn(
            @RequestParam Map<String, String> params
    ) {
        return ResponseEntity.ok(vnpayService.handleOnlineIpn(params));
    }

    @GetMapping("/my-orders")
    public ResponseEntity<Page<OrderResponse>> getMyOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable
    ) {
        return ResponseEntity.ok(orderService.getMyOrders(userDetails.getUserId(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDetailResponse> getOrderDetails(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(orderService.getOrderDetailsById(id, userDetails.getUserId()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping
    public ResponseEntity<Page<OrderResponse>> getAllOrders(Pageable pageable) {
        return ResponseEntity.ok(orderService.getAllOrders(pageable));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        orderService.cancelOrder(id, userDetails.getUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/return-request")
    public ResponseEntity<Void> requestReturn(
            @PathVariable Long id,
            @Valid @RequestBody OrderReturnRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        orderService.requestReturn(id, userDetails.getUserId(), request);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/return-review")
    public ResponseEntity<Void> reviewReturn(
            @PathVariable Long id,
            @Valid @RequestBody OrderReturnReviewRequest request
    ) {
        orderService.reviewReturn(id, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/shipping-addresses")
    public ResponseEntity<List<OrderShippingAddressResponse>> getUserShippingAddresses(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(orderService.getUserShippingAddresses(userDetails.getUserId()));
    }
}