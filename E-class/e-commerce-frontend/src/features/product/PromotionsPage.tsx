import { Col, Empty, Pagination, Row, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductListDisplay from "./Products";
import { productService } from "@/services/product.service";
import { PageResponse, ProductList as ProductItem } from "./product.model";
import FilterSidebar, { ProductFilters } from "./components/FilterSidebar";
import PageToolbar from "./components/PageToolbar";

const { Text, Title } = Typography;

const saleSortOptions = [
  { value: "discountDesc", label: "Giảm giá cao nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "priceAsc", label: "Giá tăng dần" },
  { value: "priceDesc", label: "Giá giảm dần" },
];

const PromotionsPage = () => {
  const [products, setProducts] = useState<PageResponse<ProductItem>>();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const keyword = (searchParams.get("search") || searchParams.get("keyword") || "").trim();
  const [filters, setFilters] = useState<ProductFilters>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const [sort, setSort] = useState("discountDesc");

  const requestParams = useMemo(
    () => ({
      page: pagination.current - 1,
      size: pagination.pageSize,
      keyword: keyword || undefined,
      categoryId: filters.categoryId || undefined,
      brandId: filters.brandId || undefined,
      minSalePrice: filters.minPrice || undefined,
      maxSalePrice: filters.maxPrice || undefined,
      discountMin: filters.discountMin || undefined,
      discountMax: filters.discountMax || undefined,
      sizeValue: filters.size || undefined,
      color: filters.color || undefined,
      material: filters.material || undefined,
      sort,
    }),
    [pagination, keyword, filters, sort],
  );

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await productService.getPromotionProducts(requestParams);
        setProducts(res.data);
      } catch (error: any) {
        message.error(
          error?.response?.data?.message ||
            "Không thể tải danh sách sản phẩm khuyến mãi.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [requestParams]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [keyword]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [categoryRes, brandRes, sizeRes, colorRes, materialRes] = await Promise.all([
          productService.getCategories(),
          productService.getBrands(),
          productService.getSizes(),
          productService.getColors(),
          productService.getMaterials(),
        ]);
        setCategories(categoryRes.data || []);
        setBrands(brandRes.data || []);
        setSizes(sizeRes.data || []);
        setColors(colorRes.data || []);
        setMaterials(materialRes.data || []);
      } catch {
        message.error("Không thể tải bộ lọc sản phẩm.");
      }
    };

    fetchOptions();
  }, []);

  const updateFilters = (patch: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const resetFilters = () => {
    setFilters({});
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const shown = products?.content?.length || 0;

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div className="page-title-block">
        <Title level={2}>Sản phẩm khuyến mãi</Title>
        <Text type="secondary">Săn ưu đãi hấp dẫn cho những mẫu giày chất lượng</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={6}>
          <FilterSidebar
            filters={filters}
            categories={categories}
            brands={brands}
            sizes={sizes}
            colors={colors}
            materials={materials}
            saleMode
            onChange={updateFilters}
            onReset={resetFilters}
          />
        </Col>
        <Col xs={24} lg={18}>
          <div className="product-list-panel">
            <Spin spinning={loading}>
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <PageToolbar
                  shown={shown}
                  total={products?.totalElements || 0}
                  sort={sort}
                  pageSize={pagination.pageSize}
                  sortOptions={saleSortOptions}
                  onSortChange={(value) => {
                    setSort(value);
                    setPagination((prev) => ({ ...prev, current: 1 }));
                  }}
                  onPageSizeChange={(pageSize) => setPagination({ current: 1, pageSize })}
                />

                {shown > 0 ? (
                  <ProductListDisplay products={products?.content || []} hideTitle mode="sale" />
                ) : (
                  !loading && <Empty description="Hiện chưa có sản phẩm khuyến mãi." />
                )}

                <Pagination
                  align="center"
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={products?.totalElements || 0}
                  showSizeChanger={false}
                  onChange={(page) => setPagination((prev) => ({ ...prev, current: page }))}
                />
              </Space>
            </Spin>
          </div>
        </Col>
      </Row>
    </Space>
  );
};

export default PromotionsPage;
