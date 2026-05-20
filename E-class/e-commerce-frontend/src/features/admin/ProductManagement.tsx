import {
  Badge,
  Button,
  Card,
  Col,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Key, useEffect, useMemo, useState } from "react";
import AddProductForm from "@/layouts/components/AddProductForm";
import { API_BASE_URL } from "@/services/axiosClient";
import {
  productService,
  ProductUpdatePayload,
} from "@/services/product.service";
import EditProductModal from "./EditProductModal";
import VariantDetailModal from "./VariantDetailModal";

interface ProductList {
  id: number;
  name: string;
  code: string;
  brandName: string;
  isActive?: boolean;
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  minCostPrice: number;
  maxCostPrice: number;
  imageUrl: string;
}

interface ProductListWithVariants extends ProductList {
  key: Key;
  hasVariants: boolean;
  hasPendingOrder: boolean;
  variants: any[];
}

type ProductForTable = ProductListWithVariants & {
  brand: string;
};

interface FilterOption {
  id: number;
  name: string;
}

interface ProductFilters {
  keyword: string;
  categoryId: number | null;
  brandName: string | null;
  stockStatus: "all" | "inStock" | "outOfStock" | "inactive";
  minPrice: number | null;
  maxPrice: number | null;
  minStock: number | null;
  maxStock: number | null;
}

const initialFilters: ProductFilters = {
  keyword: "",
  categoryId: null,
  brandName: null,
  stockStatus: "all",
  minPrice: null,
  maxPrice: null,
  minStock: null,
  maxStock: null,
};

const { Title, Text } = Typography;
const { Search } = Input;

