package com.vn.backend.repository;

import com.vn.backend.entity.Brand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BrandRepository extends JpaRepository<Brand, Long> {
    List<Brand> findByDeletedAtIsNullAndIsActiveTrue();
    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);
    boolean existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(String name, Long id);
    @Query("SELECT b FROM Brand b WHERE b.deletedAt IS NULL")
    Page<Brand> findAllActive(Pageable pageable);

    @Query("SELECT b FROM Brand b WHERE b.deletedAt IS NULL")
    List<Brand> findAllActive();

    @Query("SELECT b FROM Brand b WHERE b.id = :id AND b.deletedAt IS NULL")
    Optional<Brand> findByIdActive(Long id);

    @Query("SELECT b FROM Brand b WHERE b.name LIKE %:name% AND b.deletedAt IS NULL")
    Page<Brand> searchByName(String name, Pageable pageable);
}
