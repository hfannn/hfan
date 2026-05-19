package com.vn.backend.service.impl;

import com.vn.backend.dto.request.PromotionRequest;
import com.vn.backend.dto.response.PromotionResponse;
import com.vn.backend.entity.Promotion;
import com.vn.backend.repository.CouponUsageRepository;
import com.vn.backend.repository.PromotionRepository;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vn.backend.repository.CouponUsageRepository;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class PromotionServiceImpl implements PromotionService {
    private final CouponUsageRepository couponUsageRepository;
    private final PromotionRepository promotionRepository;

    @Override
    public Page<PromotionResponse> getAll(Pageable pageable) {
        return promotionRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<PromotionResponse> getPublicActivePromotions(Pageable pageable) {
        return promotionRepository.findActivePromotions(OffsetDateTime.now(), pageable)
                .map(this::mapToResponse);
    }

    @Override
    public PromotionResponse getById(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chương trình giảm giá với ID: " + id));
        return mapToResponse(promotion);
    }

    @Override
    @Transactional
    public PromotionResponse create(PromotionRequest request) {
        Promotion promotion = new Promotion();
        mapRequestToEntity(request, promotion);

        Promotion savedPromotion = promotionRepository.save(promotion);
        return mapToResponse(savedPromotion);
    }

    @Override
    @Transactional
    public PromotionResponse update(Long id, PromotionRequest request) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chương trình giảm giá với ID: " + id));
        mapRequestToEntity(request, promotion);

        Promotion updatedPromotion = promotionRepository.save(promotion);
        return mapToResponse(updatedPromotion);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chương trình giảm giá với ID: " + id));

        promotion.setIsActive(false);
        promotionRepository.save(promotion);
    }

    private PromotionResponse mapToResponse(Promotion promotion) {
        PromotionResponse response = new PromotionResponse();
        response.setId(promotion.getId());
        response.setCode(promotion.getCode());
        response.setName(promotion.getName());
        response.setDiscountType(promotion.getDiscountType());
        response.setDiscountValue(promotion.getDiscountValue());
        response.setMinOrderValue(promotion.getMinOrderValue());
        response.setMaxDiscountAmount(promotion.getMaxDiscountAmount());
        response.setUsageLimit(promotion.getUsageLimit());

        long usedCount = couponUsageRepository.countByPromotion_Id(promotion.getId());  // Khai báo usedCount chỉ một lần
        if (promotion.getUsageLimit() != null) {
            response.setRemainingUsage(Math.max(promotion.getUsageLimit() - (int) usedCount, 0));
        } else {
            response.setRemainingUsage(null);
        }

        response.setUsageLimitPerCustomer(promotion.getUsageLimitPerCustomer());
        response.setStartDate(promotion.getStartDate());
        response.setEndDate(promotion.getEndDate());
        response.setIsActive(promotion.getIsActive());
        response.setCreatedAt(promotion.getCreatedAt());

        // ====== thống kê usage cho admin ======
        Integer issuedQuantity = promotion.getUsageLimit();
        Integer remainingCount = null;
        Double usedPercent = null;
        Double remainingPercent = null;

        if (issuedQuantity != null && issuedQuantity > 0) {
            int remaining = Math.max(issuedQuantity - (int) usedCount, 0);
            remainingCount = remaining;

            usedPercent = (usedCount * 100.0) / issuedQuantity;
            remainingPercent = (remaining * 100.0) / issuedQuantity;
        }

        response.setIssuedQuantity(issuedQuantity);
        response.setUsedCount(usedCount);
        response.setRemainingCount(remainingCount);
        response.setUsedPercent(usedPercent);
        response.setRemainingPercent(remainingPercent);

        return response;
    }

    private void mapRequestToEntity(PromotionRequest request, Promotion promotion) {
        promotion.setCode(request.getCode());
        promotion.setName(request.getName());
        promotion.setDiscountType(request.getDiscountType());
        promotion.setDiscountValue(request.getDiscountValue());
        promotion.setMinOrderValue(request.getMinOrderValue());
        promotion.setMaxDiscountAmount(request.getMaxDiscountAmount());
        promotion.setUsageLimit(request.getUsageLimit());
        promotion.setUsageLimitPerCustomer(request.getUsageLimitPerCustomer());
        promotion.setStartDate(request.getStartDate());
        promotion.setEndDate(request.getEndDate());
        promotion.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
    }
}
