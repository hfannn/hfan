package com.vn.backend.service;

import com.vn.backend.dto.request.pos.*;
import com.vn.backend.dto.response.pos.PosCheckoutValidationResponse;
import com.vn.backend.dto.response.pos.PosOrderResponse;
import com.vn.backend.dto.response.pos.PosProductSearchResponse;
import com.vn.backend.dto.response.pos.PosAvailableDiscountResponse;

import java.util.List;

public interface PosService {

    PosOrderResponse createOrder(PosCreateOrderRequest request) throws Exception;

    List<PosOrderResponse> getDraftOrders();

    PosOrderResponse getOrderDetail(Long orderId);

    List<PosProductSearchResponse> searchProducts(String keyword);

   // PosProductSearchResponse getProductByBarcode(String barcode);

    PosOrderResponse addItem(Long orderId, PosAddItemRequest request);

    PosOrderResponse updateItem(Long orderId, Long itemId, PosUpdateItemRequest request);

    PosOrderResponse removeItem(Long orderId, Long itemId);

    PosOrderResponse assignCustomer(Long orderId, PosAssignCustomerRequest request);

    PosOrderResponse checkout(Long orderId, PosCheckoutRequest request);

    void cancelOrder(Long orderId);

    List<PosAvailableDiscountResponse> getAvailableDiscounts(Long orderId);

    PosOrderResponse quickCreateCustomerAndAssign(Long orderId, PosQuickCreateCustomerRequest request);

    PosCheckoutValidationResponse validateCheckout(Long orderId, Long couponId);

}