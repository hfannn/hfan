package com.vn.backend.repository;

import com.vn.backend.dto.response.BestSellerProductRow;
import com.vn.backend.dto.response.statistics.OverviewStatisticsProjection;
import com.vn.backend.dto.response.statistics.TopProductResponse;
import com.vn.backend.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StatisticsRepository extends JpaRepository<Order, Integer> {

    @Query(value = """
        WITH paid_orders AS (
            SELECT
                p.order_id,
                MIN(COALESCE(p.paid_at, p.created_at)) AS paid_at
            FROM payments p
            WHERE p.status = 'PAID'
            GROUP BY p.order_id
        ),
        order_summary AS (
            SELECT
                o.id AS order_id,
                DATE_TRUNC('day', po.paid_at) AS bucket,
                COALESCE(SUM(oi.quantity), 0) AS items_sold,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) - COALESCE(SUM(oi.quantity * oi.cost_price_at_purchase), 0) AS profit,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) AS revenue
            FROM orders o
            JOIN paid_orders po ON po.order_id = o.id
            JOIN order_items oi ON oi.order_id = o.id
            WHERE (
                    :orderType IS NULL
                    OR :orderType = 'ALL'
                    OR UPPER(o.order_type) = UPPER(:orderType)
              )
              AND (:fromDate IS NULL OR po.paid_at >= CAST(:fromDate AS timestamp))
              AND (:toDate IS NULL OR po.paid_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
            GROUP BY o.id, DATE_TRUNC('day', po.paid_at), o.discount_amount, o.product_revenue, o.subtotal_before_voucher
        )
        SELECT
            TO_CHAR(bucket, 'YYYY-MM-DD') AS label,
            COUNT(order_id) AS totalOrders,
            COALESCE(SUM(revenue), 0) AS revenue,
            COALESCE(SUM(items_sold), 0) AS itemsSold,
            COALESCE(SUM(profit), 0) AS profit
        FROM order_summary
        GROUP BY bucket
        ORDER BY bucket
    """, nativeQuery = true)
    List<Object[]> getRevenueByDay(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("orderType") String orderType
    );

    @Query(value = """
        WITH paid_orders AS (
            SELECT
                p.order_id,
                MIN(COALESCE(p.paid_at, p.created_at)) AS paid_at
            FROM payments p
            WHERE p.status = 'PAID'
            GROUP BY p.order_id
        ),
        order_summary AS (
            SELECT
                o.id AS order_id,
                DATE_TRUNC('week', po.paid_at) AS bucket,
                COALESCE(SUM(oi.quantity), 0) AS items_sold,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) - COALESCE(SUM(oi.quantity * oi.cost_price_at_purchase), 0) AS profit,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) AS revenue
            FROM orders o
            JOIN paid_orders po ON po.order_id = o.id
            JOIN order_items oi ON oi.order_id = o.id
            WHERE (
                    :orderType IS NULL
                    OR :orderType = 'ALL'
                    OR UPPER(o.order_type) = UPPER(:orderType)
              )
              AND (:fromDate IS NULL OR po.paid_at >= CAST(:fromDate AS timestamp))
              AND (:toDate IS NULL OR po.paid_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
            GROUP BY o.id, DATE_TRUNC('week', po.paid_at), o.discount_amount, o.product_revenue, o.subtotal_before_voucher
        )
        SELECT
            TO_CHAR(bucket, 'YYYY-MM-DD') AS label,
            COUNT(order_id) AS totalOrders,
            COALESCE(SUM(revenue), 0) AS revenue,
            COALESCE(SUM(items_sold), 0) AS itemsSold,
            COALESCE(SUM(profit), 0) AS profit
        FROM order_summary
        GROUP BY bucket
        ORDER BY bucket
    """, nativeQuery = true)
    List<Object[]> getRevenueByWeek(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("orderType") String orderType
    );

    @Query(value = """
        WITH paid_orders AS (
            SELECT
                p.order_id,
                MIN(COALESCE(p.paid_at, p.created_at)) AS paid_at
            FROM payments p
            WHERE p.status = 'PAID'
            GROUP BY p.order_id
        ),
        order_summary AS (
            SELECT
                o.id AS order_id,
                DATE_TRUNC('month', po.paid_at) AS bucket,
                COALESCE(SUM(oi.quantity), 0) AS items_sold,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) - COALESCE(SUM(oi.quantity * oi.cost_price_at_purchase), 0) AS profit,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) AS revenue
            FROM orders o
            JOIN paid_orders po ON po.order_id = o.id
            JOIN order_items oi ON oi.order_id = o.id
            WHERE (
                    :orderType IS NULL
                    OR :orderType = 'ALL'
                    OR UPPER(o.order_type) = UPPER(:orderType)
              )
              AND (:fromDate IS NULL OR po.paid_at >= CAST(:fromDate AS timestamp))
              AND (:toDate IS NULL OR po.paid_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
            GROUP BY o.id, DATE_TRUNC('month', po.paid_at), o.discount_amount, o.product_revenue, o.subtotal_before_voucher
        )
        SELECT
            TO_CHAR(bucket, 'YYYY-MM') AS label,
            COUNT(order_id) AS totalOrders,
            COALESCE(SUM(revenue), 0) AS revenue,
            COALESCE(SUM(items_sold), 0) AS itemsSold,
            COALESCE(SUM(profit), 0) AS profit
        FROM order_summary
        GROUP BY bucket
        ORDER BY bucket
    """, nativeQuery = true)
    List<Object[]> getRevenueByMonth(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("orderType") String orderType
    );

    @Query(value = """
        WITH paid_orders AS (
            SELECT
                p.order_id,
                MIN(COALESCE(p.paid_at, p.created_at)) AS paid_at
            FROM payments p
            WHERE p.status = 'PAID'
            GROUP BY p.order_id
        ),
        order_summary AS (
            SELECT
                o.id AS order_id,
                o.customer_id AS customer_id,
                COALESCE(SUM(oi.quantity), 0) AS total_products_sold,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) AS total_revenue,
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0))
                            - COALESCE(o.discount_amount, 0),
                        0
                    )
                ) - COALESCE(SUM(oi.quantity * oi.cost_price_at_purchase), 0) AS total_profit
            FROM orders o
            JOIN paid_orders po ON po.order_id = o.id
            JOIN order_items oi ON oi.order_id = o.id
            WHERE (
                    :orderType IS NULL
                    OR :orderType = 'ALL'
                    OR UPPER(o.order_type) = UPPER(:orderType)
              )
              AND (:fromDate IS NULL OR po.paid_at >= CAST(:fromDate AS timestamp))
              AND (:toDate IS NULL OR po.paid_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
            GROUP BY o.id, o.customer_id, o.discount_amount, o.product_revenue, o.subtotal_before_voucher
        )
        SELECT
            COUNT(order_id) AS totalOrders,
            COALESCE(SUM(total_products_sold), 0) AS totalProductsSold,
            COALESCE(SUM(total_revenue), 0) AS totalRevenue,
            COALESCE(SUM(total_profit), 0) AS totalProfit,
            COUNT(DISTINCT customer_id) AS totalCustomers
        FROM order_summary
    """, nativeQuery = true)
    OverviewStatisticsProjection getOverviewStatistics(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("orderType") String orderType
    );

    @Query(
            value = """
                WITH paid_orders AS (
                    SELECT
                        p.order_id,
                        MIN(COALESCE(p.paid_at, p.created_at)) AS paid_at
                    FROM payments p
                    WHERE p.status = 'PAID'
                    GROUP BY p.order_id
                ),
                order_item_base AS (
                    SELECT
                        p.id AS product_id,
                        p.code AS product_code,
                        p.name AS product_name,
                        b.name AS brand_name,
                        c.name AS category_name,
                        oi.quantity AS quantity,
                        COALESCE(oi.line_total, oi.quantity * oi.price_at_purchase, 0) AS line_total,
                        COALESCE(oi.quantity * oi.cost_price_at_purchase, 0) AS cost_total,
                        COALESCE(
                            NULLIF(o.subtotal_before_voucher, 0),
                            SUM(COALESCE(oi.line_total, oi.quantity * oi.price_at_purchase, 0))
                                OVER (PARTITION BY o.id),
                            0
                        ) AS order_subtotal,
                        COALESCE(o.discount_amount, 0) AS voucher_discount
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    JOIN paid_orders po ON po.order_id = o.id
                    JOIN product_variants pv ON pv.id = oi.product_variant_id
                    JOIN products p ON p.id = pv.product_id
                    LEFT JOIN brands b ON b.id = p.brand_id
                    LEFT JOIN categories c ON c.id = p.category_id
                    WHERE (
                            :orderType IS NULL
                            OR :orderType = 'ALL'
                            OR UPPER(o.order_type) = UPPER(:orderType)
                      )
                      AND (:fromDate IS NULL OR po.paid_at >= CAST(:fromDate AS timestamp))
                      AND (:toDate IS NULL OR po.paid_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
                ),
                allocated AS (
                    SELECT
                        *,
                        CASE
                            WHEN order_subtotal > 0
                            THEN voucher_discount * line_total / order_subtotal
                            ELSE 0
                        END AS allocated_voucher_discount
                    FROM order_item_base
                )
                SELECT
                    product_id AS productId,
                    product_code AS productCode,
                    product_name AS productName,
                    brand_name AS brandName,
                    category_name AS categoryName,
                    COALESCE(SUM(quantity), 0) AS totalSold,
                    COALESCE(SUM(GREATEST(line_total - allocated_voucher_discount, 0)), 0) AS revenue,
                    COALESCE(SUM(GREATEST(line_total - allocated_voucher_discount, 0) - cost_total), 0) AS profit
                FROM allocated
                GROUP BY product_id, product_code, product_name, brand_name, category_name
                ORDER BY totalSold DESC, revenue DESC
            """,
            countQuery = """
                WITH paid_orders AS (
                    SELECT
                        p.order_id,
                        MIN(COALESCE(p.paid_at, p.created_at)) AS paid_at
                    FROM payments p
                    WHERE p.status = 'PAID'
                    GROUP BY p.order_id
                )
                SELECT COUNT(*) FROM (
                    SELECT p.id
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    JOIN paid_orders po ON po.order_id = o.id
                    JOIN product_variants pv ON pv.id = oi.product_variant_id
                    JOIN products p ON p.id = pv.product_id
                    WHERE (
                            :orderType IS NULL
                            OR :orderType = 'ALL'
                            OR UPPER(o.order_type) = UPPER(:orderType)
                      )
                      AND (:fromDate IS NULL OR po.paid_at >= CAST(:fromDate AS timestamp))
                      AND (:toDate IS NULL OR po.paid_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
                    GROUP BY p.id
                ) x
            """,
            nativeQuery = true
    )
    Page<TopProductResponse> getTopProducts(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("orderType") String orderType,
            Pageable pageable
    );

    @Query(value = """
        WITH paid_orders AS (
            SELECT DISTINCT p.order_id
            FROM payments p
            JOIN orders o ON o.id = p.order_id
            WHERE p.status = 'PAID'
              AND UPPER(COALESCE(o.status, '')) NOT IN ('CANCELLED', 'FAILED', 'REFUNDED', 'PENDING_PAYMENT')
        )
        SELECT
            pr.id AS productId,
            COALESCE(SUM(oi.quantity), 0) AS soldQuantity
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN paid_orders po ON po.order_id = o.id
        JOIN product_variants pv ON pv.id = oi.product_variant_id
        JOIN products pr ON pr.id = pv.product_id
        WHERE pr.deleted_at IS NULL
          AND pr.is_active = true
          AND pv.deleted_at IS NULL
          AND pv.is_active = true
        GROUP BY pr.id
        ORDER BY soldQuantity DESC, pr.id DESC
        LIMIT :limit
    """, nativeQuery = true)
    List<BestSellerProductRow> getPublicBestSellerProductRows(@Param("limit") int limit);

    @Query(value = """
        WITH paid_orders AS (
            SELECT
                p.order_id,
                MIN(COALESCE(p.paid_at, p.created_at)) AS paid_at
            FROM payments p
            WHERE p.status = 'PAID'
            GROUP BY p.order_id
        )
        SELECT
            o.status AS status,
            COUNT(*) AS totalOrders,
            COALESCE(SUM(
                CASE
                    WHEN po.order_id IS NOT NULL
                    THEN COALESCE(
                        o.product_revenue,
                        GREATEST(
                            COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE((
                                SELECT SUM(oi.quantity * oi.price_at_purchase)
                                FROM order_items oi
                                WHERE oi.order_id = o.id
                            ), 0)) - COALESCE(o.discount_amount, 0),
                            0
                        )
                    )
                    ELSE 0
                END
            ), 0) AS totalAmount
        FROM orders o
        LEFT JOIN paid_orders po ON po.order_id = o.id
        WHERE o.status IN (
            'PENDING',
            'CONFIRMED',
            'SHIPPING',
            'COMPLETED',
            'RETURN_REQUESTED',
            'RETURNED',
            'RETURN_REJECTED',
            'CANCELLED'
        )
          AND (
                :orderType IS NULL
                OR :orderType = 'ALL'
                OR UPPER(o.order_type) = UPPER(:orderType)
          )
          AND (:fromDate IS NULL OR o.created_at >= CAST(:fromDate AS timestamp))
          AND (:toDate IS NULL OR o.created_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
        GROUP BY o.status
        ORDER BY totalOrders DESC, o.status ASC
    """, nativeQuery = true)
    List<Object[]> getOrderStatusStatistics(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("orderType") String orderType
    );

    @Query(value = """
        WITH paid_payments AS (
            SELECT DISTINCT ON (p.order_id)
                p.order_id,
                p.payment_method_id,
                COALESCE(p.paid_at, p.created_at) AS paid_at
            FROM payments p
            WHERE p.status = 'PAID'
            ORDER BY p.order_id, COALESCE(p.paid_at, p.created_at), p.id
        )
        SELECT
            COALESCE(pm.code, 'UNKNOWN') AS paymentMethodCode,
            COALESCE(pm.name, 'Khác') AS paymentMethodName,
            COUNT(DISTINCT o.id) AS totalOrders,
            COALESCE(SUM(
                COALESCE(
                    o.product_revenue,
                    GREATEST(
                        COALESCE(NULLIF(o.subtotal_before_voucher, 0), COALESCE((
                            SELECT SUM(oi.quantity * oi.price_at_purchase)
                            FROM order_items oi
                            WHERE oi.order_id = o.id
                        ), 0)) - COALESCE(o.discount_amount, 0),
                        0
                    )
                )
            ), 0) AS revenue
        FROM paid_payments pp
        JOIN orders o ON o.id = pp.order_id
        LEFT JOIN payment_methods pm ON pm.id = pp.payment_method_id
        WHERE (
                :orderType IS NULL
                OR :orderType = 'ALL'
                OR UPPER(o.order_type) = UPPER(:orderType)
          )
          AND (:fromDate IS NULL OR pp.paid_at >= CAST(:fromDate AS timestamp))
          AND (:toDate IS NULL OR pp.paid_at < (CAST(:toDate AS timestamp) + INTERVAL '1 day'))
        GROUP BY pm.code, pm.name
        ORDER BY revenue DESC, paymentMethodName ASC
    """, nativeQuery = true)
    List<Object[]> getRevenueByPaymentMethod(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("orderType") String orderType
    );
}
