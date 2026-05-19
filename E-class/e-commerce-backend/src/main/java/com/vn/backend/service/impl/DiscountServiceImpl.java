package com.vn.backend.service.impl;

import com.vn.backend.dto.request.OrderItemRequest;
import com.vn.backend.dto.request.ValidateDiscountRequest;
import com.vn.backend.dto.response.ValidateDiscountResponse;
import com.vn.backend.entity.Coupon;
import com.vn.backend.entity.Customer;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.User;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.repository.CouponRepository;
import com.vn.backend.repository.CouponUsageRepository;
import com.vn.backend.repository.CustomerRepository;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.security.CustomUserDetails;
import com.vn.backend.service.DiscountService;
import com.vn.backend.service.ProductPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class DiscountServiceImpl implements DiscountService {

    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductPriceService productPriceService;

    @Override
    public ValidateDiscountResponse validateDiscount(ValidateDiscountRequest request, CustomUserDetails userDetails) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new InvalidRequestException("Danh sách sản phẩm là bắt buộc khi xem trước mã giảm giá.");
        }

        BigDecimal subtotalBeforeVoucher = calculateSubtotalBeforeVoucher(request.getItems());
        return validateDiscountForSubtotal(request.getCode(), subtotalBeforeVoucher, userDetails);
    }

    @Override
    public ValidateDiscountResponse validateDiscountForSubtotal(
            String code,
            BigDecimal subtotal,
            CustomUserDetails userDetails
    ) {
        if (userDetails == null) {
            throw new InvalidRequestException("Bạn cần đăng nhập để sử dụng mã giảm giá.");
        }

        if (code == null || code.isBlank()) {
            throw new InvalidRequestException("Mã giảm giá không được để trống.");
        }

        String normalizedCode = normalizeCode(code);
        Customer customer = resolveCustomer(userDetails.getUserId());
        Coupon coupon = couponRepository.findByCode(normalizedCode)
                .orElseThrow(() -> new InvalidRequestException("Mã giảm giá không tồn tại."));
        return validateCoupon(coupon, customer, defaultZero(subtotal));
    }

    @Override
    public Coupon findCouponByCode(String code) {
        return couponRepository.findByCodeAndIsActiveTrue(normalizeCode(code))
                .orElse(null);
    }

    private ValidateDiscountResponse validateCoupon(Coupon coupon, Customer customer, BigDecimal subtotal) {
        OffsetDateTime now = OffsetDateTime.now();

        if (!Boolean.TRUE.equals(coupon.getIsActive())) {
            throw new InvalidRequestException("Mã giảm giá đã bị vô hiệu hóa.");
        }

        if (coupon.getStartDate() != null && now.isBefore(coupon.getStartDate())) {
            throw new InvalidRequestException("Mã giảm giá chưa đến thời gian sử dụng.");
        }

        if (coupon.getEndDate() != null && now.isAfter(coupon.getEndDate())) {
            throw new InvalidRequestException("Mã giảm giá đã hết hạn.");
        }

        long totalUsage = couponUsageRepository.countValidUsagesByCouponId(coupon.getId());
        if (coupon.getUsageLimit() != null && coupon.getUsageLimit() > 0 && totalUsage >= coupon.getUsageLimit()) {
            throw new InvalidRequestException("Mã giảm giá đã hết lượt sử dụng.");
        }

        if (coupon.getDiscountValue() == null || coupon.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("Giá trị giảm không hợp lệ.");
        }

        String normalizedDiscountType = coupon.getDiscountType() == null
                ? ""
                : coupon.getDiscountType().trim().toUpperCase(Locale.ROOT);
        if (("PERCENTAGE".equals(normalizedDiscountType) || "PERCENT".equals(normalizedDiscountType))
                && coupon.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new InvalidRequestException("Giá trị giảm phần trăm không hợp lệ.");
        }

        if (coupon.getMinOrderValue() != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            throw new InvalidRequestException("Đơn hàng chưa đạt giá trị tối thiểu.");
        }

        BigDecimal discountAmount = calculateDiscount(
                subtotal,
                coupon.getDiscountType(),
                coupon.getDiscountValue(),
                coupon.getMaxDiscountAmount()
        );

        ValidateDiscountResponse response = new ValidateDiscountResponse();
        response.setCode(coupon.getCode());
        response.setDiscountAmount(discountAmount);
        response.setDiscountType(coupon.getDiscountType());
        response.setDiscountValue(coupon.getDiscountValue());
        response.setMinOrderValue(coupon.getMinOrderValue());
        response.setMaxDiscountAmount(coupon.getMaxDiscountAmount());
        response.setUsageLimit(coupon.getUsageLimit());
        if (coupon.getUsageLimit() != null && coupon.getUsageLimit() > 0) {
            response.setRemainingUsage(Math.max(coupon.getUsageLimit() - (int) totalUsage, 0));
        }
        response.setMessage("Áp dụng mã giảm giá thành công.");
        return response;
    }

    private BigDecimal calculateDiscount(BigDecimal subtotal, String type, BigDecimal value, BigDecimal maxValue) {
        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0 || type == null || value == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal discount = BigDecimal.ZERO;

        if ("PERCENTAGE".equalsIgnoreCase(type) || "PERCENT".equalsIgnoreCase(type)) {
            discount = subtotal.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (maxValue != null && discount.compareTo(maxValue) > 0) {
                discount = maxValue;
            }
        } else if ("FIXED_AMOUNT".equalsIgnoreCase(type) || "FIXED".equalsIgnoreCase(type)) {
            discount = value;
        }

        return discount.min(subtotal);
    }

    private BigDecimal calculateSubtotalBeforeVoucher(List<OrderItemRequest> items) {
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemRequest item : items) {
            if (item.getVariantId() == null || item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new InvalidRequestException("Sản phẩm hoặc số lượng không hợp lệ.");
            }

            ProductVariant variant = productVariantRepository.findById(item.getVariantId())
                    .orElseThrow(() -> new InvalidRequestException("Không tìm thấy biến thể sản phẩm."));
            BigDecimal unitPrice = productPriceService.calculateCurrentPrice(variant).getUnitPrice();
            subtotal = subtotal.add(defaultZero(unitPrice).multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        return subtotal;
    }

    private Customer resolveCustomer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidRequestException("Không tìm thấy người dùng."));

        return customerRepository.findByUserProfileId(user.getUserProfile().getId())
                .orElseThrow(() -> new InvalidRequestException("Không tìm thấy khách hàng."));
    }

    private String normalizeCode(String code) {
        return code == null ? null : code.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