const ProductManagementPage = () => {
  const [products, setProducts] = useState<ProductListWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isVariantDetailModalOpen, setIsVariantDetailModalOpen] = useState(false);
  const [variantDetailRefreshKey, setVariantDetailRefreshKey] = useState(0);

  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProductLoading, setEditProductLoading] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const fetchProducts = (categoryId = filters.categoryId) => {
    setLoading(true);

    productService
      .getProducts({
        page: 0,
        size: 500,
        categoryId,
        includeInactive: true,
      })
      .then((res) => {
        const formattedData: ProductForTable[] = res.data.content.map(
          (p: ProductList) => ({
            ...p,
            key: p.id,
            brand: p.brandName,
            hasVariants: p.totalStock > 0,
            hasPendingOrder: false,
            variants: [],
          }),
        );

        setProducts(formattedData);
      })
      .catch(() => {
        notification.error({
          message: "Lỗi tải dữ liệu",
          description: "Không thể tải danh sách sản phẩm.",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [categoryRes, brandRes] = await Promise.all([
          productService.getCategories(),
          productService.getBrands(),
        ]);

        setCategories(categoryRes.data || []);
        setBrands(brandRes.data || []);
      } catch {
        notification.error({
          message: "Lỗi tải bộ lọc",
          description: "Không thể tải danh mục và thương hiệu.",
        });
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchProducts(filters.categoryId);
  }, [filters.categoryId]);

  const updateFilters = (patch: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    fetchProducts(null);
  };

  const filteredProducts = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();

    return products.filter((product) => {
      const matchesKeyword =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        product.code.toLowerCase().includes(keyword) ||
        product.brandName?.toLowerCase().includes(keyword);

      const matchesBrand =
        !filters.brandName || product.brandName === filters.brandName;

      const matchesStockStatus =
        filters.stockStatus === "all" ||
        (filters.stockStatus === "inStock" &&
          product.isActive !== false &&
          product.totalStock > 0) ||
        (filters.stockStatus === "outOfStock" &&
          product.isActive !== false &&
          product.totalStock <= 0) ||
        (filters.stockStatus === "inactive" && product.isActive === false);

      const minProductPrice = product.minPrice ?? 0;
      const matchesPrice =
        (filters.minPrice == null || minProductPrice >= filters.minPrice) &&
        (filters.maxPrice == null || minProductPrice <= filters.maxPrice);

      const matchesStockRange =
        (filters.minStock == null || product.totalStock >= filters.minStock) &&
        (filters.maxStock == null || product.totalStock <= filters.maxStock);

      return (
        matchesKeyword &&
        matchesBrand &&
        matchesStockStatus &&
        matchesPrice &&
        matchesStockRange
      );
    });
  }, [products, filters]);

  const activeFilterCount = useMemo(() => {
    return [
      filters.keyword,
      filters.categoryId,
      filters.brandName,
      filters.stockStatus !== "all" ? filters.stockStatus : null,
      filters.minPrice,
      filters.maxPrice,
      filters.minStock,
      filters.maxStock,
    ].filter((value) => value !== null && value !== "").length;
  }, [filters]);

  const confirmAction = (title: string, content: string) => {
    return new Promise<boolean>((resolve) => {
      Modal.confirm({
        title,
        content,
        okText: "Xác nhận",
        cancelText: "Hủy",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  const handleAddProductSuccess = () => {
    setIsModalOpen(false);
    fetchProducts();

    notification.success({
      message: "Thành công",
      description: "Thêm sản phẩm thành công.",
    });
  };

  const handleAddProductFinish = async (values: any) => {
    try {
      const formData = new FormData();
      const productDTO = {
        name: values.name,
        code: values.code || null,
        description: values.description ?? "",
        brandId: values.brand_id ? Number(values.brand_id) : null,
        categoryId: values.category_id ? Number(values.category_id) : null,
        originId: values.origin_id ? Number(values.origin_id) : null,
        supplierId: values.supplier_id ? Number(values.supplier_id) : null,
        materialId: values.material_id ? Number(values.material_id) : null,
        isActive: values.is_active ?? true,
      };

      if (
        !productDTO.name ||
        !productDTO.brandId ||
        !productDTO.categoryId ||
        !productDTO.originId ||
        !productDTO.supplierId
      ) {
        notification.warning({
          message: "Thiếu thông tin",
          description: "Vui lòng điền đầy đủ trường sản phẩm.",
        });
        return;
      }

      const confirmed = await confirmAction(
        "Xác nhận thêm sản phẩm",
        `Bạn có chắc muốn thêm sản phẩm "${productDTO.name}"?`,
      );

      if (!confirmed) {
        return;
      }

      setLoading(true);

      formData.append(
        "data",
        new Blob([JSON.stringify(productDTO)], {
          type: "application/json",
        }),
      );

      const imageFileList = values.images || [];
      const firstFile = imageFileList[0];

      if (firstFile?.originFileObj) {
        formData.append("image", firstFile.originFileObj);
      }

      imageFileList.slice(1).forEach((file: any) => {
        if (file?.originFileObj) {
          formData.append("images", file.originFileObj);
        }
      });

      const productRes = await productService.createProductWithImages(formData);
      const data = productRes?.data;
      const createdProductId =
        data?.productId ||
        data?.id ||
        data?.data?.productId ||
        data?.data?.id;

      if (!createdProductId) {
        console.error("Create product response:", productRes);
        throw new Error("Không lấy được productId sau khi tạo sản phẩm");
      }

      if (values.variants?.length) {
        await productService.bulkCreateVariantsOnly({
          productId: createdProductId,
          variants: values.variants.map((item: any) => ({
            costPrice: item.cost_price,
            sellingPrice: item.selling_price,
            stockQuantity: item.stock_quantity,
            isActive: item.is_active,
            attributeValueIds: [item.color_id, item.size_id].filter(Boolean),
          })),
        });
      }

      handleAddProductSuccess();
    } catch (error: any) {
      notification.error({
        message: "Lỗi thêm sản phẩm",
        description:
          error?.response?.data?.message ||
          error?.response?.data ||
          error?.message ||
          "Không thể thêm sản phẩm.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewVariants = (record: ProductForTable) => {
    setSelectedProductId(record.id);
    setIsVariantDetailModalOpen(true);
  };

  const handleOpenEditProduct = (record: ProductForTable) => {
    setEditingProductId(record.id);
    setIsEditProductModalOpen(true);
  };

  const handleUpdateProduct = async (
    productId: number,
    values: ProductUpdatePayload,
  ) => {
    const confirmed = await confirmAction(
      "Xác nhận cập nhật sản phẩm",
      `Bạn có chắc muốn lưu thay đổi sản phẩm "${values.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setEditProductLoading(true);

    try {
      await productService.updateProduct(productId, values);

      notification.success({
        message: "Thành công",
        description: "Cập nhật sản phẩm thành công.",
      });

      setIsEditProductModalOpen(false);
      setEditingProductId(null);
      fetchProducts();
    } catch (error: any) {
      notification.error({
        message: "Lỗi cập nhật sản phẩm",
        description:
          error?.response?.data?.message ||
          error?.response?.data ||
          "Không thể cập nhật sản phẩm.",
      });
    } finally {
      setEditProductLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await productService.deleteProduct(productId);

      notification.success({
        message: "Thành công",
        description: "Xóa sản phẩm thành công.",
      });

      fetchProducts();
    } catch (error: any) {
      notification.error({
        message: "Lỗi xóa sản phẩm",
        description:
          error?.response?.data?.message ||
          error?.response?.data ||
          "Không thể xóa sản phẩm.",
      });
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    try {
      await productService.deleteVariant(variantId);

      notification.success({
        message: "Thành công",
        description: "Xóa biến thể thành công.",
      });

      fetchProducts();
      setVariantDetailRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      notification.error({
        message: "Lỗi xóa biến thể",
        description:
          error?.response?.data?.message ||
          error?.response?.data ||
          "Không thể xóa biến thể.",
      });
    }
  };

  const handleAddVariant = async (data: { productId: number; variants: any[] }) => {
    await productService.bulkCreateVariantsOnly(data);

    notification.success({
      message: "Thành công",
      description: "Thêm biến thể thành công.",
    });

    fetchProducts();
    setVariantDetailRefreshKey((prev) => prev + 1);
  };

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) {
      return "";
    }

    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }

    return `${API_BASE_URL}${imageUrl}`;
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 90,
      render: (imageUrl: string) =>
        imageUrl ? (
          <Image
            width={60}
            height={60}
            src={getImageUrl(imageUrl)}
            style={{ objectFit: "cover", borderRadius: 8 }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
              background: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              fontSize: 12,
            }}
          >
            No image
          </div>
        ),
    },
    {
      title: "Mã SP",
      dataIndex: "code",
      key: "code",
      width: 130,
      render: (value: string) => <Text copyable>{value}</Text>,
    },
    {
      title: "Sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: ProductForTable) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">{record.brandName || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Giá nhập",
      key: "costPrice",
      width: 160,
      align: "right" as const,
      render: (_: unknown, record: ProductForTable) => {
        if (record.minCostPrice == null && record.maxCostPrice == null) {
          return "-";
        }

        if (record.minCostPrice === record.maxCostPrice) {
          return `${Number(record.minCostPrice).toLocaleString("vi-VN")} VND`;
        }

        return `${Number(record.minCostPrice).toLocaleString("vi-VN")} - ${Number(
          record.maxCostPrice,
        ).toLocaleString("vi-VN")} VND`;
      },
    },
    {
      title: "Giá bán",
      key: "sellingPrice",
      width: 160,
      align: "right" as const,
      render: (_: unknown, record: ProductForTable) => {
        if (record.minPrice == null && record.maxPrice == null) {
          return "-";
        }

        if (record.minPrice === record.maxPrice) {
          return `${Number(record.minPrice).toLocaleString("vi-VN")} VND`;
        }

        return `${Number(record.minPrice).toLocaleString("vi-VN")} - ${Number(
          record.maxPrice,
        ).toLocaleString("vi-VN")} VND`;
      },
    },
    {
      title: "Tồn kho",
      dataIndex: "totalStock",
      key: "totalStock",
      width: 110,
      align: "center" as const,
      render: (value: number) => (
        <Tag color={value > 0 ? "green" : "red"}>{value || 0}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 130,
      render: (_: unknown, record: ProductForTable) => {
        if (record.isActive === false) {
          return <Tag color="default">Ngừng bán</Tag>;
        }

        return (
          <Tag color={record.totalStock > 0 ? "green" : "orange"}>
            {record.totalStock > 0 ? "Còn hàng" : "Hết hàng"}
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      fixed: "right" as const,
      render: (_: unknown, record: ProductForTable) => (
        <Space>
          <Tooltip title="Xem biến thể và lọc SKU">
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleViewVariants(record)}
            />
          </Tooltip>

          <Tooltip title="Sửa sản phẩm">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleOpenEditProduct(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Xóa sản phẩm"
            description="Bạn có chắc muốn xóa sản phẩm này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDeleteProduct(record.id)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 8 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space direction="vertical" size={0}>
            <Title level={3} style={{ margin: 0 }}>
              Quản lý sản phẩm
            </Title>

          </Space>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Thêm sản phẩm
          </Button>
        </Space>

        <Card size="small" style={{ borderRadius: 8 }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} md={10}>
                <Search
                  placeholder="Tìm tên, mã sản phẩm, thương hiệu..."
                  allowClear
                  value={filters.keyword}
                  onChange={(e) => updateFilters({ keyword: e.target.value })}
                  onSearch={(value) => updateFilters({ keyword: value })}
                />
              </Col>

              <Col xs={24} md={7}>
                <Segmented
                  block
                  value={filters.stockStatus}
                  onChange={(value) =>
                    updateFilters({
                      stockStatus: value as ProductFilters["stockStatus"],
                    })
                  }
                  options={[
                    { label: "Tất cả", value: "all" },
                    { label: "Còn hàng", value: "inStock" },
                    { label: "Hết hàng", value: "outOfStock" },
                    { label: "Ngừng bán", value: "inactive" },
                  ]}
                />
              </Col>

              <Col xs={24} md={7}>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Badge count={activeFilterCount} size="small">
                    <Button onClick={() => setAdvancedOpen((prev) => !prev)}>
                      Bộ lọc nâng cao
                    </Button>
                  </Badge>

                  <Button onClick={resetFilters}>Reset</Button>
                </Space>
              </Col>
            </Row>

            {advancedOpen && (
              <Row gutter={[12, 12]}>
                <Col xs={24} md={6}>
                  <Select
                    allowClear
                    style={{ width: "100%" }}
                    placeholder="Danh mục"
                    value={filters.categoryId}
                    onChange={(value) =>
                      updateFilters({ categoryId: value ?? null })
                    }
                    options={categories.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  />
                </Col>

                <Col xs={24} md={6}>
                  <Select
                    allowClear
                    style={{ width: "100%" }}
                    placeholder="Thương hiệu"
                    value={filters.brandName}
                    onChange={(value) =>
                      updateFilters({ brandName: value ?? null })
                    }
                    options={brands.map((item) => ({
                      value: item.name,
                      label: item.name,
                    }))}
                  />
                </Col>

                <Col xs={12} md={3}>
                  <InputNumber<number>
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Giá từ"
                    value={filters.minPrice}
                    onChange={(value) =>
                      updateFilters({ minPrice: value ?? null })
                    }
                  />
                </Col>

                <Col xs={12} md={3}>
                  <InputNumber<number>
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Giá đến"
                    value={filters.maxPrice}
                    onChange={(value) =>
                      updateFilters({ maxPrice: value ?? null })
                    }
                  />
                </Col>

                <Col xs={12} md={3}>
                  <InputNumber<number>
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Tồn từ"
                    value={filters.minStock}
                    onChange={(value) =>
                      updateFilters({ minStock: value ?? null })
                    }
                  />
                </Col>

                <Col xs={12} md={3}>
                  <InputNumber<number>
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Tồn đến"
                    value={filters.maxStock}
                    onChange={(value) =>
                      updateFilters({ maxStock: value ?? null })
                    }
                  />
                </Col>
              </Row>
            )}
          </Space>
        </Card>

        <Table
          columns={columns}
          dataSource={filteredProducts as any}
          loading={loading}
          rowKey="id"
          bordered
          scroll={{ x: 1060 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} sản phẩm`,
          }}
        />
      </Space>

      <Modal
        title="Thêm sản phẩm"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={1200}
        destroyOnHidden
      >
        <AddProductForm
          onCancel={() => setIsModalOpen(false)}
          onFinish={handleAddProductFinish}
        />
      </Modal>

      <VariantDetailModal
        open={isVariantDetailModalOpen}
        productId={selectedProductId}
        onCancel={() => {
          setIsVariantDetailModalOpen(false);
          setSelectedProductId(null);
        }}
        onDelete={handleDeleteVariant}
        onAddVariant={handleAddVariant}
        refreshKey={variantDetailRefreshKey}
      />

      <EditProductModal
        open={isEditProductModalOpen}
        productId={editingProductId}
        confirmLoading={editProductLoading}
        onCancel={() => {
          setIsEditProductModalOpen(false);
          setEditingProductId(null);
        }}
        onSave={handleUpdateProduct}
      />

    </Card>
  );
};

export default ProductManagementPage;
