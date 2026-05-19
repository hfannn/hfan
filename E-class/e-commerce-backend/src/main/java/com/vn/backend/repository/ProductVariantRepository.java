package com.vn.backend.repository;

import com.vn.backend.entity.ProductVariant;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    boolean existsByCodeAndDeletedAtIsNull(String code);

    boolean existsByCodeAndDeletedAtIsNullAndIdNot(String code, Long id);

    boolean existsByBarcodeAndDeletedAtIsNull(String barcode);

    boolean existsByBarcodeAndDeletedAtIsNullAndIdNot(String barcode, Long id);

    List<ProductVariant> findByProductId(Long productId);

    @Query("""
            select distinct v
            from ProductVariant v
            left join fetch v.product p
            left join fetch v.variantAttributeValues vav
            left join fetch vav.attributeValue av
            left join fetch av.attribute a
            where p.id = :productId
              and v.deletedAt is null
            order by v.id asc
            """)
    List<ProductVariant> findByProductIdWithAttributes(@Param("productId") Long productId);

    @Query("""
            select distinct v
            from ProductVariant v
            left join fetch v.product p
            left join fetch v.variantAttributeValues vav
            left join fetch vav.attributeValue av
            left join fetch av.attribute a
            where v.id = :id
            """)
    Optional<ProductVariant> findByIdWithAttributes(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select v
            from ProductVariant v
            where v.id = :id
            """)
    Optional<ProductVariant> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select v
            from ProductVariant v
            where v.id in :ids
            """)
    List<ProductVariant> findAllByIdInForUpdate(@Param("ids") List<Long> ids);

    @Query("""
            select distinct v
            from ProductVariant v
            left join fetch v.product p
            left join fetch p.brand
            left join fetch v.variantAttributeValues vav
            left join fetch vav.attributeValue av
            left join fetch av.attribute a
            where v.deletedAt is null
              and v.isActive = true
              and p.deletedAt is null
              and p.isActive = true
            order by p.name asc, v.id asc
            """)
    List<ProductVariant> findAllActiveWithAttributes();

    @Query("""
            select distinct v
            from ProductVariant v
            left join fetch v.product p
            left join fetch p.brand
            left join fetch v.variantAttributeValues vav
            left join fetch vav.attributeValue av
            left join fetch av.attribute a
            where v.deletedAt is null
              and v.isActive = true
              and p.deletedAt is null
              and p.isActive = true
              and (
                    lower(p.name) like lower(concat('%', :keyword, '%'))
                 or lower(p.code) like lower(concat('%', :keyword, '%'))
                 or lower(v.code) like lower(concat('%', :keyword, '%'))
                 or lower(coalesce(v.barcode, '')) like lower(concat('%', :keyword, '%'))
              )
            order by p.name asc, v.id asc
            """)
    List<ProductVariant> searchForPos(@Param("keyword") String keyword);

    @Query("""
            select v.id
            from ProductVariant v
            where v.product.id = :productId
              and v.deletedAt is null
              and (:excludedVariantId is null or v.id <> :excludedVariantId)
              and (
                    select count(vav)
                    from VariantAttributeValue vav
                    where vav.variant = v
                      and vav.attributeValue.id in :attributeValueIds
              ) = :attributeCount
              and (
                    select count(vavAll)
                    from VariantAttributeValue vavAll
                    where vavAll.variant = v
              ) = :attributeCount
            """)
    List<Long> findDuplicateVariantIdsByAttributeValueIds(
            @Param("productId") Long productId,
            @Param("attributeValueIds") List<Long> attributeValueIds,
            @Param("attributeCount") long attributeCount,
            @Param("excludedVariantId") Long excludedVariantId
    );
}
