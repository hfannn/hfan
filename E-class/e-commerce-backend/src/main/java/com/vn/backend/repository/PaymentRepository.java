package com.vn.backend.repository;

import com.vn.backend.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByOrder_Id(Long orderId);

    Optional<Payment> findByProviderTxnRef(String providerTxnRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.providerTxnRef = :txnRef")
    Optional<Payment> findByProviderTxnRefForUpdate(@Param("txnRef") String txnRef);

    boolean existsByProviderTxnRef(String providerTxnRef);

    Optional<Payment> findTopByOrder_IdAndPaymentMethod_CodeOrderByIdDesc(
            Long orderId,
            String paymentMethodCode
    );
}