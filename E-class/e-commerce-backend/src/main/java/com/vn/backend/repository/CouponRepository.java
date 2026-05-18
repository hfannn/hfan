package com.vn.backend.repository;
import com.vn.backend.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.query.Param;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {

    @Query("SELECT c FROM Coupon c WHERE UPPER(TRIM(c.code)) = UPPER(TRIM(:code))")
    Optional<Coupon> findByCode(@Param("code") String code);

    @Query("SELECT c FROM Coupon c WHERE UPPER(TRIM(c.code)) = UPPER(TRIM(:code)) AND c.isActive = true")
    Optional<Coupon> findByCodeAndIsActiveTrue(@Param("code") String code);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT c
        FROM Coupon c
        WHERE c.isActive = true
          AND (c.startDate IS NULL OR c.startDate <= CURRENT_TIMESTAMP)
          AND (c.endDate IS NULL OR c.endDate >= CURRENT_TIMESTAMP)
          AND (
                c.usageLimit IS NULL
                OR (
                    SELECT COUNT(cu)
                    FROM CouponUsage cu
                    WHERE cu.coupon.id = c.id
                ) < c.usageLimit
          )
          AND NOT EXISTS (
                SELECT cu
                FROM CouponUsage cu
                WHERE cu.coupon.id = c.id
                  AND cu.customer.id = :customerId
          )
        ORDER BY c.createdAt DESC
    """)
    List<Coupon> findAvailableCouponsForCustomer(@Param("customerId") Long customerId);

}
