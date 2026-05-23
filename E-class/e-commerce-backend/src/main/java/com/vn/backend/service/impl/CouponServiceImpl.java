package com.vn.backend.service.impl;

import com.vn.backend.dto.request.CouponRequest;
import com.vn.backend.dto.response.CouponResponse;
import com.vn.backend.entity.Coupon;
import com.vn.backend.entity.Customer;
import com.vn.backend.entity.User;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.CouponRepository;
import com.vn.backend.repository.CouponUsageRepository;
import com.vn.backend.repository.CustomerRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.service.CouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {

    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    @Override
    public Page<CouponResponse> getAll(Pageable pageable) {
        return couponRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public CouponResponse getById(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá với ID: " + id));
        return mapToResponse(coupon);
    }

    @Override
    @Transactional
    public CouponResponse create(CouponRequest request) {
        validateRequest(request);

        String normalizedCode = normalizeCode(request.getCode());
        String normalizedDiscountType = normalizeDiscountType(request.getDiscountType());
        BigDecimal maxDiscountAmount = resolveMaxDiscountAmount(normalizedDiscountType, request.getMaxDiscountAmount());

        if (couponRepository.existsByCode(normalizedCode)) {
            throw new IllegalArgumentException("Mã giảm giá đã tồn tại.");
        }

        Coupon coupon = Coupon.builder()
                .code(normalizedCode)
                .discountType(normalizedDiscountType)
                .discountValue(request.getDiscountValue())
                .minOrderValue(defaultZero(request.getMinOrderValue()))
                .maxDiscountAmount(maxDiscountAmount)
                .usageLimit(request.getUsageLimit())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        return mapToResponse(couponRepository.save(coupon));
    }

    @Override
    @Transactional
    public CouponResponse update(Long id, CouponRequest request) {
        validateRequest(request);

        String normalizedCode = normalizeCode(request.getCode());
        String normalizedDiscountType = normalizeDiscountType(request.getDiscountType());
        BigDecimal maxDiscountAmount = resolveMaxDiscountAmount(normalizedDiscountType, request.getMaxDiscountAmount());

        if (couponRepository.existsByCodeAndIdNot(normalizedCode, id)) {
            throw new IllegalArgumentException("Mã giảm giá đã tồn tại.");
        }

        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá với ID: " + id));

        if (request.getUsageLimit() != null) {
            long usedCount = couponUsageRepository.countValidUsagesByCouponId(id);
            if (request.getUsageLimit() < usedCount) {
                throw new IllegalArgumentException(
                        "Tổng lượt sử dụng không được nhỏ hơn số lượt đã dùng (" + usedCount + ").");
            }
        }

        coupon.setCode(normalizedCode);
        coupon.setDiscountType(normalizedDiscountType);
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderValue(defaultZero(request.getMinOrderValue()));
        coupon.setMaxDiscountAmount(maxDiscountAmount);
        coupon.setStartDate(request.getStartDate());
        coupon.setEndDate(request.getEndDate());

        coupon.setUsageLimit(request.getUsageLimit());

        if (request.getIsActive() != null) {
            coupon.setIsActive(request.getIsActive());
        }

        return mapToResponse(couponRepository.save(coupon));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá với ID: " + id));
        coupon.setIsActive(false);
        couponRepository.save(coupon);
    }

    @Override
    public List<CouponResponse> getMyCoupons(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        customerRepository.findByUserProfileId(user.getUserProfile().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng"));

        return couponRepository.findAvailableCoupons().stream()
                .map(this::mapToResponse)
                .toList();
    }

    private CouponResponse mapToResponse(Coupon coupon) {
        CouponResponse response = new CouponResponse();
        response.setId(coupon.getId());
        response.setCode(coupon.getCode());
        response.setName(coupon.getCode());
        response.setVoucherType("COUPON");
        response.setDiscountType(coupon.getDiscountType());
        response.setDiscountValue(coupon.getDiscountValue());
        response.setMinOrderValue(coupon.getMinOrderValue());
        response.setMaxDiscountAmount(coupon.getMaxDiscountAmount());
        response.setUsageLimit(coupon.getUsageLimit());
        response.setIsActive(coupon.getIsActive());
        response.setStartDate(coupon.getStartDate());
        response.setEndDate(coupon.getEndDate());
        response.setCreatedAt(coupon.getCreatedAt());

        long usedCount = couponUsageRepository.countValidUsagesByCouponId(coupon.getId());
        Integer issuedQuantity = coupon.getUsageLimit();
        Integer remainingCount = null;
        Double usedPercent = null;
        Double remainingPercent = null;

        if (issuedQuantity != null && issuedQuantity > 0) {
            remainingCount = Math.max(issuedQuantity - (int) usedCount, 0);
            usedPercent = BigDecimal.valueOf(usedCount)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(issuedQuantity), 2, RoundingMode.HALF_UP)
                    .doubleValue();
            remainingPercent = BigDecimal.valueOf(remainingCount)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(issuedQuantity), 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        response.setIssuedQuantity(issuedQuantity);
        response.setUsedCount(usedCount);
        response.setRemainingCount(remainingCount);
        response.setRemainingUsage(remainingCount);
        response.setRemainingUses(remainingCount);
        response.setUsedPercent(usedPercent);
        response.setRemainingPercent(remainingPercent);

        return response;
    }

    private void validateRequest(CouponRequest request) {
        String normalizedCode = normalizeCode(request.getCode());
        String normalizedDiscountType = normalizeDiscountType(request.getDiscountType());

        if (normalizedCode == null || normalizedCode.isBlank()) {
            throw new IllegalArgumentException("Mã giảm giá không được để trống.");
        }

        if (!normalizedCode.matches("^[A-Z0-9_-]+$")) {
            throw new IllegalArgumentException("Mã giảm giá chỉ gồm A-Z, 0-9, dấu gạch ngang hoặc gạch dưới");
        }

        if (request.getDiscountValue() == null || request.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Giá trị giảm phải lớn hơn 0");
        }

        if (!"PERCENTAGE".equals(normalizedDiscountType) && !"FIXED_AMOUNT".equals(normalizedDiscountType)) {
            throw new IllegalArgumentException("Loại giảm giá không hợp lệ");
        }

        if ("PERCENTAGE".equals(normalizedDiscountType)
                && request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Giảm theo phần trăm không được lớn hơn 100");
        }

        if ("PERCENTAGE".equals(normalizedDiscountType)
                && (request.getMaxDiscountAmount() == null
                || request.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new IllegalArgumentException("Coupon phần trăm phải có mức giảm tối đa lớn hơn 0");
        }

        if (request.getMinOrderValue() != null && request.getMinOrderValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Giá trị đơn tối thiểu không được âm");
        }

        if ("PERCENTAGE".equals(normalizedDiscountType)
                && request.getMaxDiscountAmount() != null
                && request.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Mức giảm tối đa phải lớn hơn 0");
        }

        if (request.getUsageLimit() != null && request.getUsageLimit() <= 0) {
            throw new IllegalArgumentException("Tổng lượt sử dụng phải lớn hơn 0");
        }

        if (request.getStartDate() != null
                && request.getEndDate() != null
                && request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("Thời gian bắt đầu không được sau thời gian kết thúc");
        }
    }

    private String normalizeCode(String code) {
        return code == null ? null : code.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeDiscountType(String discountType) {
        if (discountType == null) {
            return null;
        }
        String normalized = discountType.trim().toUpperCase(Locale.ROOT);
        if ("PERCENT".equals(normalized)) {
            return "PERCENTAGE";
        }
        if ("FIXED".equals(normalized)) {
            return "FIXED_AMOUNT";
        }
        return normalized;
    }

    private BigDecimal resolveMaxDiscountAmount(String normalizedDiscountType, BigDecimal maxDiscountAmount) {
        if ("FIXED_AMOUNT".equals(normalizedDiscountType)) {
            return null;
        }
        return maxDiscountAmount;
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
