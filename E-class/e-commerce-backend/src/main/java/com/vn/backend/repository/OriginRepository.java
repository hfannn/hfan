package com.vn.backend.repository;

import com.vn.backend.entity.Origin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OriginRepository extends JpaRepository<Origin, Long> {
    List<Origin> findByDeletedAtIsNullAndIsActiveTrue();
    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);
    boolean existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(String name, Long id);
}
