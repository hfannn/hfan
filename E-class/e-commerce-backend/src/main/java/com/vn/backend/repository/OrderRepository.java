package com.vn.backend.repository;

import com.vn.backend.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByCustomer_IdOrderByCreatedAtDesc(Long customerId, Pageable pageable);

    List<Order> findByStatusAndOrderTypeOrderByCreatedAtDesc(String status, String orderType);

    long countByStatusAndOrderType(String status, String orderType);

    List<Order> findByOrderTypeAndStatusAndCreatedAtBefore(
            String orderType,
            String status,
            OffsetDateTime createdAt
    );
    List<Order> findByOrderTypeAndStatusAndEmployeeId(
            String orderType,
            String status,
            Long employId
    );

    List<Order> findByOrderTypeAndStatus(
            String orderType,
            String status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    Optional<Order> findByCode(String code);

    Optional<Order> findByCodeAndCustomer_Id(String code, Long customerId);

    List<Order> findTop3ByCustomer_IdOrderByCreatedAtDesc(Long customerId);
}