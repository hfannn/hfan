package com.vn.backend.repository;

import com.vn.backend.entity.Origin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OriginRepository extends JpaRepository<Origin, Long> {
    List<Origin> findByDeletedAtIsNullAndIsActiveTrue();
    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);
    boolean existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(String name, Long id);

    // Tìm kể cả soft-deleted
    @Query("SELECT o FROM Origin o WHERE LOWER(o.name) = LOWER(:name)")
    Optional<Origin> findByNameIgnoreCaseAll(@Param("name") String name);
}
