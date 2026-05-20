package com.vn.backend.repository;
import com.vn.backend.entity.Coupon;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Coupon c WHERE UPPER(TRIM(c.code)) = UPPER(TRIM(:code))")
    Optional<Coupon> findByCodeForUpdate(@Param("code") String code);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT c
        FROM Coupon c
        WHERE c.isActive = true
        ORDER BY c.createdAt DESC
    """)
    List<Coupon> findAvailableCoupons();

    @Query("""
        SELECT c
        FROM Coupon c
        WHERE c.isActive = true
          AND (:customerId IS NULL OR :customerId IS NOT NULL)
        ORDER BY c.createdAt DESC
    """)
    List<Coupon> findAvailableCouponsForCustomer(@Param("customerId") Long customerId);

}
