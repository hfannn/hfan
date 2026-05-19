import { Col, Empty, Pagination, Row, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductListDisplay from "./Products";
import { productService } from "@/services/product.service";
import { PageResponse, ProductList as ProductItem } from "./product.model";
import FilterSidebar, { ProductFilters } from "./components/FilterSidebar";
import PageToolbar from "./components/PageToolbar";

const { Text, Title } = Typography;

const sortOptions = [
  { value: "newest", label: "Mới nhất" },
  { value: "priceAsc", label: "Giá tăng dần" },
  { value: "priceDesc", label: "Giá giảm dần" },
];

const ProductPage = () => {
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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12 });
  const [sort, setSort] = useState("newest");

  const requestParams = useMemo(
    () => ({
      page: pagination.current - 1,
      size: pagination.pageSize,
      keyword: keyword || undefined,
      categoryId: filters.categoryId || undefined,
      brandId: filters.brandId || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      sizeValue: filters.size || undefined,
      color: filters.color || undefined,
      material: filters.material || undefined,
      sort,
      excludePromotion: true,
      isSale: false,
    }),
    [pagination, keyword, filters, sort],
  );

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await productService.filterProducts(requestParams);
        setProducts(res.data);
      } catch {
        message.error("Không thể tải danh sách sản phẩm.");
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
      <div className="page-intro">
        <Title level={2}>Sản phẩm</Title>
        <Text type="secondary">
          {keyword
            ? `Kết quả tìm kiếm cho "${keyword}".`
            : "Khám phá các mẫu giày phù hợp với nhu cầu của bạn."}
        </Text>
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
                  sortOptions={sortOptions}
                  onSortChange={(value) => {
                    setSort(value);
                    setPagination((prev) => ({ ...prev, current: 1 }));
                  }}
                  onPageSizeChange={(pageSize) => setPagination({ current: 1, pageSize })}
                />

                {shown > 0 ? (
                  <ProductListDisplay products={products?.content || []} hideTitle mode="normal" />
                ) : (
                  !loading && <Empty description="Không tìm thấy sản phẩm nào phù hợp." />
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

export default ProductPage;
