package com.vn.backend.service.impl;

import com.vn.backend.config.VnpayConfig;
import com.vn.backend.dto.request.pos.PosCheckoutRequest;
import com.vn.backend.dto.response.pos.PosVnpayCreateResponse;
import com.vn.backend.dto.response.pos.PosVnpayReturnResponse;
import com.vn.backend.entity.Coupon;
import com.vn.backend.entity.CouponUsage;
import com.vn.backend.entity.Order;
import com.vn.backend.entity.OrderItem;
import com.vn.backend.entity.OrderStatusHistory;
import com.vn.backend.entity.Payment;
import com.vn.backend.entity.PaymentMethod;
import com.vn.backend.repository.CouponRepository;
import com.vn.backend.repository.CouponUsageRepository;
import com.vn.backend.repository.OrderItemRepository;
import com.vn.backend.repository.OrderRepository;
import com.vn.backend.repository.OrderStatusHistoryRepository;
import com.vn.backend.repository.PaymentMethodRepository;
import com.vn.backend.repository.PaymentRepository;
import com.vn.backend.util.VnpayUtil;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import com.vn.backend.entity.Customer;
import com.vn.backend.entity.User;
import com.vn.backend.repository.CustomerRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.dto.response.ValidateDiscountResponse;
import com.vn.backend.dto.response.ProductPriceResponse;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.service.DiscountService;
import com.vn.backend.service.ProductPriceService;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class VnpayServiceImpl implements com.vn.backend.service.VnpayService {

    private static final String ORDER_STATUS_DRAFT = "DRAFT";
    private static final String ORDER_STATUS_PENDING = "PENDING";
    private static final String ORDER_STATUS_CONFIRMED = "CONFIRMED";
    private static final String ORDER_STATUS_SHIPPING = "SHIPPING";
    private static final String ORDER_STATUS_COMPLETED = "COMPLETED";
    private static final String ORDER_STATUS_CANCELLED = "CANCELLED";
    private static final String ORDER_TYPE_ONLINE = "ONLINE";

    private static final String PAYMENT_STATUS_PENDING = "PENDING";
    private static final String PAYMENT_STATUS_PAID = "PAID";
    private static final String PAYMENT_STATUS_FAILED = "FAILED";

    private static final String PAYMENT_CODE_VNPAY = "VNPAY";
    private static final ZoneId VNPAY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;


    private final VnpayConfig vnpayConfig;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final OrderInventoryService orderInventoryService;
    private final StockReservationService stockReservationService;
    private final DiscountService discountService;
    private final ProductPriceService productPriceService;


    @Override
    public PosVnpayCreateResponse createPaymentUrl(
            Long orderId,
            PosCheckoutRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy hóa đơn"));

        validateDraftPosOrder(order);
        validateOrderHasItems(orderId);
        List<OrderItem> posItems = orderItemRepository.findByOrder_Id(orderId);
        refreshPosItemPrices(posItems);
        recalculateOrderAmounts(order);

        AppliedDiscount appliedDiscount = applyDiscount(order, request);
        BigDecimal finalAmount = calculateFinalAmount(order);

        if (finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền thanh toán không hợp lệ");
        }

        PaymentMethod paymentMethod = paymentMethodRepository.findByCode(PAYMENT_CODE_VNPAY)
                .orElseThrow(() -> new EntityNotFoundException("Chưa cấu hình payment method VNPAY"));

        String txnRef = generateTxnRef(order.getId());

        Payment payment = Payment.builder()
                .order(order)
                .paymentMethod(paymentMethod)
                .amount(finalAmount)
                .status(PAYMENT_STATUS_PENDING)
                .providerTxnRef(txnRef)
                .note(buildPaymentNote(appliedDiscount))
                .build();
        paymentRepository.save(payment);

        OffsetDateTime now = OffsetDateTime.now(VNPAY_ZONE);

        TreeMap<String, String> vnpParams = VnpayUtil.sortedMap();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        vnpParams.put(
                "vnp_Amount",
                finalAmount.multiply(BigDecimal.valueOf(100))
                        .setScale(0, RoundingMode.HALF_UP)
                        .toPlainString()
        );
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", txnRef);
        vnpParams.put("vnp_OrderInfo", "Thanh toán hóa đơn POS " + order.getCode());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpayConfig.getPosReturnUrl());
        vnpParams.put("vnp_IpAddr", getClientIp(httpServletRequest));
        vnpParams.put("vnp_CreateDate", now.format(VNPAY_DATE_FORMAT));
        vnpParams.put("vnp_ExpireDate", now.plusMinutes(2).format(VNPAY_DATE_FORMAT));

        String hashData = VnpayUtil.buildHashData(vnpParams);
        String secureHash = VnpayUtil.hmacSHA512(vnpayConfig.getHashSecret(), hashData);
        vnpParams.put("vnp_SecureHash", secureHash);

        String paymentUrl = vnpayConfig.getPayUrl() + "?" + VnpayUtil.buildQueryString(vnpParams);

        System.out.println("VNP HASH SECRET = " + vnpayConfig.getHashSecret());
        System.out.println("VNP HASH DATA   = " + hashData);
        System.out.println("VNP SECURE HASH = " + secureHash);
        System.out.println("VNP PAYMENT URL = " + paymentUrl);

        return PosVnpayCreateResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getCode())
                .txnRef(txnRef)
                .paymentUrl(paymentUrl)
                .build();
    }

    @Override
    public PosVnpayReturnResponse handleReturn(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        String transactionNo = params.get("vnp_TransactionNo");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String secureHash = params.get("vnp_SecureHash");

        if (!isValidChecksum(params, secureHash)) {
            return PosVnpayReturnResponse.builder()
                    .success(false)
                    .message("Sai chữ ký bảo mật")
                    .txnRef(txnRef)
                    .transactionNo(transactionNo)
                    .responseCode(responseCode)
                    .build();
        }

        // Lock payment row để tránh race giữa RETURN và IPN
        Payment payment = paymentRepository.findByProviderTxnRefForUpdate(txnRef).orElse(null);
        Long orderId = payment != null && payment.getOrder() != null
                ? payment.getOrder().getId()
                : null;

        boolean vnpaySuccess = isPaymentSuccess(responseCode, transactionStatus);
        boolean actualSuccess = vnpaySuccess;
        String resultMessage;

        /*
         * DEV fallback:
         * Nếu IPN chưa vào được vì đang chạy localhost,
         * RETURN vẫn có thể chốt đơn sau khi đã verify checksum.
         * Production vẫn nên ưu tiên IPN là nguồn cập nhật chính.
         */
        if (payment != null) {
            if (vnpaySuccess) {
                actualSuccess = finalizeSuccessfulPayment(
                        payment,
                        transactionNo,
                        "Thanh toán VNPAY thành công (RETURN)"
                );
                resultMessage = actualSuccess
                        ? "Thanh toán thành công"
                        : MSG_ORDER_CANCELLED_OR_EXPIRED;
            } else {
                markPaymentFailed(
                        payment,
                        transactionNo,
                        responseCode,
                        transactionStatus,
                        "RETURN"
                );
                resultMessage = buildFailureMessage(responseCode, transactionStatus);
            }
        } else {
            resultMessage = vnpaySuccess
                    ? "Thanh toán thành công nhưng không tìm thấy bản ghi payment"
                    : buildFailureMessage(responseCode, transactionStatus);
        }

        return PosVnpayReturnResponse.builder()
                .success(actualSuccess)
                .message(resultMessage)
                .txnRef(txnRef)
                .transactionNo(transactionNo)
                .responseCode(responseCode)
                .orderId(orderId)
                .build();
    }

    @Override
    public String handleIpn(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        String transactionNo = params.get("vnp_TransactionNo");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String secureHash = params.get("vnp_SecureHash");

        if (!isValidChecksum(params, secureHash)) {
            return "{\"RspCode\":\"97\",\"Message\":\"Chữ ký không hợp lệ\"}";
        }

        // Lock payment row để tránh race giữa IPN và RETURN
        Payment payment = paymentRepository.findByProviderTxnRefForUpdate(txnRef).orElse(null);

        if (payment == null) {
            return "{\"RspCode\":\"01\",\"Message\":\"Không tìm thấy đơn hàng\"}";
        }

        if (isPaymentSuccess(responseCode, transactionStatus)) {
            // finalizeSuccessfulPayment trả false khi đơn POS bị hủy.
            // Vẫn trả RspCode "00" để VNPay không retry IPN.
            finalizeSuccessfulPayment(
                    payment,
                    transactionNo,
                    "Thanh toán VNPAY thành công (IPN)"
            );
            return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
        }

        markPaymentFailed(
                payment,
                transactionNo,
                responseCode,
                transactionStatus,
                "IPN"
        );
        return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
    }

    private void validateDraftPosOrder(Order order) {
        if (!ORDER_STATUS_DRAFT.equals(order.getStatus())) {
            throw new IllegalArgumentException("Chỉ hóa đơn nháp mới được tạo thanh toán VNPAY");
        }

        if (order.getOrderType() == null || !"POS".equalsIgnoreCase(order.getOrderType())) {
            throw new IllegalArgumentException("Đây không phải hóa đơn POS");
        }
    }

    private void validateOrderHasItems(Long orderId) {
        List<OrderItem> items = orderItemRepository.findByOrder_Id(orderId);
        if (items.isEmpty()) {
            throw new IllegalArgumentException("Hóa đơn chưa có sản phẩm");
        }
    }

    private void refreshPosItemPrices(List<OrderItem> items) {
        for (OrderItem item : items) {
            com.vn.backend.entity.ProductVariant variant = item.getProductVariant();
            if (variant == null) continue;
            ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
            BigDecimal unitPrice = defaultZero(price.getUnitPrice());
            BigDecimal originalPrice = defaultZero(price.getOriginalPrice());
            BigDecimal qty = BigDecimal.valueOf(item.getQuantity());
            item.setPriceAtPurchase(unitPrice);
            item.setOriginalPriceAtPurchase(originalPrice);
            item.setLineTotal(unitPrice.multiply(qty));
            item.setCostPriceAtPurchase(defaultZero(variant.getCostPrice()));
        }
        orderItemRepository.saveAll(items);
    }

    private void recalculateOrderAmounts(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrder_Id(order.getId());

        BigDecimal totalAmount = items.stream()
                .map(item -> defaultZero(item.getPriceAtPurchase())
                        .multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.setTotalAmount(totalAmount);
        order.setSubtotalBeforeVoucher(totalAmount);
        order.setProductRevenue(totalAmount.subtract(defaultZero(order.getDiscountAmount())).max(BigDecimal.ZERO));

        if (order.getShippingFee() == null) {
            order.setShippingFee(BigDecimal.ZERO);
        }
    }

    private AppliedDiscount applyDiscount(Order order, PosCheckoutRequest request) {
        BigDecimal totalAmount = defaultZero(order.getTotalAmount());
        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedVoucherCode = null;
        String appliedVoucherType = null;

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
            appliedVoucherType = "COUPON";
        }

        if (discountAmount.compareTo(totalAmount) > 0) {
            throw new IllegalArgumentException("Giảm giá không được lớn hơn tổng tiền hàng");
        }

        order.setDiscountAmount(discountAmount);
        order.setVoucherCode(appliedVoucherCode);
        order.setProductRevenue(totalAmount.subtract(discountAmount).max(BigDecimal.ZERO));

        if (request.getNote() != null) {
            order.setNote(request.getNote());
        }

        orderRepository.save(order);

        return new AppliedDiscount(appliedVoucherType, appliedVoucherCode);
    }

    @Override
    public PosVnpayCreateResponse createOnlinePaymentUrl(
            Long orderId,
            Long userId,
            HttpServletRequest httpServletRequest
    ) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn hàng"));

        Customer customer = resolveCustomer(userId);
        validateOnlineOrderOwner(order, customer);
        validateOnlineOrderForVnpay(order);

        Payment payment = paymentRepository
                .findTopByOrder_IdAndPaymentMethod_CodeOrderByIdDesc(orderId, PAYMENT_CODE_VNPAY)
                .orElseThrow(() -> new IllegalArgumentException("Don hang nay khong duoc tao voi phuong thuc VNPAY"));

        if (PAYMENT_STATUS_PAID.equalsIgnoreCase(payment.getStatus())) {
            throw new IllegalArgumentException("Đơn hàng này đã được thanh toán");
        }

        // Release reservation cu neu co (user retry payment)
        stockReservationService.releaseReservations(order.getId(), "RETRY_VNPAY_PAYMENT");

        // Re-validate voucher, recalculate order amounts, and reserve the voucher slot.
        // Throws InvalidRequestException if voucher is now invalid or limit is reached.
        recalculateAndSaveVoucherForVnpay(order, userId);

        // Tao reservation mem 2 phut — kiem tra availableStock truoc khi tao URL
        // Neu khong du hang se throw ngay tai day, khong tao URL
        stockReservationService.createReservationsForVnpay(order, 2);

        String txnRef = generateUniqueTxnRef("ONL", order.getId());

        payment.setProviderTxnRef(txnRef);
        payment.setAmount(defaultZero(order.getTotalAmount()));
        payment.setStatus(PAYMENT_STATUS_PENDING);
        payment.setNote("Khởi tạo thanh toán VNPAY cho đơn online");
        paymentRepository.save(payment);

        OffsetDateTime now = OffsetDateTime.now(VNPAY_ZONE);

        TreeMap<String, String> vnpParams = VnpayUtil.sortedMap();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        vnpParams.put(
                "vnp_Amount",
                defaultZero(order.getTotalAmount())
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(0, RoundingMode.HALF_UP)
                        .toPlainString()
        );
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", txnRef);
        vnpParams.put("vnp_OrderInfo", "Thanh toán đơn hàng online " + order.getCode());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpayConfig.getOnlineReturnUrl());
        vnpParams.put("vnp_IpAddr", getClientIp(httpServletRequest));
        vnpParams.put("vnp_CreateDate", now.format(VNPAY_DATE_FORMAT));
        vnpParams.put("vnp_ExpireDate", now.plusMinutes(2).format(VNPAY_DATE_FORMAT));

        String hashData = VnpayUtil.buildHashData(vnpParams);
        String secureHash = VnpayUtil.hmacSHA512(vnpayConfig.getHashSecret(), hashData);
        vnpParams.put("vnp_SecureHash", secureHash);

        String paymentUrl = vnpayConfig.getPayUrl() + "?" + VnpayUtil.buildQueryString(vnpParams);

        return PosVnpayCreateResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getCode())
                .txnRef(txnRef)
                .paymentUrl(paymentUrl)
                .build();
    }

    @Override
    public PosVnpayReturnResponse handleOnlineReturn(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        String transactionNo = params.get("vnp_TransactionNo");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String secureHash = params.get("vnp_SecureHash");

        if (!isValidChecksum(params, secureHash)) {
            return PosVnpayReturnResponse.builder()
                    .success(false)
                    .message("Sai chữ ký bảo mật")
                    .txnRef(txnRef)
                    .transactionNo(transactionNo)
                    .responseCode(responseCode)
                    .build();
        }

        // Lock payment row để tránh race giữa RETURN và IPN
        Payment payment = paymentRepository.findByProviderTxnRefForUpdate(txnRef).orElse(null);
        Long orderId = payment != null && payment.getOrder() != null
                ? payment.getOrder().getId()
                : null;

        boolean vnpaySuccess = isPaymentSuccess(responseCode, transactionStatus);
        boolean actualSuccess = vnpaySuccess;
        String resultMessage;

        if (payment != null) {
            if (vnpaySuccess) {
                actualSuccess = finalizeSuccessfulOnlinePayment(
                        payment,
                        transactionNo,
                        "Thanh toán VNPAY online thành công (RETURN)"
                );
                resultMessage = actualSuccess
                        ? "Thanh toán thành công"
                        : MSG_ORDER_CANCELLED_OR_EXPIRED;
            } else {
                markOnlinePaymentFailed(
                        payment,
                        transactionNo,
                        responseCode,
                        transactionStatus,
                        "RETURN"
                );
                resultMessage = buildFailureMessage(responseCode, transactionStatus);
            }
        } else {
            resultMessage = vnpaySuccess
                    ? "Thanh toán thành công nhưng không tìm thấy bản ghi payment"
                    : buildFailureMessage(responseCode, transactionStatus);
        }

        return PosVnpayReturnResponse.builder()
                .success(actualSuccess)
                .message(resultMessage)
                .txnRef(txnRef)
                .transactionNo(transactionNo)
                .responseCode(responseCode)
                .orderId(orderId)
                .build();
    }

    @Override
    public String handleOnlineIpn(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        String transactionNo = params.get("vnp_TransactionNo");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String secureHash = params.get("vnp_SecureHash");

        if (!isValidChecksum(params, secureHash)) {
            return "{\"RspCode\":\"97\",\"Message\":\"Chữ ký không hợp lệ\"}";
        }

        // Lock payment row để tránh race giữa IPN và RETURN
        Payment payment = paymentRepository.findByProviderTxnRefForUpdate(txnRef).orElse(null);

        if (payment == null) {
            return "{\"RspCode\":\"01\",\"Message\":\"Không tìm thấy đơn hàng\"}";
        }

        if (isPaymentSuccess(responseCode, transactionStatus)) {
            // finalizeSuccessfulOnlinePayment trả false khi đơn bị hủy / reservation hết hạn.
            // Vẫn trả RspCode "00" để VNPay không retry IPN.
            finalizeSuccessfulOnlinePayment(
                    payment,
                    transactionNo,
                    "Thanh toán VNPAY online thành công (IPN)"
            );
            return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
        }

        markOnlinePaymentFailed(
                payment,
                transactionNo,
                responseCode,
                transactionStatus,
                "IPN"
        );
        return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
    }

    private void recalculateAndSaveVoucherForVnpay(Order order, Long userId) {
        String voucherCode = order.getVoucherCode();
        if (!StringUtils.hasText(voucherCode)) {
            return;
        }

        BigDecimal subtotal = defaultZero(order.getSubtotalBeforeVoucher());

        // Re-validate with PESSIMISTIC_WRITE lock — throws if voucher invalid or limit reached
        ValidateDiscountResponse discount = discountService.validateDiscountForConsume(
                voucherCode, subtotal, userId);

        BigDecimal newDiscount = defaultZero(discount.getDiscountAmount());
        BigDecimal oldDiscount = defaultZero(order.getDiscountAmount());

        if (newDiscount.compareTo(oldDiscount) != 0) {
            order.setDiscountAmount(newDiscount);
            order.setProductRevenue(subtotal.subtract(newDiscount).max(BigDecimal.ZERO));
            BigDecimal newTotal = subtotal.subtract(newDiscount)
                    .add(defaultZero(order.getShippingFee()))
                    .max(BigDecimal.ZERO);
            order.setTotalAmount(newTotal);
            orderRepository.save(order);
        }

        // Reserve the voucher slot eagerly. Released on payment failure/cancel/expiry.
        Coupon coupon = couponRepository.findByCodeAndIsActiveTrue(voucherCode).orElse(null);
        if (coupon != null && order.getCustomer() != null) {
            couponUsageRepository.deleteByOrder_Id(order.getId());
            couponUsageRepository.save(CouponUsage.builder()
                    .coupon(coupon)
                    .customer(order.getCustomer())
                    .order(order)
                    .build());
        }
    }

    private void validateOnlineOrderOwner(Order order, Customer customer) {
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customer.getId())) {
            throw new InvalidRequestException("Bạn không có quyền thanh toán đơn hàng này");
        }
    }

    private void validateOnlineOrderForVnpay(Order order) {
        if (order.getOrderType() == null || !ORDER_TYPE_ONLINE.equalsIgnoreCase(order.getOrderType())) {
            throw new InvalidRequestException("Đây không phải đơn hàng online");
        }

        if (ORDER_STATUS_CANCELLED.equalsIgnoreCase(order.getStatus())
                || ORDER_STATUS_COMPLETED.equalsIgnoreCase(order.getStatus())
                || ORDER_STATUS_SHIPPING.equalsIgnoreCase(order.getStatus())) {
            throw new InvalidRequestException("Đơn hàng này không còn ở trạng thái thanh toán hợp lệ");
        }
    }

    private static final String MSG_ORDER_CANCELLED_OR_EXPIRED =
            "Đơn hàng đã bị hủy hoặc phiên giữ hàng đã hết hạn. Thanh toán không được ghi nhận.";

    /**
     * Xác nhận thanh toán VNPay online thành công.
     * Phải kiểm tra order còn hợp lệ và reservation còn RESERVED trước khi set PAID.
     * Return true nếu ghi nhận thành công, false nếu đơn đã hủy / reservation hết hạn.
     */
    private boolean finalizeSuccessfulOnlinePayment(
            Payment payment,
            String transactionNo,
            String successNote
    ) {
        // Idempotent: payment đã PAID từ lần trước
        if (PAYMENT_STATUS_PAID.equalsIgnoreCase(payment.getStatus())) {
            Order o = payment.getOrder();
            // Nếu đơn còn hợp lệ → coi như đã xử lý thành công
            if (o != null && !ORDER_STATUS_CANCELLED.equalsIgnoreCase(o.getStatus())) {
                return true;
            }
            // PAID + CANCELLED = trạng thái bất thường, không báo success
            return false;
        }

        Order order = payment.getOrder();
        if (order == null) {
            return false;
        }

        // Lock order để tránh race với admin cancel / scheduler expire
        Order locked = orderRepository.findByIdForUpdate(order.getId()).orElse(null);
        if (locked == null) {
            return false;
        }

        // Validate: đơn chưa bị hủy / fail / hết hạn
        String st = locked.getStatus();
        if (ORDER_STATUS_CANCELLED.equalsIgnoreCase(st)
                || "FAILED".equalsIgnoreCase(st)
                || "REFUNDED".equalsIgnoreCase(st)
                || "EXPIRED".equalsIgnoreCase(st)) {
            return false;
        }

        // ONLINE: xác nhận reservation + trừ stock thật — phải thành công mới set PAID
        if (ORDER_TYPE_ONLINE.equalsIgnoreCase(locked.getOrderType())
                && !Boolean.TRUE.equals(locked.getInventoryReserved())) {
            boolean deducted = stockReservationService.confirmAndDeductStock(locked.getId());
            if (!deducted) {
                // Reservation đã bị release/expire → từ chối ghi nhận payment
                return false;
            }
            locked.setInventoryReserved(true);
            locked.setInventoryReservedAt(OffsetDateTime.now());
        }

        // Tất cả check qua → ghi nhận PAID
        payment.setStatus(PAYMENT_STATUS_PAID);
        payment.setTransactionCode(transactionNo);
        payment.setPaidAt(OffsetDateTime.now());
        payment.setNote(successNote);
        paymentRepository.save(payment);

        locked.setCustomerPaid(defaultZero(payment.getAmount()));
        // Giữ nguyên PENDING để admin xác nhận thủ công
        orderRepository.save(locked);

        saveVoucherUsageIfNeeded(locked);
        return true;
    }

    private void markOnlinePaymentFailed(
            Payment payment,
            String transactionNo,
            String responseCode,
            String transactionStatus,
            String source
    ) {
        if (PAYMENT_STATUS_PAID.equalsIgnoreCase(payment.getStatus())) {
            return;
        }

        payment.setStatus(PAYMENT_STATUS_FAILED);
        payment.setTransactionCode(transactionNo);
        payment.setNote(
                "Thanh toán VNPAY online thất bại (" + source + ") - responseCode="
                        + responseCode
                        + ", transactionStatus="
                        + transactionStatus
        );
        paymentRepository.save(payment);

        Order order = payment.getOrder();
        if (order != null && ORDER_TYPE_ONLINE.equalsIgnoreCase(order.getOrderType())) {
            String previousStatus = order.getStatus();
            // Release soft reservation (khong tru stockQuantity that)
            stockReservationService.releaseReservations(order.getId(), "VNPAY_FAILED_" + source);
            if (!ORDER_STATUS_CANCELLED.equalsIgnoreCase(order.getStatus())) {
                order.setStatus(ORDER_STATUS_CANCELLED);
                saveOrderStatusHistory(order, previousStatus, ORDER_STATUS_CANCELLED);
            }
            couponUsageRepository.deleteByOrder_Id(order.getId());
            orderRepository.save(order);
        }
    }

    private Customer resolveCustomer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));

        return customerRepository.findByUserProfileId(user.getUserProfile().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."));
    }

    private String generateUniqueTxnRef(String prefix, Long orderId) {
        String txnRef;
        do {
            txnRef = prefix + orderId + System.currentTimeMillis();
        } while (paymentRepository.existsByProviderTxnRef(txnRef));
        return txnRef;
    }

    private BigDecimal calculateFinalAmount(Order order) {
        return defaultZero(order.getTotalAmount())
                .subtract(defaultZero(order.getDiscountAmount()))
                .add(defaultZero(order.getShippingFee()));
    }

    private boolean isCouponApplicable(Coupon coupon, Order order, BigDecimal subtotal) {
        if (coupon == null || !Boolean.TRUE.equals(coupon.getIsActive())) {
            return false;
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (coupon.getStartDate() != null && now.isBefore(coupon.getStartDate())) {
            return false;
        }

        if (coupon.getEndDate() != null && now.isAfter(coupon.getEndDate())) {
            return false;
        }

        if (coupon.getUsageLimit() != null && coupon.getUsageLimit() > 0) {
            long usedCount = couponUsageRepository.countValidUsagesByCouponId(coupon.getId());
            if (usedCount >= coupon.getUsageLimit()) {
                return false;
            }
        }

        if (order.getCustomer() == null) {
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

            if (maxDiscountAmount != null && discountAmount.compareTo(maxDiscountAmount) > 0) {
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

    private boolean isValidChecksum(Map<String, String> params, String secureHash) {
        TreeMap<String, String> checkMap = new TreeMap<>(params);
        checkMap.remove("vnp_SecureHash");
        checkMap.remove("vnp_SecureHashType");

        String signData = VnpayUtil.buildHashData(checkMap);
        String expectedHash = VnpayUtil.hmacSHA512(vnpayConfig.getHashSecret(), signData);

        return expectedHash.equalsIgnoreCase(secureHash);
    }

    private boolean isPaymentSuccess(String responseCode, String transactionStatus) {
        return "00".equals(responseCode)
                && (transactionStatus == null
                || transactionStatus.isBlank()
                || "00".equals(transactionStatus));
    }

    /**
     * Xác nhận thanh toán VNPay POS thành công.
     * Kiểm tra đơn chưa bị hủy trước khi set PAID.
     * Return true nếu ghi nhận thành công, false nếu đơn đã hủy.
     */
    private boolean finalizeSuccessfulPayment(
            Payment payment,
            String transactionNo,
            String successNote
    ) {
        if (PAYMENT_STATUS_PAID.equals(payment.getStatus())) {
            return true;
        }

        Order order = payment.getOrder();
        if (order != null) {
            // Lock order để tránh race với POS cancelOrder
            Order locked = orderRepository.findByIdForUpdate(order.getId()).orElse(null);
            if (locked == null || ORDER_STATUS_CANCELLED.equalsIgnoreCase(locked.getStatus())) {
                return false;
            }

            payment.setStatus(PAYMENT_STATUS_PAID);
            payment.setTransactionCode(transactionNo);
            payment.setPaidAt(OffsetDateTime.now());
            payment.setNote(successNote);
            paymentRepository.save(payment);

            if (!ORDER_STATUS_COMPLETED.equals(locked.getStatus())) {
                String previousStatus = locked.getStatus();
                locked.setCustomerPaid(defaultZero(payment.getAmount()));
                locked.setStatus(ORDER_STATUS_COMPLETED);
                orderRepository.save(locked);
                saveOrderStatusHistory(locked, previousStatus, ORDER_STATUS_COMPLETED);
            }

            saveVoucherUsageIfNeeded(locked);
        } else {
            payment.setStatus(PAYMENT_STATUS_PAID);
            payment.setTransactionCode(transactionNo);
            payment.setPaidAt(OffsetDateTime.now());
            payment.setNote(successNote);
            paymentRepository.save(payment);
        }

        return true;
    }

    private void markPaymentFailed(
            Payment payment,
            String transactionNo,
            String responseCode,
            String transactionStatus,
            String source
    ) {
        if (PAYMENT_STATUS_PAID.equals(payment.getStatus())) {
            return;
        }

        payment.setStatus(PAYMENT_STATUS_FAILED);
        payment.setTransactionCode(transactionNo);
        payment.setNote(
                "Thanh toán VNPAY thất bại (" + source + ") - responseCode="
                        + responseCode
                        + ", transactionStatus="
                        + transactionStatus
        );
        paymentRepository.save(payment);
    }

    private void saveVoucherUsageIfNeeded(Order order) {
        if (order.getCustomer() == null
                || order.getVoucherCode() == null
                || order.getVoucherCode().isBlank()) {
            return;
        }

        couponUsageRepository.deleteByOrder_Id(order.getId());

        Coupon coupon = couponRepository.findByCodeAndIsActiveTrue(order.getVoucherCode())
                .orElse(null);

        if (coupon != null) {
            couponUsageRepository.save(
                    CouponUsage.builder()
                            .coupon(coupon)
                            .customer(order.getCustomer())
                            .order(order)
                            .build()
            );
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

    private String buildPaymentNote(AppliedDiscount appliedDiscount) {
        if (appliedDiscount == null || appliedDiscount.voucherCode == null) {
            return "Khởi tạo thanh toán VNPAY";
        }

        return "Khởi tạo thanh toán VNPAY - "
                + appliedDiscount.voucherType
                + ": "
                + appliedDiscount.voucherCode;
    }

    private String buildFailureMessage(String responseCode, String transactionStatus) {
        return "Thanh toán thất bại. ResponseCode="
                + defaultText(responseCode)
                + ", TransactionStatus="
                + defaultText(transactionStatus);
    }

    private String defaultText(String value) {
        return value == null || value.isBlank() ? "N/A" : value;
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String generateTxnRef(Long orderId) {
        return "POS" + orderId + System.currentTimeMillis();
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            return ip.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record AppliedDiscount(String voucherType, String voucherCode) {
    }
}
