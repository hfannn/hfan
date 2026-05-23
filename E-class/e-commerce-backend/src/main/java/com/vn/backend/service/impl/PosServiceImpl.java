package com.vn.backend.service.impl;

import com.vn.backend.dto.request.pos.PosAddItemRequest;
import com.vn.backend.dto.request.pos.PosAssignCustomerRequest;
import com.vn.backend.dto.request.pos.PosCheckoutRequest;
import com.vn.backend.dto.request.pos.PosCreateOrderRequest;
import com.vn.backend.dto.request.pos.PosQuickCreateCustomerRequest;
import com.vn.backend.dto.request.pos.PosUpdateItemRequest;
import com.vn.backend.dto.response.pos.PosAvailableDiscountResponse;
import com.vn.backend.dto.response.pos.PosCheckoutValidationResponse;
import com.vn.backend.dto.response.pos.PosOrderItemResponse;
import com.vn.backend.dto.response.pos.PosOrderResponse;
import com.vn.backend.dto.response.pos.PosProductSearchResponse;
import com.vn.backend.dto.response.ProductPriceResponse;
import com.vn.backend.entity.AttributeValue;
import com.vn.backend.entity.Coupon;
import com.vn.backend.entity.CouponUsage;
import com.vn.backend.entity.Customer;
import com.vn.backend.entity.Employee;
import com.vn.backend.entity.InventoryTransaction;
import com.vn.backend.entity.Order;
import com.vn.backend.entity.OrderItem;
import com.vn.backend.entity.OrderStatusHistory;
import com.vn.backend.entity.Payment;
import com.vn.backend.entity.PaymentMethod;
import com.vn.backend.entity.Product;
import com.vn.backend.entity.ProductImage;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.Store;
import com.vn.backend.entity.UserProfile;
import com.vn.backend.entity.VariantAttributeValue;
import com.vn.backend.repository.CouponRepository;
import com.vn.backend.repository.CouponUsageRepository;
import com.vn.backend.repository.CustomerRepository;
import com.vn.backend.repository.EmployeeRepository;
import com.vn.backend.repository.InventoryTransactionRepository;
import com.vn.backend.repository.OrderItemRepository;
import com.vn.backend.repository.OrderRepository;
import com.vn.backend.repository.OrderStatusHistoryRepository;
import com.vn.backend.repository.PaymentMethodRepository;
import com.vn.backend.repository.PaymentRepository;
import com.vn.backend.repository.ProductImageRepository;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.StoreRepository;
import com.vn.backend.repository.UserProfileRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.service.PosService;
import com.vn.backend.service.ProductPriceService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class PosServiceImpl implements PosService {

    private static final String ORDER_STATUS_DRAFT = "DRAFT";
    private static final String ORDER_STATUS_COMPLETED = "COMPLETED";
    private static final String ORDER_STATUS_CANCELLED = "CANCELLED";
    private static final String ORDER_TYPE_POS = "POS";
    private static final String PAYMENT_STATUS_PAID = "PAID";
    private static final String VIETNAM_PHONE_REGEX = "^(0)(3|5|7|8|9)[0-9]{8}$";

    private static final int MAX_DRAFT_POS_ORDERS = 5;
    private static final int MAX_DRAFT_POS_ORDERS_PER_EMPLOYEE = 10;

    private static final String INVENTORY_IN = "IN";
    private static final String INVENTORY_OUT = "OUT";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final StoreRepository storeRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentRepository paymentRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;
    private final ProductPriceService productPriceService;
    private final EntityManager entityManager;
    private final StockReservationService stockReservationService;

    @Override
    public PosOrderResponse createOrder(PosCreateOrderRequest request, Long userId) {
        long currentDraftCount = orderRepository.countByStatusAndOrderType(
                ORDER_STATUS_DRAFT,
                ORDER_TYPE_POS
        );

        if (currentDraftCount >= MAX_DRAFT_POS_ORDERS) {
            throw new IllegalArgumentException(
                    "Chỉ được tạo tối đa " + MAX_DRAFT_POS_ORDERS
                            + " hóa đơn nháp. Vui lòng thanh toán hoặc hủy bớt hóa đơn trước khi tạo mới."
            );
        }

        com.vn.backend.entity.User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));
        UserProfile currentProfile = currentUser.getUserProfile();
        if (currentProfile == null) {
            throw new IllegalArgumentException("Tài khoản chưa được liên kết hồ sơ nhân viên.");
        }
        Employee employee = employeeRepository.findByUserProfile(currentProfile)
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản chưa được liên kết hồ sơ nhân viên."));

        Store store = storeRepository.findById(request.getStoreId().longValue())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy cửa hàng"));

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId().longValue())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách hàng"));
        }

        int draftCountByEmployee = orderRepository
                .findByOrderTypeAndStatusAndEmployeeId(
                        ORDER_TYPE_POS,
                        ORDER_STATUS_DRAFT,
                        employee.getId()
                )
                .size();

        if (draftCountByEmployee >= MAX_DRAFT_POS_ORDERS_PER_EMPLOYEE) {
            throw new IllegalArgumentException(
                    "Số lượng hóa đơn nháp giới hạn là "
                            + MAX_DRAFT_POS_ORDERS_PER_EMPLOYEE
                            + ", không thể tạo thêm."
            );
        }

        Order order = Order.builder()
                .code(generateOrderCode())
                .customer(customer)
                .employee(employee)
                .store(store)
                .totalAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .productRevenue(BigDecimal.ZERO)
                .shippingFee(BigDecimal.ZERO)
                .status(ORDER_STATUS_DRAFT)
                .orderType(ORDER_TYPE_POS)
                .note(request.getNote())
                .customerPaid(BigDecimal.ZERO)
                .createdAt(OffsetDateTime.now())
                .build();

        orderRepository.save(order);
        saveOrderStatusHistory(order, null, ORDER_STATUS_DRAFT);

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PosOrderResponse> getDraftOrders() {
        return orderRepository.findByStatusAndOrderTypeOrderByCreatedAtDesc(
                        ORDER_STATUS_DRAFT,
                        ORDER_TYPE_POS
                )
                .stream()
                .map(this::mapToOrderResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PosOrderResponse getOrderDetail(Long orderId) {
        return mapToOrderResponse(getOrderOrThrow(orderId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PosProductSearchResponse> searchProducts(String keyword) {
        String safeKeyword = keyword == null ? "" : keyword.trim();

        List<ProductVariant> variants = safeKeyword.isBlank()
                ? productVariantRepository.findAllActiveWithAttributes()
                : productVariantRepository.searchForPos(safeKeyword);

        return variants.stream()
                .filter(this::isSellableVariant)
                .sorted(Comparator.comparingInt(this::posStockSortRank))
                .map(this::mapToProductSearchResponse)
                .toList();
    }

    @Override
    @Transactional
    public PosOrderResponse addItem(Long orderId, PosAddItemRequest request) {
        Order order = getDraftOrderOrThrow(orderId);

        int addQty = request.getQuantity() == null ? 0 : request.getQuantity();
        if (addQty <= 0) {
            throw new IllegalArgumentException("Số lượng thêm phải lớn hơn 0");
        }

        ProductVariant variant = getLockedVariantOrThrow(request.getProductVariantId());

        if (!isSellableVariant(variant)) {
            throw new IllegalArgumentException("Sản phẩm không khả dụng để bán.");
        }

        Integer currentStock   = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
        int activeReserved     = stockReservationService.getActiveReservedQuantity(variant.getId());
        int availableStock     = currentStock - activeReserved;
        if (availableStock < addQty) {
            String msg = activeReserved > 0 && currentStock >= addQty
                    ? "Sản phẩm đang được giữ bởi đơn thanh toán online, tồn kho khả dụng không đủ."
                    : "Sản phẩm đang hết hàng hoặc không đủ tồn kho.";
            throw new IllegalArgumentException(msg);
        }

        Optional<OrderItem> existingItemOpt =
                orderItemRepository.findByOrder_IdAndProductVariant_Id(
                        orderId,
                        request.getProductVariantId()
                );

        if (existingItemOpt.isPresent()) {
            OrderItem existingItem = existingItemOpt.get();
            existingItem.setQuantity(existingItem.getQuantity() + addQty);
            applyCurrentPriceSnapshot(existingItem, variant);
            orderItemRepository.save(existingItem);
        } else {
            ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
            BigDecimal unitPrice = defaultZero(price.getUnitPrice());
            BigDecimal originalPrice = defaultZero(price.getOriginalPrice());
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(addQty));
            OrderItem newItem = OrderItem.builder()
                    .order(order)
                    .productVariant(variant)
                    .quantity(addQty)
                    .priceAtPurchase(unitPrice)
                    .originalPriceAtPurchase(originalPrice)
                    .productDiscountPercent(defaultZero(price.getDiscountPercent()))
                    .productDiscountAmount(originalPrice.subtract(unitPrice).multiply(BigDecimal.valueOf(addQty)))
                    .promotionId(price.getPromotionId())
                    .lineTotal(lineTotal)
                    .costPriceAtPurchase(defaultZero(variant.getCostPrice()))
                    .build();

            orderItemRepository.save(newItem);
        }

        createInventoryTransaction(
                variant,
                order.getStore(),
                addQty,
                INVENTORY_OUT,
                "POS-RESERVE-ADD-" + order.getId()
        );

        recalculateOrderAmounts(order);
        orderRepository.save(order);

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional
    public PosOrderResponse updateItem(Long orderId, Long itemId, PosUpdateItemRequest request) {
        Order order = getDraftOrderOrThrow(orderId);

        OrderItem item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sản phẩm trong hóa đơn"));

        validateItemBelongsToOrder(item, orderId);

        int newQty = request.getQuantity() == null ? 0 : request.getQuantity();
        if (newQty <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }

        ProductVariant variant = getLockedVariantOrThrow(item.getProductVariant().getId());

        int oldQty = item.getQuantity();
        int delta = newQty - oldQty;

        if (delta > 0) {
            Integer currentStock  = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            int activeReserved    = stockReservationService.getActiveReservedQuantity(variant.getId());
            int availableStock    = currentStock - activeReserved;
            if (availableStock < delta) {
                String msg = activeReserved > 0 && currentStock >= delta
                        ? "Sản phẩm đang được giữ bởi đơn thanh toán online, tồn kho khả dụng không đủ."
                        : "Sản phẩm đang hết hàng hoặc không đủ tồn kho.";
                throw new IllegalArgumentException(msg);
            }

            createInventoryTransaction(
                    variant,
                    order.getStore(),
                    delta,
                    INVENTORY_OUT,
                    "POS-RESERVE-UP-" + order.getId()
            );
        } else if (delta < 0) {
            int returnQty = Math.abs(delta);

            createInventoryTransaction(
                    variant,
                    order.getStore(),
                    returnQty,
                    INVENTORY_IN,
                    "POS-RESERVE-DOWN-" + order.getId()
            );
        }

        item.setQuantity(newQty);
        applyCurrentPriceSnapshot(item, variant);
        orderItemRepository.save(item);

        recalculateOrderAmounts(order);
        orderRepository.save(order);

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional
    public PosOrderResponse removeItem(Long orderId, Long itemId) {
        Order order = getDraftOrderOrThrow(orderId);

        OrderItem item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sản phẩm trong hóa đơn"));

        validateItemBelongsToOrder(item, orderId);

        ProductVariant variant = getLockedVariantOrThrow(item.getProductVariant().getId());

        createInventoryTransaction(
                variant,
                order.getStore(),
                item.getQuantity(),
                INVENTORY_IN,
                "POS-RESERVE-REMOVE-" + order.getId()
        );

        orderItemRepository.delete(item);

        recalculateOrderAmounts(order);
        orderRepository.save(order);

        return mapToOrderResponse(order);
    }

    @Override
    public PosOrderResponse assignCustomer(Long orderId, PosAssignCustomerRequest request) {
        Order order = getDraftOrderOrThrow(orderId);

        if (request.getCustomerId() == null) {
            order.setCustomer(null);
        } else {
            Customer customer = customerRepository.findById(request.getCustomerId().longValue())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách hàng"));
            order.setCustomer(customer);
        }

        orderRepository.save(order);
        return mapToOrderResponse(order);
    }

    @Override
    public PosOrderResponse quickCreateCustomerAndAssign(
            Long orderId,
            PosQuickCreateCustomerRequest request
    ) {
        Order order = getDraftOrderOrThrow(orderId);

        String fullName = safeTrim(request.getFullName());
        String phone = normalizePhone(request.getPhone());
        String address = safeTrim(request.getAddress());

        if (fullName == null || fullName.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập họ tên.");
        }

        if (!isValidPersonName(fullName)) {
            throw new IllegalArgumentException(
                    fullName.length() < 2
                            ? "Họ tên phải có ít nhất 2 ký tự."
                            : "Họ tên không hợp lệ."
            );
        }

        if (phone == null || phone.isBlank() || !phone.matches(VIETNAM_PHONE_REGEX)) {
            throw new IllegalArgumentException(
                    phone == null || phone.isBlank()
                            ? "Vui lòng nhập số điện thoại."
                            : "Số điện thoại không hợp lệ."
            );
        }

        if (!isValidOptionalAddress(address)) {
            throw new IllegalArgumentException(
                    address != null && address.length() < 5
                            ? "Địa chỉ chi tiết phải có ít nhất 5 ký tự."
                            : "Địa chỉ chi tiết không hợp lệ."
            );
        }

        UserProfile userProfile = userProfileRepository.findByPhone(phone)
                .map(existingProfile -> {
                    boolean changed = false;

                    if (existingProfile.getFullName() == null
                            || existingProfile.getFullName().isBlank()) {
                        existingProfile.setFullName(fullName);
                        changed = true;
                    }

                    if (address != null && !address.isBlank()) {
                        if (existingProfile.getAddress() == null
                                || !address.equals(existingProfile.getAddress())) {
                            existingProfile.setAddress(address);
                            changed = true;
                        }
                    }

                    if (existingProfile.getIsActive() == null
                            || !existingProfile.getIsActive()) {
                        existingProfile.setIsActive(true);
                        changed = true;
                    }

                    return changed ? userProfileRepository.save(existingProfile) : existingProfile;
                })
                .orElseGet(() -> userProfileRepository.save(
                        UserProfile.builder()
                                .fullName(fullName)
                                .phone(phone)
                                .address(address)
                                .isActive(true)
                                .build()
                ));

        Customer customer = customerRepository.findByUserProfileId(userProfile.getId())
                .orElseGet(() -> customerRepository.save(
                        Customer.builder()
                                .userProfile(userProfile)
                                .code(generateCustomerCode())
                                .loyaltyPoints(0)
                                .customerType("RETAIL")
                                .build()
                ));

        order.setCustomer(customer);
        orderRepository.save(order);

        return mapToOrderResponse(order);
    }

    @Override
    public PosOrderResponse checkout(Long orderId, PosCheckoutRequest request) {
        Order order = getDraftOrderOrThrow(orderId);

        List<OrderItem> items = orderItemRepository.findByOrder_Id(orderId);
        if (items.isEmpty()) {
            throw new IllegalArgumentException("Hóa đơn chưa có sản phẩm");
        }

        validateReservedDraftItems(items);
        refreshOrderItemPrices(items);

        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.getPaymentMethodId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phương thức thanh toán"));

        String paymentCode = paymentMethod.getCode() == null
                ? ""
                : paymentMethod.getCode().trim().toUpperCase();

        if (!"CASH".equals(paymentCode)) {
            throw new IllegalArgumentException(
                    "Checkout mặc định chỉ dùng cho thanh toán tiền mặt. VNPAY dùng endpoint riêng."
            );
        }

        recalculateOrderAmounts(order);
        BigDecimal totalAmount = defaultZero(order.getTotalAmount());

        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedVoucherCode = null;

        boolean hasCoupon = request.getCouponId() != null;
        boolean hasPromotion = request.getPromotionId() != null;

        if (hasPromotion) {
            throw new IllegalArgumentException("Khuyến mãi sản phẩm không được áp dụng như mã giảm giá đơn hàng");
        }

        if (hasCoupon) {
            if (order.getCustomer() == null) {
                throw new IllegalArgumentException("Vui lòng chọn khách hàng để áp dụng mã giảm giá.");
            }

            Coupon coupon = couponRepository.findById(request.getCouponId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy coupon"));

            if (!isCouponApplicable(coupon, order, totalAmount)) {
                throw new IllegalArgumentException("Coupon không còn hợp lệ hoặc không đủ điều kiện áp dụng");
            }

            discountAmount = calculateDiscountAmount(
                    totalAmount,
                    coupon.getDiscountType(),
                    coupon.getDiscountValue(),
                    coupon.getMaxDiscountAmount()
            );
            appliedVoucherCode = coupon.getCode();
        }

        if (discountAmount.compareTo(totalAmount) > 0) {
            throw new IllegalArgumentException("Giảm giá không được lớn hơn tổng tiền hàng");
        }

        BigDecimal finalAmount = totalAmount.subtract(discountAmount);
        BigDecimal customerPaid = defaultZero(request.getCustomerPaid());

        if (customerPaid.compareTo(finalAmount) < 0) {
            throw new IllegalArgumentException("Tiền khách trả không đủ");
        }

        order.setDiscountAmount(discountAmount);
        order.setProductRevenue(totalAmount.subtract(discountAmount).max(BigDecimal.ZERO));
        order.setVoucherCode(appliedVoucherCode);
        order.setCustomerPaid(customerPaid);
        order.setNote(request.getNote() != null ? request.getNote() : order.getNote());
        order.setStatus(ORDER_STATUS_COMPLETED);
        orderRepository.save(order);

        Payment payment = Payment.builder()
                .order(order)
                .paymentMethod(paymentMethod)
                .amount(finalAmount)
                .status(PAYMENT_STATUS_PAID)
                .transactionCode("CASH-" + order.getId() + "-" + System.currentTimeMillis())
                .paidAt(OffsetDateTime.now())
                .note("Thanh toán tiền mặt tại quầy")
                .build();

        paymentRepository.save(payment);

        saveVoucherUsage(order, request);
        saveOrderStatusHistory(order, ORDER_STATUS_DRAFT, ORDER_STATUS_COMPLETED);

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional
    public void cancelOrder(Long orderId) {
        Order order = getDraftOrderOrThrow(orderId);

        List<OrderItem> items = orderItemRepository.findByOrder_Id(orderId);

        for (OrderItem item : items) {
            ProductVariant variant = getLockedVariantOrThrow(item.getProductVariant().getId());

            createInventoryTransaction(
                    variant,
                    order.getStore(),
                    item.getQuantity(),
                    INVENTORY_IN,
                    "POS-RESERVE-CANCEL-" + order.getId()
            );
        }

        order.setStatus(ORDER_STATUS_CANCELLED);
        orderRepository.save(order);

        saveOrderStatusHistory(order, ORDER_STATUS_DRAFT, ORDER_STATUS_CANCELLED);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PosAvailableDiscountResponse> getAvailableDiscounts(Long orderId) {
        Order order = getDraftOrderOrThrow(orderId);

        List<OrderItem> items = orderItemRepository.findByOrder_Id(orderId);
        BigDecimal subtotal = items.stream()
                .map(item -> defaultZero(item.getPriceAtPurchase())
                        .multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return List.of();
        }

        List<PosAvailableDiscountResponse> results = new ArrayList<>();

        if (order.getCustomer() != null) {
            List<Coupon> coupons = couponRepository.findAvailableCoupons();
            for (Coupon coupon : coupons) {
                results.add(mapCouponToPosDiscountResponse(coupon, order, subtotal));
            }
        }

        results.sort((left, right) -> {
            int eligibleCompare = Boolean.compare(
                    Boolean.TRUE.equals(right.getEligible()),
                    Boolean.TRUE.equals(left.getEligible())
            );
            if (eligibleCompare != 0) {
                return eligibleCompare;
            }

            int discountCompare = defaultZero(right.getEstimatedDiscountAmount())
                    .compareTo(defaultZero(left.getEstimatedDiscountAmount()));
            if (discountCompare != 0) {
                return discountCompare;
            }

            int minOrderCompare = defaultZero(left.getMinOrderValue())
                    .compareTo(defaultZero(right.getMinOrderValue()));
            if (minOrderCompare != 0) {
                return minOrderCompare;
            }

            OffsetDateTime leftEnd = left.getEndDate();
            OffsetDateTime rightEnd = right.getEndDate();
            if (leftEnd != null && rightEnd != null) {
                int endCompare = leftEnd.compareTo(rightEnd);
                if (endCompare != 0) {
                    return endCompare;
                }
            } else if (leftEnd != null) {
                return -1;
            } else if (rightEnd != null) {
                return 1;
            }

            return String.valueOf(left.getCode()).compareTo(String.valueOf(right.getCode()));
        });

        boolean markedBest = false;
        for (PosAvailableDiscountResponse result : results) {
            boolean isBest = !markedBest && Boolean.TRUE.equals(result.getEligible());
            result.setBestVoucher(isBest);
            result.setIsBest(isBest);
            if (isBest) {
                markedBest = true;
            }
        }

        return results;
    }

    private Order getOrderOrThrow(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy hóa đơn"));
    }

    private Order getDraftOrderOrThrow(Long orderId) {
        Order order = getOrderOrThrow(orderId);

        if (!ORDER_STATUS_DRAFT.equals(order.getStatus())) {
            throw new IllegalArgumentException("Chỉ thao tác được với hóa đơn nháp");
        }

        if (!ORDER_TYPE_POS.equals(order.getOrderType())) {
            throw new IllegalArgumentException("Đây không phải hóa đơn POS");
        }

        return order;
    }

    private void validateItemBelongsToOrder(OrderItem item, Long orderId) {
        if (item.getOrder() == null
                || item.getOrder().getId() == null
                || item.getOrder().getId().longValue() != orderId.longValue()) {
            throw new IllegalArgumentException("Sản phẩm không thuộc hóa đơn này");
        }
    }

    private void recalculateOrderAmounts(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrder_Id(order.getId().longValue());

        BigDecimal originalSubtotal = BigDecimal.ZERO;
        BigDecimal productDiscountTotal = BigDecimal.ZERO;
        BigDecimal total = items.stream()
                .map(i -> {
                    BigDecimal lineTotal = defaultZero(i.getLineTotal());
                    if (lineTotal.compareTo(BigDecimal.ZERO) == 0) {
                        lineTotal = defaultZero(i.getPriceAtPurchase())
                                .multiply(BigDecimal.valueOf(i.getQuantity()));
                        i.setLineTotal(lineTotal);
                    }
                    return lineTotal;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        for (OrderItem item : items) {
            BigDecimal originalPrice = defaultZero(item.getOriginalPriceAtPurchase());
            if (originalPrice.compareTo(BigDecimal.ZERO) == 0) {
                originalPrice = defaultZero(item.getPriceAtPurchase());
            }
            BigDecimal itemOriginalSubtotal = originalPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
            originalSubtotal = originalSubtotal.add(itemOriginalSubtotal);
            productDiscountTotal = productDiscountTotal.add(itemOriginalSubtotal.subtract(defaultZero(item.getLineTotal())));
        }

        order.setTotalAmount(total);
        order.setOriginalSubtotal(originalSubtotal);
        order.setProductDiscountTotal(productDiscountTotal);
        order.setSubtotalBeforeVoucher(total);
        order.setProductRevenue(total.subtract(defaultZero(order.getDiscountAmount())).max(BigDecimal.ZERO));

        if (order.getDiscountAmount() == null) {
            order.setDiscountAmount(BigDecimal.ZERO);
        }

        if (order.getShippingFee() == null) {
            order.setShippingFee(BigDecimal.ZERO);
        }

        if (order.getCustomerPaid() == null) {
            order.setCustomerPaid(BigDecimal.ZERO);
        }
    }

    private void applyCurrentPriceSnapshot(OrderItem item, ProductVariant variant) {
        ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
        BigDecimal unitPrice = defaultZero(price.getUnitPrice());
        BigDecimal originalPrice = defaultZero(price.getOriginalPrice());
        BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());

        item.setPriceAtPurchase(unitPrice);
        item.setOriginalPriceAtPurchase(originalPrice);
        item.setProductDiscountPercent(defaultZero(price.getDiscountPercent()));
        item.setProductDiscountAmount(originalPrice.subtract(unitPrice).multiply(quantity));
        item.setPromotionId(price.getPromotionId());
        item.setLineTotal(unitPrice.multiply(quantity));
        item.setCostPriceAtPurchase(defaultZero(variant.getCostPrice()));
    }

    private PosOrderResponse mapToOrderResponse(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrder_Id(order.getId().longValue());

        BigDecimal totalAmount = defaultZero(order.getTotalAmount());
        BigDecimal discountAmount = defaultZero(order.getDiscountAmount());
        BigDecimal shippingFee = defaultZero(order.getShippingFee());
        BigDecimal finalAmount = totalAmount.subtract(discountAmount).add(shippingFee);
        BigDecimal customerPaid = defaultZero(order.getCustomerPaid());
        BigDecimal changeAmount = customerPaid.subtract(finalAmount);

        if (changeAmount.compareTo(BigDecimal.ZERO) < 0) {
            changeAmount = BigDecimal.ZERO;
        }

        String customerName = null;
        if (order.getCustomer() != null && order.getCustomer().getUserProfile() != null) {
            customerName = order.getCustomer().getUserProfile().getFullName();
        }

        return PosOrderResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getCode())
                .status(order.getStatus())
                .customerId(order.getCustomer() != null ? order.getCustomer().getId() : null)
                .customerName(customerName)
                .employeeId(order.getEmployee() != null ? order.getEmployee().getId() : null)
                .storeId(order.getStore() != null ? order.getStore().getId() : null)
                .totalAmount(totalAmount)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .customerPaid(customerPaid)
                .changeAmount(changeAmount)
                .voucherCode(order.getVoucherCode())
                .orderType(order.getOrderType())
                .note(order.getNote())
                .items(items.stream().map(this::mapToOrderItemResponse).toList())
                .build();
    }

    private PosOrderItemResponse mapToOrderItemResponse(OrderItem item) {
        ProductVariant variant = item.getProductVariant();
        Product product = variant.getProduct();

        BigDecimal price = defaultZero(item.getPriceAtPurchase());
        BigDecimal lineTotal = defaultZero(item.getLineTotal());
        if (lineTotal.compareTo(BigDecimal.ZERO) == 0) {
            lineTotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));
        }

        String color = extractAttributeValue(variant, "COLOR");
        String size = extractAttributeValue(variant, "SIZE");
        String material = extractAttributeValue(variant, "MATERIAL");

        return PosOrderItemResponse.builder()
                .itemId(item.getId())
                .productVariantId(variant.getId())
                .variantCode(variant.getCode())
                .barcode(variant.getBarcode())
                .productName(product != null ? product.getName() : null)
                .color(color)
                .size(size)
                .material(material)
                .price(price)
                .quantity(item.getQuantity())
                .lineTotal(lineTotal)
                .stockQuantity(variant.getStockQuantity())
                .imageUrl(getImageUrl(variant))
                .build();
    }

    private PosProductSearchResponse mapToProductSearchResponse(ProductVariant variant) {
        Product product = variant.getProduct();

        String color = extractAttributeValue(variant, "COLOR");
        String size = extractAttributeValue(variant, "SIZE");
        String material = extractAttributeValue(variant, "MATERIAL");
        ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
        BigDecimal originalPrice = defaultZero(price.getOriginalPrice());
        BigDecimal finalPrice = defaultZero(price.getUnitPrice());
        BigDecimal discountAmount = originalPrice.subtract(finalPrice).max(BigDecimal.ZERO);
        Integer stockQuantity = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();

        return PosProductSearchResponse.builder()
                .productId(product != null ? product.getId() : null)
                .productVariantId(variant.getId())
                .variantCode(variant.getCode())
                .barcode(variant.getBarcode())
                .productCode(product != null ? product.getCode() : null)
                .productName(product != null ? product.getName() : null)
                .color(color)
                .size(size)
                .material(material)
                .sellingPrice(finalPrice)
                .originalPrice(originalPrice)
                .salePrice(price.getSalePrice())
                .finalPrice(finalPrice)
                .discountAmount(discountAmount)
                .discountPercent(price.getDiscountPercent())
                .promotionId(price.getPromotionId())
                .stockQuantity(stockQuantity)
                .inStock(stockQuantity > 0)
                .imageUrl(getImageUrl(variant))
                .build();
    }

    private String getImageUrl(ProductVariant variant) {
        Optional<ProductImage> variantImage =
                productImageRepository
                        .findFirstByProductVariant_IdOrderByIsPrimaryDescDisplayOrderAsc(
                                variant.getId().longValue()
                        );

        if (variantImage.isPresent()) {
            return variantImage.get().getImageUrl();
        }

        if (variant.getProduct() != null) {
            return productImageRepository
                    .findFirstByProduct_IdOrderByIsPrimaryDescDisplayOrderAsc(
                            variant.getProduct().getId().longValue()
                    )
                    .map(ProductImage::getImageUrl)
                    .orElse(null);
        }

        return null;
    }

    private String extractAttributeValue(ProductVariant variant, String attributeCode) {
        if (variant.getVariantAttributeValues() == null) {
            return null;
        }

        return variant.getVariantAttributeValues().stream()
                .map(VariantAttributeValue::getAttributeValue)
                .filter(av -> av != null && av.getAttribute() != null)
                .filter(av -> attributeCode.equalsIgnoreCase(av.getAttribute().getCode()))
                .map(AttributeValue::getValue)
                .findFirst()
                .orElse(null);
    }

    private boolean isSellableVariant(ProductVariant variant) {
        return variant != null
                && variant.getDeletedAt() == null
                && Boolean.TRUE.equals(variant.getIsActive())
                && variant.getProduct() != null
                && variant.getProduct().getDeletedAt() == null
                && Boolean.TRUE.equals(variant.getProduct().getIsActive());
    }

    private int posStockSortRank(ProductVariant variant) {
        int stockQuantity = variant == null || variant.getStockQuantity() == null
                ? 0
                : variant.getStockQuantity();

        return stockQuantity > 0 ? 0 : 1;
    }

    private void validateReservedDraftItems(List<OrderItem> items) {
        for (OrderItem item : items) {
            ProductVariant variant = item.getProductVariant();

            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new IllegalArgumentException("Số lượng sản phẩm trong hóa đơn không hợp lệ");
            }

            if (!isSellableVariant(variant)) {
                throw new IllegalArgumentException("Sản phẩm trong hóa đơn không còn khả dụng để bán");
            }

            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            if (currentStock < 0) {
                throw new IllegalArgumentException("Tồn kho sản phẩm không hợp lệ");
            }
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

    private String generateOrderCode() {
        return "POS-" + System.currentTimeMillis();
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizePhone(String value) {
        if (value == null) {
            return null;
        }

        return value.replaceAll("\\s+", "").trim();
    }

    private boolean isValidPersonName(String value) {
        if (value == null) {
            return false;
        }

        String text = value.trim();
        return text.length() >= 2
                && text.length() <= 100
                && !text.matches("^\\d+$")
                && !containsDangerousText(text);
    }

    private boolean isValidOptionalAddress(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }

        String text = value.trim();
        return text.length() >= 5
                && text.length() <= 255
                && !text.matches("^\\d+$")
                && !containsDangerousText(text);
    }

    private boolean containsDangerousText(String value) {
        return value != null
                && (value.matches(".*[<>{}\\[\\]].*")
                || value.toLowerCase().contains("script"));
    }

    private String generateCustomerCode() {
        Optional<Customer> lastCustomerOpt = customerRepository.findTopByOrderByIdDesc();

        if (lastCustomerOpt.isEmpty()) {
            return "KH0001";
        }

        String lastCode = lastCustomerOpt.get().getCode();

        try {
            if (lastCode != null && lastCode.startsWith("KH")) {
                int number = Integer.parseInt(lastCode.substring(2));
                return String.format("KH%04d", number + 1);
            }
        } catch (Exception ignored) {
        }

        return "KH" + System.currentTimeMillis();
    }


    private boolean isCouponApplicable(Coupon coupon, Order order, BigDecimal subtotal) {
        if (coupon == null || order.getCustomer() == null) {
            return false;
        }

        if (!Boolean.TRUE.equals(coupon.getIsActive())) {
            return false;
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (coupon.getStartDate() != null && now.isBefore(coupon.getStartDate())) {
            return false;
        }

        if (coupon.getEndDate() != null && now.isAfter(coupon.getEndDate())) {
            return false;
        }

        long totalUsedCount = couponUsageRepository.countValidUsagesByCouponId(coupon.getId());
        if (coupon.getUsageLimit() != null
                && coupon.getUsageLimit() > 0
                && totalUsedCount >= coupon.getUsageLimit()) {
            return false;
        }

        if (coupon.getDiscountValue() == null || coupon.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        String normalizedType = coupon.getDiscountType() == null ? "" : coupon.getDiscountType().trim().toUpperCase();
        if (("PERCENTAGE".equals(normalizedType) || "PERCENT".equals(normalizedType))
                && coupon.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            return false;
        }

        if (coupon.getMinOrderValue() != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            return false;
        }

        return true;
    }

    private String getCouponIneligibleReason(Coupon coupon, Order order, BigDecimal subtotal, long totalUsedCount) {
        if (coupon == null) {
            return "Mã giảm giá không hợp lệ";
        }

        if (order.getCustomer() == null) {
            return "Vui lòng chọn khách hàng để áp dụng mã giảm giá.";
        }

        if (!Boolean.TRUE.equals(coupon.getIsActive())) {
            return "Mã đang bị tắt";
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (coupon.getStartDate() != null && now.isBefore(coupon.getStartDate())) {
            return "Mã chưa đến ngày áp dụng";
        }

        if (coupon.getEndDate() != null && now.isAfter(coupon.getEndDate())) {
            return "Mã đã hết hạn";
        }

        if (coupon.getUsageLimit() != null
                && coupon.getUsageLimit() > 0
                && totalUsedCount >= coupon.getUsageLimit()) {
            return "Mã đã hết lượt sử dụng";
        }

        if (coupon.getMinOrderValue() != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            return "Đơn hàng chưa đạt giá trị tối thiểu";
        }

        if (coupon.getDiscountValue() == null || coupon.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            return "Giá trị giảm không hợp lệ";
        }

        String normalizedType = coupon.getDiscountType() == null ? "" : coupon.getDiscountType().trim().toUpperCase();
        if (("PERCENTAGE".equals(normalizedType) || "PERCENT".equals(normalizedType))
                && coupon.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            return "Giá trị giảm phần trăm không hợp lệ";
        }

        return null;
    }

    private PosAvailableDiscountResponse mapCouponToPosDiscountResponse(
            Coupon coupon,
            Order order,
            BigDecimal subtotal
    ) {
        long totalUsedCount = couponUsageRepository.countValidUsagesByCouponId(coupon.getId());

        int issuedQuantity = coupon.getUsageLimit() != null ? coupon.getUsageLimit() : 0;
        int remainingCount = coupon.getUsageLimit() != null
                ? Math.max(coupon.getUsageLimit() - (int) totalUsedCount, 0)
                : 0;
        String ineligibleReason = getCouponIneligibleReason(coupon, order, subtotal, totalUsedCount);
        boolean eligible = ineligibleReason == null;
        BigDecimal estimatedDiscountAmount = eligible
                ? calculateDiscountAmount(
                        subtotal,
                        coupon.getDiscountType(),
                        coupon.getDiscountValue(),
                        coupon.getMaxDiscountAmount()
                )
                : BigDecimal.ZERO;

        double usedPercent = 0.0;
        double remainingPercent = 0.0;

        if (issuedQuantity > 0) {
            usedPercent = BigDecimal.valueOf(totalUsedCount)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(issuedQuantity), 2, RoundingMode.HALF_UP)
                    .doubleValue();

            remainingPercent = BigDecimal.valueOf(remainingCount)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(issuedQuantity), 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        return PosAvailableDiscountResponse.builder()
                .voucherType("COUPON")
                .id(coupon.getId())
                .code(coupon.getCode())
                .name(coupon.getCode())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .minOrderValue(coupon.getMinOrderValue())
                .maxDiscountAmount(coupon.getMaxDiscountAmount())
                .issuedQuantity(issuedQuantity)
                .usedCount(totalUsedCount)
                .remainingCount(remainingCount)
                .remainingUses(coupon.getUsageLimit() != null ? remainingCount : null)
                .usedPercent(usedPercent)
                .remainingPercent(remainingPercent)
                .startDate(coupon.getStartDate())
                .endDate(coupon.getEndDate())
                .isActive(coupon.getIsActive())
                .estimatedDiscountAmount(estimatedDiscountAmount)
                .eligible(eligible)
                .ineligibleReason(ineligibleReason)
                .bestVoucher(false)
                .isBest(false)
                .build();
    }


    private BigDecimal calculateDiscountAmount(
            BigDecimal subtotal,
            String discountType,
            BigDecimal discountValue,
            BigDecimal maxDiscountAmount
    ) {
        if (subtotal == null || discountType == null || discountValue == null) {
            return BigDecimal.ZERO;
        }

        String normalizedDiscountType = discountType.trim().toUpperCase();

        BigDecimal discountAmount = BigDecimal.ZERO;

        if ("PERCENTAGE".equals(normalizedDiscountType) || "PERCENT".equals(normalizedDiscountType)) {
            discountAmount = subtotal.multiply(discountValue)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            if (maxDiscountAmount != null
                    && discountAmount.compareTo(maxDiscountAmount) > 0) {
                discountAmount = maxDiscountAmount;
            }
        } else if ("FIXED_AMOUNT".equals(normalizedDiscountType) || "FIXED".equals(normalizedDiscountType)) {
            discountAmount = discountValue;
        }

        if (discountAmount.compareTo(subtotal) > 0) {
            return subtotal;
        }

        return discountAmount;
    }

    private void saveVoucherUsage(Order order, PosCheckoutRequest request) {
        if (request.getCouponId() == null) {
            return;
        }

        if (order.getCustomer() == null) {
            throw new IllegalArgumentException("Vui lòng chọn khách hàng để áp dụng mã giảm giá.");
        }

        CouponUsage.CouponUsageBuilder builder = CouponUsage.builder()
                .customer(order.getCustomer())
                .order(order)
                .usedAt(OffsetDateTime.now());

        if (request.getCouponId() != null) {
            Coupon coupon = couponRepository.findById(request.getCouponId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy coupon"));
            builder.coupon(coupon);
        }

        couponUsageRepository.save(builder.build());
    }

    private ProductVariant getLockedVariantOrThrow(Long variantId) {
        return productVariantRepository.findByIdForUpdate(variantId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy biến thể sản phẩm"));
    }

    private void decreaseVariantStock(ProductVariant variant, int quantity) {
        int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();

        if (quantity <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }

        if (currentStock < quantity) {
            throw new IllegalArgumentException("Sản phẩm đang hết hàng hoặc không đủ tồn kho.");
        }

        variant.setStockQuantity(currentStock - quantity);
        productVariantRepository.save(variant);
    }

    private void increaseVariantStock(ProductVariant variant, int quantity) {
        int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();

        if (quantity <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }

        variant.setStockQuantity(currentStock + quantity);
        productVariantRepository.save(variant);
    }

    private void createInventoryTransaction(
            ProductVariant variant,
            Store store,
            int quantity,
            String transactionType,
            String codePrefix
    ) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setReferenceCode(codePrefix + "-" + System.currentTimeMillis());
        transaction.setProductVariant(variant);
        transaction.setStore(store);
        transaction.setQuantity(quantity);
        transaction.setTransactionType(transactionType);
        transaction.setCreatedAt(LocalDateTime.now());

        inventoryTransactionRepository.saveAndFlush(transaction);
        entityManager.refresh(variant);
    }

    @Override
    @Transactional(readOnly = true)
    public PosCheckoutValidationResponse validateCheckout(Long orderId, Long couponId) {
        Order order = getDraftOrderOrThrow(orderId);
        List<OrderItem> items = orderItemRepository.findByOrder_Id(orderId);

        List<PosCheckoutValidationResponse.ItemIssue> issues = new ArrayList<>();
        boolean hasBlocking = false;
        boolean hasChanges = false;

        for (OrderItem item : items) {
            ProductVariant variant = item.getProductVariant();
            Product product = variant != null ? variant.getProduct() : null;

            if (variant == null || product == null) {
                issues.add(PosCheckoutValidationResponse.ItemIssue.builder()
                        .issueType("PRODUCT_INACTIVE")
                        .severity("BLOCKING")
                        .message("Sản phẩm trong hóa đơn không còn tồn tại")
                        .build());
                hasBlocking = true;
                continue;
            }

            String productName = product.getName();
            String variantCode = variant.getCode();
            Long variantId = variant.getId();

            if (product.getDeletedAt() != null || !Boolean.TRUE.equals(product.getIsActive())) {
                issues.add(PosCheckoutValidationResponse.ItemIssue.builder()
                        .variantId(variantId)
                        .productName(productName)
                        .variantCode(variantCode)
                        .issueType("PRODUCT_INACTIVE")
                        .severity("BLOCKING")
                        .message("Sản phẩm \"" + productName + "\" đã ngừng bán")
                        .build());
                hasBlocking = true;
                continue;
            }

            if (variant.getDeletedAt() != null || !Boolean.TRUE.equals(variant.getIsActive())) {
                issues.add(PosCheckoutValidationResponse.ItemIssue.builder()
                        .variantId(variantId)
                        .productName(productName)
                        .variantCode(variantCode)
                        .issueType("VARIANT_INACTIVE")
                        .severity("BLOCKING")
                        .message("Biến thể \"" + variantCode + "\" đã ngừng bán")
                        .build());
                hasBlocking = true;
                continue;
            }

            int currentStock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            if (currentStock < 0) {
                issues.add(PosCheckoutValidationResponse.ItemIssue.builder()
                        .variantId(variantId)
                        .productName(productName)
                        .variantCode(variantCode)
                        .issueType("STOCK_INSUFFICIENT")
                        .severity("BLOCKING")
                        .requestedQty(item.getQuantity())
                        .availableQty(currentStock)
                        .message("Tồn kho biến thể \"" + variantCode + "\" không hợp lệ (âm)")
                        .build());
                hasBlocking = true;
                continue;
            }

            ProductPriceResponse currentPrice = productPriceService.calculateCurrentPrice(variant);
            BigDecimal currentUnitPrice = defaultZero(currentPrice.getUnitPrice());
            BigDecimal savedUnitPrice = defaultZero(item.getPriceAtPurchase());

            if (currentUnitPrice.compareTo(savedUnitPrice) != 0) {
                boolean promotionChanged = item.getPromotionId() != null
                        ? !item.getPromotionId().equals(currentPrice.getPromotionId())
                        : currentPrice.getPromotionId() != null;

                String issueType = promotionChanged ? "PROMOTION_CHANGED" : "PRICE_CHANGED";
                issues.add(PosCheckoutValidationResponse.ItemIssue.builder()
                        .variantId(variantId)
                        .productName(productName)
                        .variantCode(variantCode)
                        .issueType(issueType)
                        .severity("REQUIRES_CONFIRMATION")
                        .oldPrice(savedUnitPrice)
                        .newPrice(currentUnitPrice)
                        .requestedQty(item.getQuantity())
                        .message("Giá của \"" + productName + " - " + variantCode + "\" đã thay đổi từ "
                                + savedUnitPrice + " → " + currentUnitPrice)
                        .build());
                hasChanges = true;
            }
        }

        // Calculate newSubtotal using CURRENT prices from DB (not stored draft prices)
        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderItem item : items) {
            ProductVariant variant = item.getProductVariant();
            if (variant != null && isSellableVariant(variant)) {
                ProductPriceResponse freshPrice = productPriceService.calculateCurrentPrice(variant);
                subtotal = subtotal.add(
                        defaultZero(freshPrice.getUnitPrice())
                                .multiply(BigDecimal.valueOf(item.getQuantity()))
                );
            }
        }

        BigDecimal couponDiscount = BigDecimal.ZERO;

        if (couponId != null) {
            Coupon coupon = couponRepository.findById(couponId).orElse(null);
            if (coupon == null) {
                issues.add(PosCheckoutValidationResponse.ItemIssue.builder()
                        .issueType("COUPON_INVALID")
                        .severity("BLOCKING")
                        .message("Mã giảm giá không tồn tại")
                        .build());
                hasBlocking = true;
            } else if (!isCouponApplicable(coupon, order, subtotal)) {
                long usedCount = couponUsageRepository.countValidUsagesByCouponId(couponId);
                String reason = getCouponIneligibleReason(coupon, order, subtotal, usedCount);
                issues.add(PosCheckoutValidationResponse.ItemIssue.builder()
                        .issueType("COUPON_INVALID")
                        .severity("BLOCKING")
                        .message(reason != null ? reason : "Mã giảm giá không còn hợp lệ")
                        .build());
                hasBlocking = true;
            } else {
                couponDiscount = calculateDiscountAmount(
                        subtotal,
                        coupon.getDiscountType(),
                        coupon.getDiscountValue(),
                        coupon.getMaxDiscountAmount()
                );
            }
        }

        BigDecimal finalTotal = subtotal.subtract(couponDiscount).max(BigDecimal.ZERO);
        boolean valid = !hasBlocking;

        String message;
        if (hasBlocking) {
            message = "Có vấn đề nghiêm trọng cần xử lý trước khi thanh toán";
        } else if (hasChanges) {
            message = "Có thay đổi về giá/khuyến mãi, vui lòng xác nhận trước khi thanh toán";
        } else {
            message = "Hóa đơn hợp lệ, có thể thanh toán";
        }

        return PosCheckoutValidationResponse.builder()
                .valid(valid)
                .hasChanges(hasChanges)
                .message(message)
                .issues(issues)
                .newSubtotal(subtotal)
                .couponDiscount(couponDiscount)
                .finalTotal(finalTotal)
                .build();
    }

    private void refreshOrderItemPrices(List<OrderItem> items) {
        for (OrderItem item : items) {
            ProductVariant variant = item.getProductVariant();
            if (variant == null) continue;
            ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
            BigDecimal unitPrice = defaultZero(price.getUnitPrice());
            BigDecimal originalPrice = defaultZero(price.getOriginalPrice());
            BigDecimal qty = BigDecimal.valueOf(item.getQuantity());
            item.setPriceAtPurchase(unitPrice);
            item.setOriginalPriceAtPurchase(originalPrice);
            item.setProductDiscountPercent(defaultZero(price.getDiscountPercent()));
            item.setProductDiscountAmount(originalPrice.subtract(unitPrice).multiply(qty));
            item.setPromotionId(price.getPromotionId());
            item.setLineTotal(unitPrice.multiply(qty));
            item.setCostPriceAtPurchase(defaultZero(variant.getCostPrice()));
        }
        orderItemRepository.saveAll(items);
    }

    @Scheduled(cron = "0 59 23 * * ?")
    public void runEndOfDayJobToRemoveDraft() {
        System.out.println("Chạy job cuối ngày: " + LocalDateTime.now());

        List<Order> orders = orderRepository.findByOrderTypeAndStatus(
                ORDER_TYPE_POS,
                ORDER_STATUS_DRAFT
        );

        for (Order order : orders) {
            cancelDraftAndReleaseReservedStock(order);
        }
    }

    private void cancelDraftAndReleaseReservedStock(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrder_Id(order.getId());

        for (OrderItem item : items) {
            ProductVariant variant = getLockedVariantOrThrow(item.getProductVariant().getId());

            createInventoryTransaction(
                    variant,
                    order.getStore(),
                    item.getQuantity(),
                    INVENTORY_IN,
                    "POS-RESERVE-CLEANUP-" + order.getId()
            );
        }

        order.setStatus(ORDER_STATUS_CANCELLED);
        orderRepository.save(order);

        saveOrderStatusHistory(order, ORDER_STATUS_DRAFT, ORDER_STATUS_CANCELLED);
    }
}
