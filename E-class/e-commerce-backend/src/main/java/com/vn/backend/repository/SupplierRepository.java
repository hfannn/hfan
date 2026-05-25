package com.vn.backend.repository;

import com.vn.backend.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByDeletedAtIsNullAndIsActiveTrue();
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Long id);

    // Tìm kể cả soft-deleted
    @Query("SELECT s FROM Supplier s WHERE s.code = :code")
    Optional<Supplier> findByCodeAll(@Param("code") String code);
}
