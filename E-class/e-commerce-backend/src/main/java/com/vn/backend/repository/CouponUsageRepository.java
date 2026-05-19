package com.vn.backend.repository;

import com.vn.backend.entity.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {
    long countByCoupon_Id(Long couponId);

    @Query("""
        SELECT COUNT(cu)
        FROM CouponUsage cu
        WHERE cu.coupon.id = :couponId
          AND cu.order IS NOT NULL
          AND (cu.order.status IS NULL OR UPPER(cu.order.status) <> 'CANCELLED')
    """)
    long countValidUsagesByCouponId(@Param("couponId") Long couponId);

    long countByCoupon_IdAndCustomer_Id(Long couponId, Long customerId);

    long countByPromotion_Id(Long promotionId);

    long countByPromotion_IdAndCustomer_Id(Long promotionId, Long customerId);

    void deleteByOrder_Id(Long orderId);
}
