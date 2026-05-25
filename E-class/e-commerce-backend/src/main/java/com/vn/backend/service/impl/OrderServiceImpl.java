package com.vn.backend.service.impl;

import com.vn.backend.dto.request.OrderItemRequest;
import com.vn.backend.dto.request.OrderReturnRequest;
import com.vn.backend.dto.request.OrderReturnReviewRequest;
import com.vn.backend.dto.request.PlaceOrderRequest;
import com.vn.backend.dto.request.ValidateDiscountRequest;
import com.vn.backend.dto.response.CustomerResponse;
import com.vn.backend.dto.response.CheckoutQuoteItemResponse;
import com.vn.backend.dto.response.CheckoutQuoteResponse;
import com.vn.backend.dto.response.OrderDetailResponse;
import com.vn.backend.dto.response.OrderItemResponse;
import com.vn.backend.dto.response.OrderResponse;
import com.vn.backend.dto.response.OrderShippingAddressResponse;
import com.vn.backend.dto.response.OrderStatusHistoryResponse;
import com.vn.backend.dto.response.ProductPriceResponse;
import com.vn.backend.dto.response.UserProfileResponse;
import com.vn.backend.dto.response.ValidateDiscountResponse;
import com.vn.backend.entity.Coupon;
import com.vn.backend.entity.CouponUsage;
import com.vn.backend.entity.Customer;
import com.vn.backend.entity.Employee;
import com.vn.backend.entity.Order;
import com.vn.backend.entity.OrderItem;
import com.vn.backend.entity.OrderShippingDetails;
import com.vn.backend.entity.OrderStatusHistory;
import com.vn.backend.entity.Payment;
import com.vn.backend.entity.PaymentMethod;
import com.vn.backend.entity.ProductImage;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.User;
import com.vn.backend.entity.UserProfile;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.exception.VoucherChangedException;
import com.vn.backend.repository.CartItemRepository;
import com.vn.backend.repository.CouponUsageRepository;
import com.vn.backend.repository.CustomerRepository;
import com.vn.backend.repository.EmployeeRepository;
import com.vn.backend.repository.OrderItemRepository;
import com.vn.backend.repository.OrderRepository;
import com.vn.backend.repository.OrderStatusHistoryRepository;
import com.vn.backend.repository.PaymentMethodRepository;
import com.vn.backend.repository.PaymentRepository;
import com.vn.backend.repository.ProductImageRepository;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.ReviewRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.security.CustomUserDetails;
import com.vn.backend.service.CheckoutQuoteService;
import com.vn.backend.service.DiscountService;
import com.vn.backend.service.GhtkService;
import com.vn.backend.service.OrderService;
import com.vn.backend.service.ProductPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final CartItemRepository cartItemRepository;
    private final DiscountService discountService;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentRepository paymentRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final EmployeeRepository employeeRepository;
    private final GhtkService ghtkService;
    private final GHTKLogicHandler ghtkLogicHandler;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final ProductPriceService productPriceService;
    private final CheckoutQuoteService checkoutQuoteService;
    private final ReviewRepository reviewRepository;
    private final OrderInventoryService orderInventoryService;
    private final StockReservationService stockReservationService;

    private static final String ORDER_TYPE_ONLINE = "ONLINE";
    private static final String ORDER_TYPE_POS = "POS";

    private static final String ORDER_STATUS_PENDING = "PENDING";
    private static final String ORDER_STATUS_CONFIRMED = "CONFIRMED";
    private static final String ORDER_STATUS_SHIPPING = "SHIPPING";
    private static final String ORDER_STATUS_COMPLETED = "COMPLETED";
    private static final String ORDER_STATUS_CANCELLED = "CANCELLED";

    private static final String ORDER_STATUS_RETURN_REQUESTED = "RETURN_REQUESTED";
    private static final String ORDER_STATUS_RETURNED = "RETURNED";
    private static final String ORDER_STATUS_RETURN_REJECTED = "RETURN_REJECTED";

    private static final String PAYMENT_STATUS_PAID = "PAID";
    private static final String PAYMENT_STATUS_REFUND_PENDING = "REFUND_PENDING";
    private static final String VIETNAM_PHONE_REGEX = "^(0)(3|5|7|8|9)[0-9]{8}$";

    private static final int RETURN_WINDOW_DAYS = 7;

    @Override
    @Transactional
    public OrderResponse placeOrder(Long userId, PlaceOrderRequest request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new InvalidRequestException("Đơn hàng phải có ít nhất một sản phẩm");
        }

        Customer customer = resolveCustomer(userId);
        validateAndNormalizeShippingInfo(request);

        List<OrderItem> orderItems = new ArrayList<>();

        List<Long> requestedVariantIds = request.getItems().stream()
                .map(OrderItemRequest::getVariantId)
                .toList();

        Map<Long, Integer> requestedQuantityByVariantId = new HashMap<>();
        for (OrderItemRequest itemRequest : request.getItems()) {
            if (itemRequest.getVariantId() == null) {
                throw new InvalidRequestException("Thiếu biến thể sản phẩm");
            }

            if (itemRequest.getQuantity() == null || itemRequest.getQuantity() <= 0) {
                throw new InvalidRequestException("Số lượng sản phẩm phải lớn hơn 0");
            }

            requestedQuantityByVariantId.merge(
                    itemRequest.getVariantId(),
                    itemRequest.getQuantity(),
                    Integer::sum
            );
        }

        Map<Long, ProductVariant> variantsMap = lockVariantsForOnlineOrder(requestedQuantityByVariantId);

        for (Map.Entry<Long, Integer> entry : requestedQuantityByVariantId.entrySet()) {
            ProductVariant variant = variantsMap.get(entry.getKey());
            Integer totalRequestedQuantity = entry.getValue();

            validateVariantCanBeOrdered(variant);

            int availableStock = stockReservationService.getAvailableStock(variant);
            if (availableStock < totalRequestedQuantity) {
                throw new InvalidRequestException(
                        "Sản phẩm không đủ tồn kho khả dụng hoặc đang được giữ bởi đơn hàng khác: "
                                + variant.getProduct().getName()
                                + " - "
                                + variant.getCode()
                );
            }
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        CheckoutQuoteResponse quote = checkoutQuoteService.calculate(
                request.getItems(),
                request.getVoucherCode(),
                request.getShippingInfo(),
                userDetails,
                variantsMap
        );

        if (StringUtils.hasText(request.getVoucherCode()) && Boolean.FALSE.equals(quote.getVoucherValid())) {
            throw new InvalidRequestException(defaultText(
                    quote.getVoucherMessage(),
                    "Voucher không còn hợp lệ."
            ));
        }

        boolean skipChangeChecks = Boolean.TRUE.equals(request.getConfirmCheckoutChanged())
                || Boolean.TRUE.equals(request.getConfirmVoucherChanged());

        if (!skipChangeChecks
                && StringUtils.hasText(request.getVoucherCode())
                && request.getPreviewDiscountAmount() != null) {
            BigDecimal newDiscount = defaultZero(quote.getVoucherDiscountAmount());
            BigDecimal oldDiscount = defaultZero(request.getPreviewDiscountAmount());
            if (newDiscount.compareTo(oldDiscount) != 0) {
                BigDecimal newFinalTotal = defaultZero(quote.getFinalTotal());
                BigDecimal oldFinalTotal = newFinalTotal.subtract(newDiscount).add(oldDiscount);
                throw new VoucherChangedException(
                        request.getVoucherCode(),
                        oldDiscount,
                        newDiscount,
                        oldFinalTotal,
                        newFinalTotal
                );
            }
        }

        for (CheckoutQuoteItemResponse quoteItem : quote.getItems()) {
            ProductVariant variant = variantsMap.get(quoteItem.getVariantId());

            BigDecimal originalPrice = defaultZero(quoteItem.getOriginalPrice());
            BigDecimal unitPrice = defaultZero(quoteItem.getUnitPrice());
            BigDecimal itemProductDiscount = originalPrice.subtract(unitPrice)
                    .multiply(BigDecimal.valueOf(quoteItem.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .productVariant(variant)
                    .quantity(quoteItem.getQuantity())
                    .costPriceAtPurchase(defaultZero(variant.getCostPrice()))
                    .priceAtPurchase(unitPrice)
                    .originalPriceAtPurchase(originalPrice)
                    .productDiscountPercent(defaultZero(quoteItem.getDiscountPercent()))
                    .productDiscountAmount(itemProductDiscount)
                    .promotionId(quoteItem.getPromotionId())
                    .lineTotal(defaultZero(quoteItem.getLineTotal()))
                    .build();

            orderItems.add(orderItem);
        }

        BigDecimal originalSubtotal = defaultZero(quote.getOriginalSubtotal());
        BigDecimal productDiscountTotal = defaultZero(quote.getProductDiscountTotal());
        BigDecimal subtotalBeforeVoucher = defaultZero(quote.getSubtotalBeforeVoucher());
        BigDecimal discountAmount = defaultZero(quote.getVoucherDiscountAmount());
        BigDecimal shippingFee = defaultZero(quote.getShippingFee());
        BigDecimal productRevenue = defaultZero(quote.getProductRevenue());
        BigDecimal totalAmount = defaultZero(quote.getFinalTotal());
        String appliedVoucherCode = quote.getVoucherCode();
        Coupon appliedCoupon = StringUtils.hasText(appliedVoucherCode)
                ? discountService.findCouponByCode(appliedVoucherCode)
                : null;

        Employee employee = null;
        if (request.getEmployeeId() != null) {
            employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        }

        Order order = Order.builder()
                .code("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .customer(customer)
                .employee(employee)
                .status(ORDER_STATUS_PENDING)
                .orderType(ORDER_TYPE_ONLINE)
                .originalSubtotal(originalSubtotal)
                .productDiscountTotal(productDiscountTotal)
                .subtotalBeforeVoucher(subtotalBeforeVoucher)
                .discountAmount(discountAmount)
                .productRevenue(productRevenue)
                .totalAmount(totalAmount)
                .shippingFee(shippingFee)
                .voucherCode(appliedVoucherCode)
                .build();

        OrderShippingDetails shippingDetails = new OrderShippingDetails();
        shippingDetails.setOrder(order);
        shippingDetails.setShippingName(request.getShippingInfo().getCustomerName());
        shippingDetails.setShippingPhone(request.getShippingInfo().getPhone());
        shippingDetails.setShippingAddress(request.getShippingInfo().getAddress());
        shippingDetails.setShippingNote(request.getShippingInfo().getNote());
        shippingDetails.setProvince(defaultText(request.getShippingInfo().getProvinceName(), request.getShippingInfo().getProvince()));
        shippingDetails.setDistrict(defaultText(request.getShippingInfo().getDistrictName(), request.getShippingInfo().getDistrict()));
        shippingDetails.setWard(defaultText(request.getShippingInfo().getWardName(), request.getShippingInfo().getWard()));
        shippingDetails.setProvinceId(request.getShippingInfo().getProvinceId());
        shippingDetails.setDistrictId(request.getShippingInfo().getDistrictId());
        shippingDetails.setWardCode(request.getShippingInfo().getWardCode());
        order.setShippingDetails(shippingDetails);

        for (OrderItem item : orderItems) {
            item.setOrder(order);
        }
        order.setItems(orderItems);

        Order savedOrder = orderRepository.save(order);

        saveOrderStatusHistory(savedOrder, null, ORDER_STATUS_PENDING);

        PaymentMethod paymentMethod = paymentMethodRepository.findByCode(request.getPaymentMethodCode())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Phương thức thanh toán không hợp lệ: " + request.getPaymentMethodCode()
                ));

        boolean isVnpayPayment = "VNPAY".equalsIgnoreCase(paymentMethod.getCode());

        // Khong tru ton kho tai placeOrder:
        // - VNPay: reservation tao trong createOnlinePaymentUrl (khi user bam thanh toan)
        // - COD: tru ton khi admin xac nhan (updateOrderStatus PENDING->CONFIRMED)

        if (!isVnpayPayment && StringUtils.hasText(appliedVoucherCode)) {
            // Re-validate with PESSIMISTIC_WRITE lock to prevent concurrent over-usage.
            // Throws InvalidRequestException if voucher is now invalid or limit is reached.
            discountService.validateDiscountForConsume(appliedVoucherCode, subtotalBeforeVoucher, userId);
            if (appliedCoupon != null) {
                couponUsageRepository.save(CouponUsage.builder()
                        .order(savedOrder)
                        .customer(customer)
                        .coupon(appliedCoupon)
                        .build());
            }
        }

        Payment payment = Payment.builder()
                .order(savedOrder)
                .paymentMethod(paymentMethod)
                .amount(savedOrder.getTotalAmount())
                .status("PENDING")
                .note(isVnpayPayment
                        ? "Chờ thanh toán VNPAY cho đơn online"
                        : "Thanh toán khi nhận hàng (COD)")
                .build();

        paymentRepository.save(payment);

        cartItemRepository.deleteAllByCart_Customer_IdAndProductVariant_IdIn(
                customer.getId(),
                requestedVariantIds
        );

        return mapToOrderResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderDetailResponse getOrderDetailsById(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        boolean isOwner = order.getCustomer() != null
                && order.getCustomer().getUserProfile() != null
                && order.getCustomer().getUserProfile().getId().equals(currentUser.getUserProfile().getId());

        boolean isAdmin = currentUser.getRole() != null
                && "ADMIN".equals(currentUser.getRole().getCode());

        boolean isStaff = currentUser.getRole() != null
                && "STAFF".equals(currentUser.getRole().getCode());

        if (!isOwner && !isAdmin && !isStaff) {
            throw new AccessDeniedException("Bạn không có quyền xem chi tiết đơn hàng này.");
        }

        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(this::convertToOrderItemResponse)
                .collect(Collectors.toList());

        OrderShippingDetails shippingDetails = order.getShippingDetails();
        String customerName = shippingDetails != null ? shippingDetails.getShippingName() : "N/A";
        String phone = shippingDetails != null ? shippingDetails.getShippingPhone() : "N/A";
        String address = shippingDetails != null ? shippingDetails.getShippingAddress() : "N/A";
        String province = shippingDetails != null ? shippingDetails.getProvince() : null;
        String district = shippingDetails != null ? shippingDetails.getDistrict() : null;
        String ward = shippingDetails != null ? shippingDetails.getWard() : null;

        if (ORDER_TYPE_POS.equalsIgnoreCase(order.getOrderType())
                && shippingDetails == null
                && order.getCustomer() != null
                && order.getCustomer().getUserProfile() != null) {
            UserProfile profile = order.getCustomer().getUserProfile();
            customerName = defaultText(profile.getFullName(), "N/A");
            phone = defaultText(profile.getPhone(), "N/A");
            address = defaultText(profile.getAddress(), "N/A");
        }

        String fullAddress = buildFullAddress(address, ward, district, province);

        Long employeeId = order.getEmployee() != null ? order.getEmployee().getId() : null;
        String employeeName = order.getEmployee() != null && order.getEmployee().getUserProfile() != null
                ? order.getEmployee().getUserProfile().getFullName()
                : null;

        ensureCompletedOrderPaymentPaid(order);
        Payment latestPayment = getLatestPayment(order);
        String paymentStatus = latestPayment != null ? latestPayment.getStatus() : null;
        String paymentMethodCode = latestPayment != null && latestPayment.getPaymentMethod() != null
                ? latestPayment.getPaymentMethod().getCode()
                : null;
        String paymentMethodName = latestPayment != null && latestPayment.getPaymentMethod() != null
                ? latestPayment.getPaymentMethod().getName()
                : "Chưa xác định";

        BigDecimal subtotalAmount = resolveSubtotalBeforeVoucher(order);
        BigDecimal originalSubtotal = resolveOriginalSubtotal(order);
        BigDecimal productDiscountTotal = resolveProductDiscountTotal(order, originalSubtotal, subtotalAmount);
        BigDecimal discountAmount = defaultZero(order.getDiscountAmount());
        BigDecimal productRevenue = resolveProductRevenue(order, subtotalAmount, discountAmount);
        BigDecimal discountPercent = calculateDiscountPercent(subtotalAmount, discountAmount);
        BigDecimal finalTotal = resolveFinalTotal(order, subtotalAmount, discountAmount);

        List<OrderStatusHistoryResponse> statusHistory = orderStatusHistoryRepository
                .findByOrder_IdOrderByChangedAtAsc(order.getId())
                .stream()
                .map(this::mapToStatusHistoryResponse)
                .collect(Collectors.toList());

        return new OrderDetailResponse(
                order.getId(),
                order.getCode(),
                order.getCreatedAt(),
                order.getStatus(),
                customerName,
                phone,
                address,
                province,
                district,
                ward,
                paymentMethodName,
                paymentStatus,
                paymentMethodCode,
                subtotalAmount,
                originalSubtotal,
                productDiscountTotal,
                subtotalAmount,
                discountAmount,
                productRevenue,
                finalTotal,
                finalTotal,
                order.getVoucherCode(),
                discountAmount,
                discountPercent,
                order.getShippingFee(),
                fullAddress,
                order.getOrderType(),
                employeeId,
                employeeName,
                itemResponses,
                statusHistory,
                order.getInventoryReserved(),
                order.getInventoryReservedAt(),
                order.getInventoryReleased(),
                order.getInventoryReleasedAt()
        );
    }

    private OrderItemResponse convertToOrderItemResponse(OrderItem item) {
        ProductVariant variant = item.getProductVariant();

        String imageUrl = resolveItemImageUrl(variant);

        BigDecimal unitPrice = defaultZero(item.getPriceAtPurchase());
        BigDecimal originalPrice = defaultZero(item.getOriginalPriceAtPurchase());
        if (originalPrice.compareTo(BigDecimal.ZERO) == 0) {
            originalPrice = unitPrice;
        }
        BigDecimal lineTotal = defaultZero(item.getLineTotal());
        if (lineTotal.compareTo(BigDecimal.ZERO) == 0) {
            lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
        }
        BigDecimal productDiscountPercent = defaultZero(item.getProductDiscountPercent());

        OrderItemResponse response = new OrderItemResponse();
        response.setOrderItemId(item.getId());
        response.setProductId(variant.getProduct().getId());
        response.setProductName(variant.getProduct().getName());
        response.setVariantInfo(variant.getCode());
        response.setImageUrl(imageUrl);
        response.setProductImage(imageUrl);
        response.setSize(resolveVariantAttribute(variant, "SIZE"));
        response.setColor(resolveVariantAttribute(variant, "COLOR"));
        response.setMaterial(resolveVariantAttribute(variant, "MATERIAL"));
        response.setQuantity(item.getQuantity());
        response.setPrice(unitPrice);
        response.setOriginalPrice(originalPrice);
        response.setUnitPrice(unitPrice);
        response.setSalePrice(unitPrice);
        response.setProductDiscountPercent(productDiscountPercent);
        response.setProductDiscountAmount(defaultZero(item.getProductDiscountAmount()));
        response.setPromotionId(item.getPromotionId());
        response.setIsSale(item.getPromotionId() != null && productDiscountPercent.compareTo(BigDecimal.ZERO) > 0);
        response.setSubtotal(lineTotal);
        response.setLineTotal(lineTotal);
        reviewRepository.findByOrderItemIdAndStatusTrue(item.getId()).ifPresentOrElse(
                review -> {
                    response.setReviewed(true);
                    response.setReviewId(review.getId());
                },
                () -> {
                    response.setReviewed(false);
                    response.setReviewId(null);
                }
        );
        response.setCanReview(isReviewableOrderStatus(item.getOrder().getStatus()) && !Boolean.TRUE.equals(response.getReviewed()));
        return response;
    }

    private String resolveItemImageUrl(ProductVariant variant) {
        if (variant == null) return null;
        // 1+2: primary hoặc đầu tiên của variant
        Optional<ProductImage> variantImage = productImageRepository
                .findFirstByProductVariant_IdOrderByIsPrimaryDescDisplayOrderAsc(variant.getId());
        if (variantImage.isPresent()) {
            return variantImage.get().getImageUrl();
        }
        // 3+4: primary hoặc đầu tiên của product cha
        if (variant.getProduct() != null) {
            return productImageRepository
                    .findFirstByProduct_IdOrderByIsPrimaryDescDisplayOrderAsc(variant.getProduct().getId())
                    .map(ProductImage::getImageUrl)
                    .orElse(null);
        }
        return null;
    }

    private String resolveVariantAttribute(ProductVariant variant, String attributeCode) {
        if (variant == null || variant.getVariantAttributeValues() == null) {
            return null;
        }

        return variant.getVariantAttributeValues()
                .stream()
                .filter(vav -> vav.getAttributeValue() != null
                        && vav.getAttributeValue().getAttribute() != null
                        && attributeCode.equalsIgnoreCase(vav.getAttributeValue().getAttribute().getCode()))
                .map(vav -> vav.getAttributeValue().getValue())
                .findFirst()
                .orElse(null);
    }

    private boolean isReviewableOrderStatus(String status) {
        return "COMPLETED".equalsIgnoreCase(status) || "DELIVERED".equalsIgnoreCase(status);
    }

    @Override
    @Transactional
    public Page<OrderResponse> getMyOrders(Long userId, Pageable pageable) {
        Customer customer = resolveCustomer(userId);
        return orderRepository.findByCustomer_IdOrderByCreatedAtDesc(customer.getId(), pageable)
                .map(this::mapToOrderResponse);
    }

    @Override
    @Transactional
    public Page<OrderResponse> getAllOrders(Pageable pageable) {
        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return orderRepository.findAll(sortedPageable)
                .map(this::mapToOrderResponse);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        String normalizedStatus = status == null ? null : status.trim().toUpperCase();
        validateOrderStatus(normalizedStatus);

        String previousStatus = order.getStatus();
        if (normalizedStatus.equals(previousStatus)) {
            return mapToOrderResponse(order);
        }

        if (ORDER_STATUS_CANCELLED.equals(previousStatus) || ORDER_STATUS_COMPLETED.equals(previousStatus)) {
            throw new InvalidRequestException("Không thể cập nhật trạng thái từ đơn hàng đã kết thúc.");
        }

        if (ORDER_STATUS_PENDING.equals(previousStatus)
                && ORDER_STATUS_CONFIRMED.equals(normalizedStatus)
                && ORDER_TYPE_ONLINE.equalsIgnoreCase(order.getOrderType())
                && !Boolean.TRUE.equals(order.getInventoryReserved())) {
            // COD: admin confirm → tru ton kho that (VNPay da tru truoc trong finalizeSuccessfulOnlinePayment)
            orderInventoryService.deductStockForCodConfirm(order);
        }

        if (ORDER_STATUS_CANCELLED.equals(normalizedStatus)) {
            if (ORDER_TYPE_ONLINE.equalsIgnoreCase(order.getOrderType())) {
                // Release soft reservation VNPay neu con dang RESERVED (chua thanh toan)
                stockReservationService.releaseReservations(order.getId(), "ADMIN_CANCELLED");
                // Cong lai ton kho that neu da tru (inventoryReserved=true: VNPay paid hoac COD confirmed)
                orderInventoryService.releaseStockForOrder(order, "ONLINE_ORDER_ADMIN_CANCELLED");
                couponUsageRepository.deleteByOrder_Id(order.getId());
            } else if (ORDER_STATUS_CONFIRMED.equals(previousStatus)) {
                restoreStockForOrder(order);
            }
        }

        order.setStatus(normalizedStatus);
        if (ORDER_STATUS_COMPLETED.equals(normalizedStatus)) {
            markLatestPaymentAsPaidIfNeeded(order);
        }

        Order updatedOrder = orderRepository.save(order);

        saveOrderStatusHistory(updatedOrder, previousStatus, normalizedStatus);

        return mapToOrderResponse(updatedOrder);
    }

    @Override
    @Transactional
    public void cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        Customer customer = resolveCustomer(userId);
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customer.getId())) {
            throw new AccessDeniedException("Bạn không có quyền hủy đơn hàng này.");
        }

        if (!ORDER_STATUS_PENDING.equals(order.getStatus())) {
            throw new InvalidRequestException("Chỉ có thể hủy đơn hàng ở trạng thái 'Chờ xác nhận'.");
        }

        List<Payment> payments = paymentRepository.findByOrder_Id(orderId);
        boolean isVnpayOrder = payments.stream()
                .anyMatch(p -> p.getPaymentMethod() != null
                        && "VNPAY".equalsIgnoreCase(p.getPaymentMethod().getCode()));
        boolean hasPaidPayment = payments.stream()
                .anyMatch(p -> "PAID".equalsIgnoreCase(p.getStatus()));
        BigDecimal paid = order.getCustomerPaid() == null ? BigDecimal.ZERO : order.getCustomerPaid();
        if (isVnpayOrder && (hasPaidPayment || paid.compareTo(BigDecimal.ZERO) > 0)) {
            throw new InvalidRequestException(
                    "Đơn hàng đã thanh toán VNPay, không thể hủy trực tiếp. Vui lòng liên hệ cửa hàng để được hỗ trợ."
            );
        }

        String previousStatus = order.getStatus();

        if (ORDER_TYPE_ONLINE.equalsIgnoreCase(order.getOrderType())) {
            // Release soft reservation VNPay neu con dang RESERVED
            stockReservationService.releaseReservations(order.getId(), "CUSTOMER_CANCELLED");
            // Cong lai ton kho that neu da tru (inventoryReserved=true)
            orderInventoryService.releaseStockForOrder(order, "ONLINE_ORDER_CUSTOMER_CANCELLED");
        }

        order.setStatus(ORDER_STATUS_CANCELLED);

        couponUsageRepository.deleteByOrder_Id(order.getId());
        orderRepository.save(order);

        saveOrderStatusHistory(order, previousStatus, ORDER_STATUS_CANCELLED);
    }

    @Override
    @Transactional
    public void requestReturn(Long orderId, Long userId, OrderReturnRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        Customer customer = resolveCustomer(userId);
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customer.getId())) {
            throw new AccessDeniedException("Bạn không có quyền yêu cầu trả hàng cho đơn này.");
        }

        if (!ORDER_STATUS_COMPLETED.equalsIgnoreCase(order.getStatus())) {
            throw new InvalidRequestException("Chỉ đơn hàng đã hoàn thành mới được yêu cầu trả hàng.");
        }

        validateReturnReason(request.getReason());

        OffsetDateTime completedAt = findLatestCompletedAt(order);
        if (completedAt == null) {
            completedAt = order.getCreatedAt();
        }

        OffsetDateTime deadline = completedAt.plusDays(RETURN_WINDOW_DAYS);
        if (OffsetDateTime.now().isAfter(deadline)) {
            throw new InvalidRequestException(
                    "Đơn hàng đã quá thời hạn " + RETURN_WINDOW_DAYS + " ngày để yêu cầu trả hàng."
            );
        }

        String previousStatus = order.getStatus();
        order.setStatus(ORDER_STATUS_RETURN_REQUESTED);
        order.setNote(appendAuditNote(order.getNote(), "RETURN_REQUEST", request.getReason()));
        orderRepository.save(order);

        saveOrderStatusHistory(order, previousStatus, ORDER_STATUS_RETURN_REQUESTED);
    }

    @Override
    @Transactional
    public void reviewReturn(Long orderId, OrderReturnReviewRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (!ORDER_STATUS_RETURN_REQUESTED.equalsIgnoreCase(order.getStatus())) {
            throw new InvalidRequestException("Đơn hàng này hiện không ở trạng thái chờ xử lý trả hàng.");
        }

        String action = request.getAction() == null ? "" : request.getAction().trim().toUpperCase();
        if (!"APPROVE".equals(action) && !"REJECT".equals(action)) {
            throw new InvalidRequestException("Action phải là APPROVE hoặc REJECT.");
        }

        String previousStatus = order.getStatus();

        if ("APPROVE".equals(action)) {
            restoreStockForApprovedReturn(order);
            markPaymentRefundPending(order, request.getNote());

            order.setStatus(ORDER_STATUS_RETURNED);
            order.setNote(appendAuditNote(
                    order.getNote(),
                    "RETURN_APPROVED",
                    defaultText(request.getNote(), "Admin đã duyệt trả hàng")
            ));
            orderRepository.save(order);

            saveOrderStatusHistory(order, previousStatus, ORDER_STATUS_RETURNED);
            return;
        }

        order.setStatus(ORDER_STATUS_RETURN_REJECTED);
        order.setNote(appendAuditNote(
                order.getNote(),
                "RETURN_REJECTED",
                defaultText(request.getNote(), "Admin từ chối yêu cầu trả hàng")
        ));
        orderRepository.save(order);

        saveOrderStatusHistory(order, previousStatus, ORDER_STATUS_RETURN_REJECTED);
    }

    @Override
    public List<OrderShippingAddressResponse> getUserShippingAddresses(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));

        Customer customer = customerRepository
                .findByUserProfileId(user.getUserProfile().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."));

        return orderRepository.findAll()
                .stream()
                .filter(order -> order.getCustomer() != null && order.getCustomer().getId().equals(customer.getId()))
                .sorted((o1, o2) -> o2.getCreatedAt().compareTo(o1.getCreatedAt()))
                .filter(order -> order.getShippingDetails() != null)
                .map(order -> {
                    OrderShippingDetails details = order.getShippingDetails();
                    OrderShippingAddressResponse response = new OrderShippingAddressResponse();
                    response.setFullName(details.getShippingName());
                    response.setPhone(details.getShippingPhone());
                    response.setAddress(details.getShippingAddress());
                    response.setProvince(details.getProvince());
                    response.setDistrict(details.getDistrict());
                    response.setWard(details.getWard());
                    response.setProvinceId(details.getProvinceId());
                    response.setDistrictId(details.getDistrictId());
                    response.setWardCode(details.getWardCode());
                    response.setProvinceName(details.getProvince());
                    response.setDistrictName(details.getDistrict());
                    response.setWardName(details.getWard());
                    response.setNote(details.getShippingNote());
                    return response;
                })
                .distinct()
                .collect(Collectors.toList());
    }

    private void decreaseStockForOrder(Order order) {
        for (OrderItem item : order.getItems()) {
            ProductVariant variant = item.getProductVariant();

            validateVariantCanBeOrdered(variant);

            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();

            if (currentStock < item.getQuantity()) {
                throw new InvalidRequestException(
                        "Không đủ số lượng tồn kho cho sản phẩm: "
                                + variant.getProduct().getName()
                                + " - "
                                + variant.getCode()
                );
            }

            variant.setStockQuantity(currentStock - item.getQuantity());
            productVariantRepository.save(variant);
        }
    }

    private void restoreStockForOrder(Order order) {
        for (OrderItem item : order.getItems()) {
            ProductVariant variant = item.getProductVariant();

            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            variant.setStockQuantity(currentStock + item.getQuantity());

            productVariantRepository.save(variant);
        }
    }

    private OrderResponse mapToOrderResponse(Order order) {
        String customerName = null;
        String phone = null;
        String address = null;
        String province = null;
        String district = null;
        String ward = null;
        String fullAddress = null;

        if (order.getShippingDetails() != null) {
            OrderShippingDetails details = order.getShippingDetails();
            customerName = details.getShippingName();
            phone = details.getShippingPhone();
            address = details.getShippingAddress();
            province = details.getProvince();
            district = details.getDistrict();
            ward = details.getWard();
            fullAddress = buildFullAddress(address, ward, district, province);
        } else if (order.getCustomer() != null && order.getCustomer().getUserProfile() != null) {
            customerName = order.getCustomer().getUserProfile().getFullName();
            phone = order.getCustomer().getUserProfile().getPhone();
            address = order.getCustomer().getUserProfile().getAddress();
            fullAddress = address;
        }

        Long employeeId = order.getEmployee() != null ? order.getEmployee().getId() : null;
        String employeeName = order.getEmployee() != null && order.getEmployee().getUserProfile() != null
                ? order.getEmployee().getUserProfile().getFullName()
                : null;

        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(this::convertToOrderItemResponse)
                .collect(Collectors.toList());

        CustomerResponse customerResponse = null;
        if (order.getCustomer() != null) {
            UserProfile userProfile = order.getCustomer().getUserProfile();
            UserProfileResponse userProfileResponse = null;

            if (userProfile != null) {
                userProfileResponse = new UserProfileResponse(
                        userProfile.getId(),
                        userProfile.getFullName(),
                        userProfile.getPhone(),
                        userProfile.getAddress()
                );
            }

            customerResponse = new CustomerResponse(order.getCustomer().getId(), userProfileResponse);
        }

        BigDecimal subtotalAmount = resolveSubtotalBeforeVoucher(order);
        BigDecimal originalSubtotal = resolveOriginalSubtotal(order);
        BigDecimal productDiscountTotal = resolveProductDiscountTotal(order, originalSubtotal, subtotalAmount);
        BigDecimal discountAmount = defaultZero(order.getDiscountAmount());
        BigDecimal productRevenue = resolveProductRevenue(order, subtotalAmount, discountAmount);
        BigDecimal discountPercent = calculateDiscountPercent(subtotalAmount, discountAmount);
        BigDecimal finalTotal = resolveFinalTotal(order, subtotalAmount, discountAmount);

        ensureCompletedOrderPaymentPaid(order);
        Payment latestPayment = getLatestPayment(order);

        String paymentStatus = latestPayment != null ? latestPayment.getStatus() : null;
        String paymentMethodCode = latestPayment != null && latestPayment.getPaymentMethod() != null
                ? latestPayment.getPaymentMethod().getCode()
                : null;
        String paymentMethodName = latestPayment != null && latestPayment.getPaymentMethod() != null
                ? latestPayment.getPaymentMethod().getName()
                : null;

        boolean canRetryVnpay = ORDER_TYPE_ONLINE.equalsIgnoreCase(order.getOrderType())
                && ORDER_STATUS_PENDING.equalsIgnoreCase(order.getStatus())
                && "VNPAY".equalsIgnoreCase(paymentMethodCode)
                && (paymentStatus == null || !"PAID".equalsIgnoreCase(paymentStatus));

        return OrderResponse.builder()
                .id(order.getId())
                .code(order.getCode())
                .discountAmount(discountAmount)
                .discountPercent(discountPercent)
                .totalAmount(finalTotal)
                .subtotalAmount(subtotalAmount)
                .originalSubtotal(originalSubtotal)
                .productDiscountTotal(productDiscountTotal)
                .subtotalBeforeVoucher(subtotalAmount)
                .voucherDiscountAmount(discountAmount)
                .productRevenue(productRevenue)
                .shippingFee(defaultZero(order.getShippingFee()))
                .voucherCode(order.getVoucherCode())
                .finalTotal(finalTotal)
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .customer(customerResponse)
                .items(itemResponses)
                .customerName(customerName)
                .phone(phone)
                .address(address)
                .province(province)
                .district(district)
                .ward(ward)
                .fullAddress(fullAddress)
                .orderType(order.getOrderType())
                .employeeId(employeeId)
                .employeeName(employeeName)
                .paymentStatus(paymentStatus)
                .paymentMethodCode(paymentMethodCode)
                .paymentMethodName(paymentMethodName)
                .canRetryVnpay(canRetryVnpay)
                .inventoryReserved(order.getInventoryReserved())
                .inventoryReservedAt(order.getInventoryReservedAt())
                .inventoryReleased(order.getInventoryReleased())
                .inventoryReleasedAt(order.getInventoryReleasedAt())
                .build();
    }

    private OrderStatusHistoryResponse mapToStatusHistoryResponse(OrderStatusHistory history) {
        return OrderStatusHistoryResponse.builder()
                .id(history.getId())
                .orderId(history.getOrder() != null ? history.getOrder().getId() : null)
                .fromStatus(history.getFromStatus())
                .toStatus(history.getToStatus())
                .changedAt(history.getChangedAt())
                .build();
    }

    private BigDecimal calculateSubtotal(List<OrderItem> items) {
        return items.stream()
                .map(item -> {
                    BigDecimal lineTotal = defaultZero(item.getLineTotal());
                    if (lineTotal.compareTo(BigDecimal.ZERO) > 0) {
                        return lineTotal;
                    }
                    return defaultZero(item.getPriceAtPurchase())
                            .multiply(BigDecimal.valueOf(item.getQuantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal resolveSubtotalBeforeVoucher(Order order) {
        BigDecimal subtotal = defaultZero(order.getSubtotalBeforeVoucher());
        return subtotal.compareTo(BigDecimal.ZERO) > 0 ? subtotal : calculateSubtotal(order.getItems());
    }

    private BigDecimal resolveOriginalSubtotal(Order order) {
        BigDecimal originalSubtotal = defaultZero(order.getOriginalSubtotal());
        if (originalSubtotal.compareTo(BigDecimal.ZERO) > 0) {
            return originalSubtotal;
        }

        return order.getItems().stream()
                .map(item -> {
                    BigDecimal originalPrice = defaultZero(item.getOriginalPriceAtPurchase());
                    if (originalPrice.compareTo(BigDecimal.ZERO) == 0) {
                        originalPrice = defaultZero(item.getPriceAtPurchase());
                    }
                    return originalPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal resolveProductDiscountTotal(
            Order order,
            BigDecimal originalSubtotal,
            BigDecimal subtotalBeforeVoucher
    ) {
        BigDecimal productDiscountTotal = defaultZero(order.getProductDiscountTotal());
        if (productDiscountTotal.compareTo(BigDecimal.ZERO) > 0) {
            return productDiscountTotal;
        }
        return defaultZero(originalSubtotal).subtract(defaultZero(subtotalBeforeVoucher)).max(BigDecimal.ZERO);
    }

    private BigDecimal resolveProductRevenue(
            Order order,
            BigDecimal subtotalBeforeVoucher,
            BigDecimal discountAmount
    ) {
        BigDecimal productRevenue = defaultZero(order.getProductRevenue());
        if (productRevenue.compareTo(BigDecimal.ZERO) > 0) {
            return productRevenue;
        }

        return defaultZero(subtotalBeforeVoucher).subtract(defaultZero(discountAmount)).max(BigDecimal.ZERO);
    }

    private BigDecimal resolveFinalTotal(
            Order order,
            BigDecimal subtotalBeforeVoucher,
            BigDecimal discountAmount
    ) {
        BigDecimal subtotal = defaultZero(subtotalBeforeVoucher);

        if (subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return defaultZero(order.getTotalAmount());
        }

        return subtotal
                .subtract(defaultZero(discountAmount))
                .add(defaultZero(order.getShippingFee()))
                .max(BigDecimal.ZERO);
    }

    private BigDecimal calculateDiscountPercent(BigDecimal subtotalAmount, BigDecimal discountAmount) {
        if (subtotalAmount == null || discountAmount == null || subtotalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return discountAmount
                .multiply(BigDecimal.valueOf(100))
                .divide(subtotalAmount, 2, RoundingMode.HALF_UP);
    }

    private String buildFullAddress(String address, String ward, String district, String province) {
        return java.util.stream.Stream.of(address, ward, district, province)
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(", "));
    }

    private void validateAndNormalizeShippingInfo(PlaceOrderRequest request) {
        if (request.getShippingInfo() == null) {
            throw new InvalidRequestException("Vui lòng nhập thông tin giao hàng.");
        }

        var shippingInfo = request.getShippingInfo();
        String customerName = safeTrim(shippingInfo.getCustomerName());
        String phone = normalizePhone(shippingInfo.getPhone());
        String address = safeTrim(shippingInfo.getAddress());
        String provinceName = safeTrim(defaultText(shippingInfo.getProvinceName(), shippingInfo.getProvince()));
        String districtName = safeTrim(defaultText(shippingInfo.getDistrictName(), shippingInfo.getDistrict()));
        String wardName = safeTrim(defaultText(shippingInfo.getWardName(), shippingInfo.getWard()));
        String note = safeTrim(shippingInfo.getNote());

        if (!StringUtils.hasText(customerName)) {
            throw new InvalidRequestException("Vui lòng nhập họ tên.");
        }

        if (!isValidPersonName(customerName)) {
            throw new InvalidRequestException(
                    customerName.length() < 2
                            ? "Họ tên phải có ít nhất 2 ký tự."
                            : "Họ tên không hợp lệ."
            );
        }

        if (!StringUtils.hasText(phone) || !phone.matches(VIETNAM_PHONE_REGEX)) {
            throw new InvalidRequestException(
                    StringUtils.hasText(phone)
                            ? "Số điện thoại không hợp lệ."
                            : "Vui lòng nhập số điện thoại."
            );
        }

        if (!StringUtils.hasText(provinceName)) {
            throw new InvalidRequestException("Vui lòng chọn Tỉnh/Thành phố.");
        }

        if (!StringUtils.hasText(districtName)) {
            throw new InvalidRequestException("Vui lòng chọn Quận/Huyện.");
        }

        if (!StringUtils.hasText(wardName)) {
            throw new InvalidRequestException("Vui lòng chọn Phường/Xã.");
        }

        if (!isValidAddressDetail(address)) {
            throw new InvalidRequestException(
                    StringUtils.hasText(address) && address.length() < 5
                            ? "Địa chỉ chi tiết phải có ít nhất 5 ký tự."
                            : "Địa chỉ chi tiết không hợp lệ."
            );
        }

        if (!isValidOptionalNote(note)) {
            throw new InvalidRequestException("Ghi chú giao hàng không hợp lệ.");
        }

        shippingInfo.setCustomerName(customerName);
        shippingInfo.setPhone(phone);
        shippingInfo.setAddress(address);
        shippingInfo.setProvince(provinceName);
        shippingInfo.setDistrict(districtName);
        shippingInfo.setWard(wardName);
        shippingInfo.setProvinceName(provinceName);
        shippingInfo.setDistrictName(districtName);
        shippingInfo.setWardName(wardName);
        shippingInfo.setNote(note);
    }

    private boolean isValidPersonName(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }

        String text = value.trim();
        return text.length() >= 2
                && text.length() <= 100
                && !text.matches("^\\d+$")
                && !containsDangerousText(text);
    }

    private boolean isValidAddressDetail(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }

        String text = value.trim();
        return text.length() >= 5
                && text.length() <= 255
                && !text.matches("^\\d+$")
                && !containsDangerousAddressText(text);
    }

    private boolean isValidOptionalNote(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }

        String text = value.trim();
        return text.length() <= 255 && !containsDangerousAddressText(text);
    }

    private boolean containsDangerousText(String value) {
        return value != null
                && (value.matches(".*[<>{}\\[\\]].*")
                || value.toLowerCase().contains("script"));
    }

    private boolean containsDangerousAddressText(String value) {
        return value != null
                && (value.matches(".*[<>].*")
                || value.toLowerCase().contains("script"));
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizePhone(String value) {
        return value == null ? null : value.replaceAll("\\s+", "").trim();
    }

    private void validateOrderStatus(String status) {
        List<String> validStatuses = List.of(
                ORDER_STATUS_PENDING,
                ORDER_STATUS_CONFIRMED,
                ORDER_STATUS_SHIPPING,
                ORDER_STATUS_COMPLETED,
                ORDER_STATUS_CANCELLED
        );

        if (!StringUtils.hasText(status) || !validStatuses.contains(status)) {
            throw new InvalidRequestException("Trạng thái đơn hàng không hợp lệ: " + status);
        }
    }

    private void saveOrderStatusHistory(Order order, String fromStatus, String toStatus) {
        OrderStatusHistory history = OrderStatusHistory.builder()
                .order(order)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .changedAt(OffsetDateTime.now())
                .build();

        orderStatusHistoryRepository.save(history);
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private Customer resolveCustomer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidRequestException("Không tìm thấy người dùng."));

        return customerRepository
                .findByUserProfileId(user.getUserProfile().getId())
                .orElseThrow(() -> new InvalidRequestException("Không tìm thấy khách hàng."));
    }

    private void validateReturnReason(String reason) {
        if (!StringUtils.hasText(reason) || reason.trim().length() < 10) {
            throw new InvalidRequestException("Lý do trả hàng phải có ít nhất 10 ký tự.");
        }
    }

    private OffsetDateTime findLatestCompletedAt(Order order) {
        return orderStatusHistoryRepository.findByOrder_IdOrderByChangedAtAsc(order.getId())
                .stream()
                .filter(history -> ORDER_STATUS_COMPLETED.equalsIgnoreCase(history.getToStatus()))
                .map(OrderStatusHistory::getChangedAt)
                .max(OffsetDateTime::compareTo)
                .orElse(null);
    }

    private void restoreStockForApprovedReturn(Order order) {
        if (order == null || order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }

        for (OrderItem item : order.getItems()) {
            if (item.getProductVariant() == null || item.getProductVariant().getId() == null) {
                continue;
            }

            ProductVariant lockedVariant = productVariantRepository.findByIdForUpdate(item.getProductVariant().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy biến thể sản phẩm: " + item.getProductVariant().getId()
                    ));

            int currentStock = lockedVariant.getStockQuantity() == null ? 0 : lockedVariant.getStockQuantity();
            lockedVariant.setStockQuantity(currentStock + item.getQuantity());

            productVariantRepository.save(lockedVariant);
        }
    }

    private void markPaymentRefundPending(Order order, String adminNote) {
        ensureCompletedOrderPaymentPaid(order);
        Payment latestPayment = getLatestPayment(order);

        if (latestPayment == null) {
            return;
        }

        if (!PAYMENT_STATUS_PAID.equalsIgnoreCase(latestPayment.getStatus())) {
            return;
        }

        latestPayment.setStatus(PAYMENT_STATUS_REFUND_PENDING);
        latestPayment.setNote(appendAuditNote(
                latestPayment.getNote(),
                "REFUND_PENDING",
                defaultText(adminNote, "Chờ hoàn tiền do admin duyệt trả hàng")
        ));
        paymentRepository.save(latestPayment);
    }

    private void markLatestPaymentAsPaidIfNeeded(Order order) {
        Payment latestPayment = getLatestPayment(order);

        if (latestPayment == null) {
            return;
        }

        if (PAYMENT_STATUS_PAID.equalsIgnoreCase(latestPayment.getStatus())) {
            return;
        }

        latestPayment.setStatus(PAYMENT_STATUS_PAID);
        if (latestPayment.getPaidAt() == null) {
            latestPayment.setPaidAt(OffsetDateTime.now());
        }
        order.setCustomerPaid(defaultZero(latestPayment.getAmount()));
        paymentRepository.save(latestPayment);
    }

    private void ensureCompletedOrderPaymentPaid(Order order) {
        if (order == null || !ORDER_STATUS_COMPLETED.equalsIgnoreCase(order.getStatus())) {
            return;
        }

        markLatestPaymentAsPaidIfNeeded(order);
    }

    private Payment getLatestPayment(Order order) {
        if (order == null || order.getId() == null) {
            return null;
        }

        return paymentRepository.findByOrder_Id(order.getId())
                .stream()
                .max(Comparator.comparing(Payment::getId))
                .orElse(null);
    }

    private String appendAuditNote(String currentNote, String tag, String message) {
        String safeMessage = defaultText(message, "N/A").trim();
        String newLine = "[" + tag + "][" + OffsetDateTime.now() + "] " + safeMessage;

        if (!StringUtils.hasText(currentNote)) {
            return newLine;
        }

        return currentNote + System.lineSeparator() + newLine;
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private Map<Long, ProductVariant> lockVariantsForOnlineOrder(
            Map<Long, Integer> requestedQuantityByVariantId
    ) {
        List<Long> sortedVariantIds = requestedQuantityByVariantId.keySet()
                .stream()
                .sorted()
                .toList();

        List<ProductVariant> lockedVariants = productVariantRepository.findAllByIdInForUpdate(sortedVariantIds);

        Map<Long, ProductVariant> variantsMap = lockedVariants.stream()
                .collect(Collectors.toMap(ProductVariant::getId, variant -> variant));

        for (Long variantId : sortedVariantIds) {
            if (!variantsMap.containsKey(variantId)) {
                throw new ResourceNotFoundException("Không tìm thấy biến thể sản phẩm với ID: " + variantId);
            }
        }

        return variantsMap;
    }

    private void validateVariantCanBeOrdered(ProductVariant variant) {
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

        if (variant.getStockQuantity() == null || variant.getStockQuantity() <= 0) {
            throw new InvalidRequestException("Sản phẩm đã hết hàng: " + variant.getCode());
        }
    }
}
