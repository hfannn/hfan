package com.vn.backend.repository;

import com.vn.backend.dto.response.ProductListResponse;
import com.vn.backend.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsByCodeAndDeletedAtIsNull(String code);

    boolean existsByCodeAndDeletedAtIsNullAndIdNot(String code, Long id);

    Optional<Product> findByIdAndDeletedAtIsNull(Long id);

    @Query("""
            select p
            from Product p
            left join fetch p.brand
            left join fetch p.category
            left join fetch p.origin
            left join fetch p.supplier
            left join fetch p.images
            where p.id = :id
              and p.deletedAt is null
              and (:includeInactive = true or p.isActive = true)
            """)
    Optional<Product> findDetailById(
            @Param("id") Long id,
            @Param("includeInactive") boolean includeInactive
    );

    @Query(
            value = """
                    select new com.vn.backend.dto.response.ProductListResponse(
                        p.id,
                        p.code,
                        p.name,
                        b.name,
                        (
                            select min(pi.imageUrl)
                            from ProductImage pi
                            where pi.product = p
                        ),
                        coalesce(sum(v.stockQuantity), 0),
                        min(v.sellingPrice),
                        max(v.sellingPrice),
                        min(v.costPrice),
                        max(v.costPrice),
                        p.isActive
                    )
                    from Product p
                    left join p.brand b
                    left join p.category c
                    left join p.variants v
                        on v.deletedAt is null
                        and (:includeInactive = true or v.isActive = true)
                    where p.deletedAt is null
                      and (:includeInactive = true or p.isActive = true)
                      and (:categoryId is null or c.id = :categoryId)
                      and (:brandId is null or b.id = :brandId)
                    group by p.id, p.code, p.name, b.name, p.isActive
                    order by p.id desc
                    """,
            countQuery = """
                    select count(p.id)
                    from Product p
                    left join p.category c
                    left join p.brand b
                    where p.deletedAt is null
                      and (:includeInactive = true or p.isActive = true)
                      and (:categoryId is null or c.id = :categoryId)
                      and (:brandId is null or b.id = :brandId)
                    """
    )
    Page<ProductListResponse> findProductList(
            Pageable pageable,
            @Param("categoryId") Long categoryId,
            @Param("brandId") Long brandId,
            @Param("includeInactive") boolean includeInactive
    );

    @Query(
            value = """
                    select distinct p
                    from Product p
                    left join p.brand b
                    left join p.category c
                    where p.deletedAt is null
                      and p.isActive = true
                      and (:keywordPattern is null or lower(p.name) like :keywordPattern or lower(p.code) like :keywordPattern)
                      and (:categoryId is null or c.id = :categoryId)
                      and (:brandId is null or b.id = :brandId)
                      and exists (
                            select 1
                            from ProductVariant v
                            where v.product = p
                              and v.deletedAt is null
                              and v.isActive = true
                              and (:minPrice is null or (
                                    v.sellingPrice * (
                                        100 - coalesce((
                                            select max(activePromo.discountPercent)
                                            from PromotionVariant activePv
                                            join activePv.promotion activePromo
                                            where activePv.variant = v
                                              and activePromo.status = true
                                              and activePromo.discountPercent > 0
                                              and activePromo.startDate <= :now
                                              and activePromo.endDate >= :now
                                        ), 0)
                                    ) / 100
                              ) >= :minPrice)
                              and (:maxPrice is null or (
                                    v.sellingPrice * (
                                        100 - coalesce((
                                            select max(activePromo.discountPercent)
                                            from PromotionVariant activePv
                                            join activePv.promotion activePromo
                                            where activePv.variant = v
                                              and activePromo.status = true
                                              and activePromo.discountPercent > 0
                                              and activePromo.startDate <= :now
                                              and activePromo.endDate >= :now
                                        ), 0)
                                    ) / 100
                              ) <= :maxPrice)
                              and (:sizeFilter is null or exists (
                                    select 1 from VariantAttributeValue vav
                                    join vav.attributeValue av
                                    join av.attribute a
                                    where vav.variant = v
                                      and upper(a.code) = 'SIZE'
                                      and lower(av.value) = :sizeFilter
                              ))
                              and (:colorFilter is null or exists (
                                    select 1 from VariantAttributeValue vav
                                    join vav.attributeValue av
                                    join av.attribute a
                                    where vav.variant = v
                                      and upper(a.code) = 'COLOR'
                                      and lower(av.value) = :colorFilter
                              ))
                              and (:materialFilter is null or exists (
                                    select 1 from VariantAttributeValue vav
                                    join vav.attributeValue av
                                    join av.attribute a
                                    where vav.variant = v
                                      and upper(a.code) = 'MATERIAL'
                                      and lower(av.value) = :materialFilter
                              ))
                      )
                      and (
                            :isSale is null
                            or (
                                :isSale = true
                                and exists (
                                    select 1
                                    from PromotionVariant pv
                                    join pv.promotion promo
                                    join pv.variant saleVariant
                                    where saleVariant.product = p
                                      and saleVariant.deletedAt is null
                                      and saleVariant.isActive = true
                                      and promo.status = true
                                      and promo.discountPercent > 0
                                      and promo.startDate <= :now
                                      and promo.endDate >= :now
                                )
                            )
                            or (
                                :isSale = false
                                and not exists (
                                    select 1
                                    from PromotionVariant pv
                                    join pv.promotion promo
                                    join pv.variant saleVariant
                                    where saleVariant.product = p
                                      and saleVariant.deletedAt is null
                                      and saleVariant.isActive = true
                                      and promo.status = true
                                      and promo.discountPercent > 0
                                      and promo.startDate <= :now
                                      and promo.endDate >= :now
                                )
                            )
                      )
                      and (:campaignId is null or exists (
                            select 1
                            from PromotionVariant campaignPv
                            join campaignPv.promotion campaignPromo
                            join campaignPv.variant campaignVariant
                            where campaignVariant.product = p
                              and campaignVariant.deletedAt is null
                              and campaignVariant.isActive = true
                              and campaignPromo.id = :campaignId
                              and campaignPromo.status = true
                              and campaignPromo.discountPercent > 0
                              and campaignPromo.startDate <= :now
                              and campaignPromo.endDate >= :now
                      ))
                      and (:discountMin is null or exists (
                            select 1
                            from PromotionVariant discountPv
                            join discountPv.promotion discountPromo
                            join discountPv.variant discountVariant
                            where discountVariant.product = p
                              and discountVariant.deletedAt is null
                              and discountVariant.isActive = true
                              and discountPromo.status = true
                              and discountPromo.discountPercent > 0
                              and discountPromo.startDate <= :now
                              and discountPromo.endDate >= :now
                              and discountPromo.discountPercent >= :discountMin
                      ))
                      and (:discountMax is null or exists (
                            select 1
                            from PromotionVariant discountPv
                            join discountPv.promotion discountPromo
                            join discountPv.variant discountVariant
                            where discountVariant.product = p
                              and discountVariant.deletedAt is null
                              and discountVariant.isActive = true
                              and discountPromo.status = true
                              and discountPromo.discountPercent > 0
                              and discountPromo.startDate <= :now
                              and discountPromo.endDate >= :now
                              and discountPromo.discountPercent <= :discountMax
                      ))
                    """,
            countQuery = """
                    select count(distinct p.id)
                    from Product p
                    left join p.category c
                    left join p.brand b
                    where p.deletedAt is null
                      and p.isActive = true
                      and (:keywordPattern is null or lower(p.name) like :keywordPattern or lower(p.code) like :keywordPattern)
                      and (:categoryId is null or c.id = :categoryId)
                      and (:brandId is null or b.id = :brandId)
                      and exists (
                            select 1
                            from ProductVariant v
                            where v.product = p
                              and v.deletedAt is null
                              and v.isActive = true
                              and (:minPrice is null or (
                                    v.sellingPrice * (
                                        100 - coalesce((
                                            select max(activePromo.discountPercent)
                                            from PromotionVariant activePv
                                            join activePv.promotion activePromo
                                            where activePv.variant = v
                                              and activePromo.status = true
                                              and activePromo.discountPercent > 0
                                              and activePromo.startDate <= :now
                                              and activePromo.endDate >= :now
                                        ), 0)
                                    ) / 100
                              ) >= :minPrice)
                              and (:maxPrice is null or (
                                    v.sellingPrice * (
                                        100 - coalesce((
                                            select max(activePromo.discountPercent)
                                            from PromotionVariant activePv
                                            join activePv.promotion activePromo
                                            where activePv.variant = v
                                              and activePromo.status = true
                                              and activePromo.discountPercent > 0
                                              and activePromo.startDate <= :now
                                              and activePromo.endDate >= :now
                                        ), 0)
                                    ) / 100
                              ) <= :maxPrice)
                              and (:sizeFilter is null or exists (
                                    select 1 from VariantAttributeValue vav
                                    join vav.attributeValue av
                                    join av.attribute a
                                    where vav.variant = v
                                      and upper(a.code) = 'SIZE'
                                      and lower(av.value) = :sizeFilter
                              ))
                              and (:colorFilter is null or exists (
                                    select 1 from VariantAttributeValue vav
                                    join vav.attributeValue av
                                    join av.attribute a
                                    where vav.variant = v
                                      and upper(a.code) = 'COLOR'
                                      and lower(av.value) = :colorFilter
                              ))
                              and (:materialFilter is null or exists (
                                    select 1 from VariantAttributeValue vav
                                    join vav.attributeValue av
                                    join av.attribute a
                                    where vav.variant = v
                                      and upper(a.code) = 'MATERIAL'
                                      and lower(av.value) = :materialFilter
                              ))
                      )
                      and (
                            :isSale is null
                            or (
                                :isSale = true
                                and exists (
                                    select 1
                                    from PromotionVariant pv
                                    join pv.promotion promo
                                    join pv.variant saleVariant
                                    where saleVariant.product = p
                                      and saleVariant.deletedAt is null
                                      and saleVariant.isActive = true
                                      and promo.status = true
                                      and promo.discountPercent > 0
                                      and promo.startDate <= :now
                                      and promo.endDate >= :now
                                )
                            )
                            or (
                                :isSale = false
                                and not exists (
                                    select 1
                                    from PromotionVariant pv
                                    join pv.promotion promo
                                    join pv.variant saleVariant
                                    where saleVariant.product = p
                                      and saleVariant.deletedAt is null
                                      and saleVariant.isActive = true
                                      and promo.status = true
                                      and promo.discountPercent > 0
                                      and promo.startDate <= :now
                                      and promo.endDate >= :now
                                )
                            )
                      )
                      and (:campaignId is null or exists (
                            select 1
                            from PromotionVariant campaignPv
                            join campaignPv.promotion campaignPromo
                            join campaignPv.variant campaignVariant
                            where campaignVariant.product = p
                              and campaignVariant.deletedAt is null
                              and campaignVariant.isActive = true
                              and campaignPromo.id = :campaignId
                              and campaignPromo.status = true
                              and campaignPromo.discountPercent > 0
                              and campaignPromo.startDate <= :now
                              and campaignPromo.endDate >= :now
                      ))
                      and (:discountMin is null or exists (
                            select 1
                            from PromotionVariant discountPv
                            join discountPv.promotion discountPromo
                            join discountPv.variant discountVariant
                            where discountVariant.product = p
                              and discountVariant.deletedAt is null
                              and discountVariant.isActive = true
                              and discountPromo.status = true
                              and discountPromo.discountPercent > 0
                              and discountPromo.startDate <= :now
                              and discountPromo.endDate >= :now
                              and discountPromo.discountPercent >= :discountMin
                      ))
                      and (:discountMax is null or exists (
                            select 1
                            from PromotionVariant discountPv
                            join discountPv.promotion discountPromo
                            join discountPv.variant discountVariant
                            where discountVariant.product = p
                              and discountVariant.deletedAt is null
                              and discountVariant.isActive = true
                              and discountPromo.status = true
                              and discountPromo.discountPercent > 0
                              and discountPromo.startDate <= :now
                              and discountPromo.endDate >= :now
                              and discountPromo.discountPercent <= :discountMax
                      ))
                    """
    )
    Page<Product> filterProducts(
            Pageable pageable,
            @Param("keywordPattern") String keywordPattern,
            @Param("categoryId") Long categoryId,
            @Param("brandId") Long brandId,
            @Param("sizeFilter") String sizeFilter,
            @Param("colorFilter") String colorFilter,
            @Param("materialFilter") String materialFilter,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("isSale") Boolean isSale,
            @Param("campaignId") Long campaignId,
            @Param("discountMin") BigDecimal discountMin,
            @Param("discountMax") BigDecimal discountMax,
            @Param("now") java.time.OffsetDateTime now
    );

    @Query(
            value = """
                    select distinct p.id
                    from products p
                    left join brands b on b.id = p.brand_id
                    left join categories c on c.id = p.category_id
                    where p.deleted_at is null
                      and p.is_active = true
                      and (cast(:keywordPattern as text) is null or lower(p.name) like cast(:keywordPattern as text) or lower(p.code) like cast(:keywordPattern as text))
                      and (cast(:categoryId as bigint) is null or c.id = cast(:categoryId as bigint))
                      and (cast(:brandId as bigint) is null or b.id = cast(:brandId as bigint))
                      and exists (
                            select 1
                            from product_variants v
                            where v.product_id = p.id
                              and v.deleted_at is null
                              and v.is_active = true
                              and (
                                    cast(:minPrice as numeric) is null
                                    or (
                                        v.selling_price * (
                                            100 - coalesce((
                                                select max(active_promo.discount_percent)
                                                from promotion_variant active_pv
                                                join discount_campaign active_promo on active_promo.id = active_pv.promotion_id
                                                where active_pv.variant_id = v.id
                                                  and active_promo.status = true
                                                  and active_promo.discount_percent > 0
                                                  and active_promo.start_date <= :now
                                                  and active_promo.end_date >= :now
                                            ), 0)
                                        ) / 100
                                    ) >= cast(:minPrice as numeric)
                              )
                              and (
                                    cast(:maxPrice as numeric) is null
                                    or (
                                        v.selling_price * (
                                            100 - coalesce((
                                                select max(active_promo.discount_percent)
                                                from promotion_variant active_pv
                                                join discount_campaign active_promo on active_promo.id = active_pv.promotion_id
                                                where active_pv.variant_id = v.id
                                                  and active_promo.status = true
                                                  and active_promo.discount_percent > 0
                                                  and active_promo.start_date <= :now
                                                  and active_promo.end_date >= :now
                                            ), 0)
                                        ) / 100
                                    ) <= cast(:maxPrice as numeric)
                              )
                              and (
                                    cast(:sizeFilter as text) is null
                                    or exists (
                                        select 1
                                        from variant_attribute_values vav
                                        join attribute_values av on av.id = vav.attribute_value_id
                                        join attributes a on a.id = av.attribute_id
                                        where vav.variant_id = v.id
                                          and upper(a.code) = 'SIZE'
                                          and lower(av.value) = cast(:sizeFilter as text)
                                    )
                              )
                              and (
                                    cast(:colorFilter as text) is null
                                    or exists (
                                        select 1
                                        from variant_attribute_values vav
                                        join attribute_values av on av.id = vav.attribute_value_id
                                        join attributes a on a.id = av.attribute_id
                                        where vav.variant_id = v.id
                                          and upper(a.code) = 'COLOR'
                                          and lower(av.value) = cast(:colorFilter as text)
                                    )
                              )
                              and (
                                    cast(:materialFilter as text) is null
                                    or exists (
                                        select 1
                                        from variant_attribute_values vav
                                        join attribute_values av on av.id = vav.attribute_value_id
                                        join attributes a on a.id = av.attribute_id
                                        where vav.variant_id = v.id
                                          and upper(a.code) = 'MATERIAL'
                                          and lower(av.value) = cast(:materialFilter as text)
                                    )
                              )
                      )
                      and (
                            cast(:isSale as boolean) is null
                            or (
                                cast(:isSale as boolean) = true
                                and exists (
                                    select 1
                                    from promotion_variant pv
                                    join discount_campaign promo on promo.id = pv.promotion_id
                                    join product_variants sale_variant on sale_variant.id = pv.variant_id
                                    where sale_variant.product_id = p.id
                                      and sale_variant.deleted_at is null
                                      and sale_variant.is_active = true
                                      and promo.status = true
                                      and promo.discount_percent > 0
                                      and promo.start_date <= :now
                                      and promo.end_date >= :now
                                )
                            )
                            or (
                                cast(:isSale as boolean) = false
                                and not exists (
                                    select 1
                                    from promotion_variant pv
                                    join discount_campaign promo on promo.id = pv.promotion_id
                                    join product_variants sale_variant on sale_variant.id = pv.variant_id
                                    where sale_variant.product_id = p.id
                                      and sale_variant.deleted_at is null
                                      and sale_variant.is_active = true
                                      and promo.status = true
                                      and promo.discount_percent > 0
                                      and promo.start_date <= :now
                                      and promo.end_date >= :now
                                )
                            )
                      )
                      and (
                            cast(:campaignId as bigint) is null
                            or exists (
                                select 1
                                from promotion_variant campaign_pv
                                join discount_campaign campaign_promo on campaign_promo.id = campaign_pv.promotion_id
                                join product_variants campaign_variant on campaign_variant.id = campaign_pv.variant_id
                                where campaign_variant.product_id = p.id
                                  and campaign_variant.deleted_at is null
                                  and campaign_variant.is_active = true
                                  and campaign_promo.id = cast(:campaignId as bigint)
                                  and campaign_promo.status = true
                                  and campaign_promo.discount_percent > 0
                                  and campaign_promo.start_date <= :now
                                  and campaign_promo.end_date >= :now
                            )
                      )
                      and (
                            cast(:discountMin as numeric) is null
                            or exists (
                                select 1
                                from promotion_variant discount_pv
                                join discount_campaign discount_promo on discount_promo.id = discount_pv.promotion_id
                                join product_variants discount_variant on discount_variant.id = discount_pv.variant_id
                                where discount_variant.product_id = p.id
                                  and discount_variant.deleted_at is null
                                  and discount_variant.is_active = true
                                  and discount_promo.status = true
                                  and discount_promo.discount_percent > 0
                                  and discount_promo.start_date <= :now
                                  and discount_promo.end_date >= :now
                                  and discount_promo.discount_percent >= cast(:discountMin as numeric)
                            )
                      )
                      and (
                            cast(:discountMax as numeric) is null
                            or exists (
                                select 1
                                from promotion_variant discount_pv
                                join discount_campaign discount_promo on discount_promo.id = discount_pv.promotion_id
                                join product_variants discount_variant on discount_variant.id = discount_pv.variant_id
                                where discount_variant.product_id = p.id
                                  and discount_variant.deleted_at is null
                                  and discount_variant.is_active = true
                                  and discount_promo.status = true
                                  and discount_promo.discount_percent > 0
                                  and discount_promo.start_date <= :now
                                  and discount_promo.end_date >= :now
                                  and discount_promo.discount_percent <= cast(:discountMax as numeric)
                            )
                      )
                    order by p.id desc
                    """,
            countQuery = """
                    select count(distinct p.id)
                    from products p
                    left join brands b on b.id = p.brand_id
                    left join categories c on c.id = p.category_id
                    where p.deleted_at is null
                      and p.is_active = true
                      and (cast(:keywordPattern as text) is null or lower(p.name) like cast(:keywordPattern as text) or lower(p.code) like cast(:keywordPattern as text))
                      and (cast(:categoryId as bigint) is null or c.id = cast(:categoryId as bigint))
                      and (cast(:brandId as bigint) is null or b.id = cast(:brandId as bigint))
                      and exists (
                            select 1
                            from product_variants v
                            where v.product_id = p.id
                              and v.deleted_at is null
                              and v.is_active = true
                              and (
                                    cast(:minPrice as numeric) is null
                                    or (
                                        v.selling_price * (
                                            100 - coalesce((
                                                select max(active_promo.discount_percent)
                                                from promotion_variant active_pv
                                                join discount_campaign active_promo on active_promo.id = active_pv.promotion_id
                                                where active_pv.variant_id = v.id
                                                  and active_promo.status = true
                                                  and active_promo.discount_percent > 0
                                                  and active_promo.start_date <= :now
                                                  and active_promo.end_date >= :now
                                            ), 0)
                                        ) / 100
                                    ) >= cast(:minPrice as numeric)
                              )
                              and (
                                    cast(:maxPrice as numeric) is null
                                    or (
                                        v.selling_price * (
                                            100 - coalesce((
                                                select max(active_promo.discount_percent)
                                                from promotion_variant active_pv
                                                join discount_campaign active_promo on active_promo.id = active_pv.promotion_id
                                                where active_pv.variant_id = v.id
                                                  and active_promo.status = true
                                                  and active_promo.discount_percent > 0
                                                  and active_promo.start_date <= :now
                                                  and active_promo.end_date >= :now
                                            ), 0)
                                        ) / 100
                                    ) <= cast(:maxPrice as numeric)
                              )
                              and (
                                    cast(:sizeFilter as text) is null
                                    or exists (
                                        select 1
                                        from variant_attribute_values vav
                                        join attribute_values av on av.id = vav.attribute_value_id
                                        join attributes a on a.id = av.attribute_id
                                        where vav.variant_id = v.id
                                          and upper(a.code) = 'SIZE'
                                          and lower(av.value) = cast(:sizeFilter as text)
                                    )
                              )
                              and (
                                    cast(:colorFilter as text) is null
                                    or exists (
                                        select 1
                                        from variant_attribute_values vav
                                        join attribute_values av on av.id = vav.attribute_value_id
                                        join attributes a on a.id = av.attribute_id
                                        where vav.variant_id = v.id
                                          and upper(a.code) = 'COLOR'
                                          and lower(av.value) = cast(:colorFilter as text)
                                    )
                              )
                              and (
                                    cast(:materialFilter as text) is null
                                    or exists (
                                        select 1
                                        from variant_attribute_values vav
                                        join attribute_values av on av.id = vav.attribute_value_id
                                        join attributes a on a.id = av.attribute_id
                                        where vav.variant_id = v.id
                                          and upper(a.code) = 'MATERIAL'
                                          and lower(av.value) = cast(:materialFilter as text)
                                    )
                              )
                      )
                      and (
                            cast(:isSale as boolean) is null
                            or (
                                cast(:isSale as boolean) = true
                                and exists (
                                    select 1
                                    from promotion_variant pv
                                    join discount_campaign promo on promo.id = pv.promotion_id
                                    join product_variants sale_variant on sale_variant.id = pv.variant_id
                                    where sale_variant.product_id = p.id
                                      and sale_variant.deleted_at is null
                                      and sale_variant.is_active = true
                                      and promo.status = true
                                      and promo.discount_percent > 0
                                      and promo.start_date <= :now
                                      and promo.end_date >= :now
                                )
                            )
                            or (
                                cast(:isSale as boolean) = false
                                and not exists (
                                    select 1
                                    from promotion_variant pv
                                    join discount_campaign promo on promo.id = pv.promotion_id
                                    join product_variants sale_variant on sale_variant.id = pv.variant_id
                                    where sale_variant.product_id = p.id
                                      and sale_variant.deleted_at is null
                                      and sale_variant.is_active = true
                                      and promo.status = true
                                      and promo.discount_percent > 0
                                      and promo.start_date <= :now
                                      and promo.end_date >= :now
                                )
                            )
                      )
                      and (
                            cast(:campaignId as bigint) is null
                            or exists (
                                select 1
                                from promotion_variant campaign_pv
                                join discount_campaign campaign_promo on campaign_promo.id = campaign_pv.promotion_id
                                join product_variants campaign_variant on campaign_variant.id = campaign_pv.variant_id
                                where campaign_variant.product_id = p.id
                                  and campaign_variant.deleted_at is null
                                  and campaign_variant.is_active = true
                                  and campaign_promo.id = cast(:campaignId as bigint)
                                  and campaign_promo.status = true
                                  and campaign_promo.discount_percent > 0
                                  and campaign_promo.start_date <= :now
                                  and campaign_promo.end_date >= :now
                            )
                      )
                      and (
                            cast(:discountMin as numeric) is null
                            or exists (
                                select 1
                                from promotion_variant discount_pv
                                join discount_campaign discount_promo on discount_promo.id = discount_pv.promotion_id
                                join product_variants discount_variant on discount_variant.id = discount_pv.variant_id
                                where discount_variant.product_id = p.id
                                  and discount_variant.deleted_at is null
                                  and discount_variant.is_active = true
                                  and discount_promo.status = true
                                  and discount_promo.discount_percent > 0
                                  and discount_promo.start_date <= :now
                                  and discount_promo.end_date >= :now
                                  and discount_promo.discount_percent >= cast(:discountMin as numeric)
                            )
                      )
                      and (
                            cast(:discountMax as numeric) is null
                            or exists (
                                select 1
                                from promotion_variant discount_pv
                                join discount_campaign discount_promo on discount_promo.id = discount_pv.promotion_id
                                join product_variants discount_variant on discount_variant.id = discount_pv.variant_id
                                where discount_variant.product_id = p.id
                                  and discount_variant.deleted_at is null
                                  and discount_variant.is_active = true
                                  and discount_promo.status = true
                                  and discount_promo.discount_percent > 0
                                  and discount_promo.start_date <= :now
                                  and discount_promo.end_date >= :now
                                  and discount_promo.discount_percent <= cast(:discountMax as numeric)
                            )
                      )
                    """,
            nativeQuery = true
    )
    Page<Long> filterProductIds(
            Pageable pageable,
            @Param("keywordPattern") String keywordPattern,
            @Param("categoryId") Long categoryId,
            @Param("brandId") Long brandId,
            @Param("sizeFilter") String sizeFilter,
            @Param("colorFilter") String colorFilter,
            @Param("materialFilter") String materialFilter,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("isSale") Boolean isSale,
            @Param("campaignId") Long campaignId,
            @Param("discountMin") BigDecimal discountMin,
            @Param("discountMax") BigDecimal discountMax,
            @Param("now") java.time.OffsetDateTime now
    );

    @Query("""
            select distinct p
            from Product p
            left join fetch p.brand
            left join fetch p.category
            left join fetch p.images
            where p.id in :ids
              and p.deletedAt is null
              and p.isActive = true
            """)
    List<Product> findActiveProductsByIds(@Param("ids") List<Long> ids);
}
