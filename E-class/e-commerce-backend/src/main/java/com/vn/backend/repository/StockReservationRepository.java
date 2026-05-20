package com.vn.backend.repository;

import com.vn.backend.entity.StockReservation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface StockReservationRepository extends JpaRepository<StockReservation, Long> {

    List<StockReservation> findByOrderId(Long orderId);

    @Query("SELECT COALESCE(SUM(r.quantity), 0) FROM StockReservation r " +
           "WHERE r.productVariantId = :variantId AND r.status = 'RESERVED' AND r.expiresAt > :now")
    Integer sumActiveReservedQuantity(@Param("variantId") Long variantId, @Param("now") OffsetDateTime now);

    @Query("SELECT r FROM StockReservation r " +
           "WHERE r.orderId = :orderId AND r.status = 'RESERVED' AND r.expiresAt > :now")
    List<StockReservation> findActiveByOrderId(@Param("orderId") Long orderId, @Param("now") OffsetDateTime now);

    @Query("SELECT r FROM StockReservation r WHERE r.status = 'RESERVED' AND r.expiresAt <= :now")
    List<StockReservation> findExpiredReservations(@Param("now") OffsetDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM StockReservation r WHERE r.orderId = :orderId")
    List<StockReservation> findByOrderIdForUpdate(@Param("orderId") Long orderId);
}
