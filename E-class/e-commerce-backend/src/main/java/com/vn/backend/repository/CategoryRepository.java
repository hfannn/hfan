package com.vn.backend.repository;

import com.vn.backend.entity.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByDeletedAtIsNullAndIsActiveTrue();
    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);
    boolean existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(String name, Long id);
    @Query("SELECT c FROM Category c WHERE c.deletedAt IS NULL")
    Page<Category> findAllActive(Pageable pageable);

    @Query("SELECT c FROM Category c WHERE c.deletedAt IS NULL")
    List<Category> findAllActive();

    @Query("SELECT c FROM Category c WHERE c.id = :id AND c.deletedAt IS NULL")
    Optional<Category> findByIdActive(Long id);

    @Query("SELECT c FROM Category c WHERE c.name LIKE %:name% AND c.deletedAt IS NULL")
    Page<Category> searchByName(String name, Pageable pageable);
}
