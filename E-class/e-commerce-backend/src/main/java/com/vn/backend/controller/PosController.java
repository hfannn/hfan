package com.vn.backend.controller;
import com.vn.backend.dto.request.pos.PosAddItemRequest;
import com.vn.backend.dto.request.pos.PosAssignCustomerRequest;
import com.vn.backend.dto.request.pos.PosCheckoutRequest;
import com.vn.backend.dto.request.pos.PosCreateOrderRequest;
import com.vn.backend.dto.request.pos.PosUpdateItemRequest;
import com.vn.backend.dto.response.pos.*;
import com.vn.backend.service.PosService;
import com.vn.backend.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

import com.vn.backend.dto.request.pos.PosQuickCreateCustomerRequest;
@RestController @RequestMapping("/v1/pos")
@RequiredArgsConstructor @CrossOrigin(origins = "http://localhost:5173")
public class PosController {
    private final PosService posService;
    private final VnpayService vnpayService;

    @PostMapping("/orders")
    public ResponseEntity<PosOrderResponse> createOrder( @Valid @RequestBody PosCreateOrderRequest request ) throws Exception {
        return ResponseEntity.ok(posService.createOrder(request));
    }
    @GetMapping("/orders/drafts")
    public ResponseEntity<List<PosOrderResponse>> getDraftOrders() {
        return ResponseEntity.ok(posService.getDraftOrders());
    }
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<PosOrderResponse> getOrderDetail( @PathVariable Long orderId ) {
        return ResponseEntity.ok(posService.getOrderDetail(orderId));
    }
    @GetMapping("/products/search")
    public ResponseEntity<List<PosProductSearchResponse>> searchProducts( @RequestParam(defaultValue = "") String keyword ) {
        return ResponseEntity.ok(posService.searchProducts(keyword));
    }
    @PostMapping("/orders/{orderId}/items")
    public ResponseEntity<PosOrderResponse> addItem( @PathVariable Long orderId, @Valid @RequestBody PosAddItemRequest request ) {
        return ResponseEntity.ok(posService.addItem(orderId, request));
    }
    @PutMapping("/orders/{orderId}/items/{itemId}")
    public ResponseEntity<PosOrderResponse> updateItem( @PathVariable Long orderId, @PathVariable Long itemId, @Valid @RequestBody PosUpdateItemRequest request ) {
        return ResponseEntity.ok(posService.updateItem(orderId, itemId, request));
    }
    @DeleteMapping("/orders/{orderId}/items/{itemId}")
    public ResponseEntity<PosOrderResponse> removeItem( @PathVariable Long orderId, @PathVariable Long itemId ) {
        return ResponseEntity.ok(posService.removeItem(orderId, itemId));
    }
    @PutMapping("/orders/{orderId}/customer")
    public ResponseEntity<PosOrderResponse> assignCustomer( @PathVariable Long orderId, @RequestBody PosAssignCustomerRequest request ) {
        return ResponseEntity.ok(posService.assignCustomer(orderId, request));
    }
    @PostMapping("/orders/{orderId}/checkout")
    public ResponseEntity<PosOrderResponse> checkout( @PathVariable Long orderId, @Valid @RequestBody PosCheckoutRequest request ) {
        return ResponseEntity.ok(posService.checkout(orderId, request));
    }
    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<String> cancelOrder( @PathVariable Long orderId ) {
        posService.cancelOrder(orderId); return ResponseEntity.ok("Hủy hóa đơn thành công");
    }
    @GetMapping("/orders/{orderId}/discounts/available")
    public ResponseEntity<List<PosAvailableDiscountResponse>> getAvailableDiscounts( @PathVariable Long orderId ) {
        return ResponseEntity.ok(posService.getAvailableDiscounts(orderId)); }

    @PostMapping("/orders/{orderId}/customer/quick-create")
    public ResponseEntity<PosOrderResponse> quickCreateCustomerAndAssign(
            @PathVariable Long orderId,
            @Valid @RequestBody PosQuickCreateCustomerRequest request
    ) {
        return ResponseEntity.ok(posService.quickCreateCustomerAndAssign(orderId, request));
    }

    @PostMapping("/orders/{orderId}/validate-checkout")
    public ResponseEntity<PosCheckoutValidationResponse> validateCheckout(
            @PathVariable Long orderId,
            @RequestParam(required = false) Long couponId
    ) {
        return ResponseEntity.ok(posService.validateCheckout(orderId, couponId));
    }

    @PostMapping("/orders/{orderId}/checkout/vnpay")
    public ResponseEntity<PosVnpayCreateResponse> createVnpayPayment(
            @PathVariable Long orderId,
            @Valid @RequestBody PosCheckoutRequest checkoutRequest,
            HttpServletRequest request
    ) {
        return ResponseEntity.ok(vnpayService.createPaymentUrl(orderId, checkoutRequest, request));
    }

    @GetMapping("/vnpay/return")
    public ResponseEntity<PosVnpayReturnResponse> vnpayReturn(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok(vnpayService.handleReturn(params));
    }

    @GetMapping("/vnpay/ipn")
    public ResponseEntity<String> vnpayIpn(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok(vnpayService.handleIpn(params));
    }
}