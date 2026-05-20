import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Image,
  Typography,
  Button,
  Space,
  Tag,
  Divider,
  Spin,
  notification,
  InputNumber,
  message,
  Modal,
} from "antd";
import {
  ShoppingCartOutlined,
  ArrowLeftOutlined,
  SafetyOutlined,
  SyncOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { productService } from "@/services/product.service";
import { cartService } from "@/services/cart.service";
import { useAuth } from "@/services/AuthContext";
import { ProductDetail, Variant } from "../admin/VariantDetailModal";
import { PageResponse, ProductList } from "./product.model";
import { resolveImageUrl } from "@/utils/utils";
import ProductListDisplay from "./Products";
import ProductReviewsSection from "@/features/review/ProductReviewsSection";

const { Title, Text, Paragraph } = Typography;

const NO_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23cccccc' d='M448 80h-80L288 0 160 80H80c-26.5 0-48 21.5-48 48v304c0 26.5 21.5 48 48 48h368c26.5 0 48-21.5 48-48V128c0-26.5-21.5-48-48-48zm-224 48c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm144 256H96v-16c0-44.2 89.5-64 128-64s89.5 19.8 128 64v16z'/%3E%3C/svg%3E";

const formatMoney = (value?: number | string) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const getVariantAttribute = (variant: Variant | null | undefined, code: string) => {
  if (!variant) return null;

  const attrs = variant.attributes || {};
  const direct = attrs[code] ?? attrs[code.toUpperCase()] ?? attrs[code.toLowerCase()];

  if (direct != null && String(direct).trim()) {
    return String(direct);
  }

  const normalizedCode = code.toLowerCase();
  const variantFields = variant as unknown as Record<string, unknown>;
  const directField = variantFields[normalizedCode];
  const nameField = variantFields[`${normalizedCode}Name`];

  const value = nameField ?? directField;
  return value != null && String(value).trim() ? String(value) : null;
};

const getVariantSize = (variant: Variant | null | undefined) =>
  getVariantAttribute(variant, "SIZE");

const getVariantColor = (variant: Variant | null | undefined) =>
  getVariantAttribute(variant, "COLOR");

const getVariantMaterial = (variant: Variant | null | undefined) =>
  getVariantAttribute(variant, "MATERIAL");

const getVariantStock = (variant: Variant | null | undefined) =>
  Number(variant?.stockQuantity ?? (variant as any)?.stock_quantity ?? 0);

const getProductImage = (product: any) => {
  return (
    product?.imageUrl ||
    product?.image_url ||
    product?.primaryImage ||
    product?.primary_image ||
    product?.thumbnail ||
    product?.thumbUrl ||
    product?.thumb_url ||
    product?.images?.[0]?.imageUrl ||
    product?.images?.[0]?.image_url ||
    product?.images?.[0] ||
    ""
  );
};

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, fetchOrderCount } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const addingToCartRef = useRef(false);

  useEffect(() => {
    if (!id) return;

    window.scrollTo(0, 0);
    setLoading(true);

    productService
      .getProductById(Number(id))
      .then((response) => {
        const productData = response.data;
        setProduct(productData);

        if (productData.images && productData.images.length > 0) {
          setSelectedImage(resolveImageUrl(productData.images[0]));
        } else {
          setSelectedImage(resolveImageUrl(getProductImage(productData)));
        }
      })
      .catch((error) => {
        console.error("Failed to fetch product details:", error);
        notification.error({
          message: "Lỗi",
          description:
            "Không thể tải thông tin sản phẩm. Có thể sản phẩm không tồn tại.",
        });
        navigate("/products", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const sellableVariants = useMemo(() => {
    if (!product?.variants) return [];

    return product.variants.filter(
      (v: any) =>
        (v.isActive ?? true) &&
        (v.productIsActive ?? true) &&
        v.deletedAt == null &&
        (v.stockQuantity ?? 0) >= 0,
    );
  }, [product]);

  const { allSizes, allColors, allMaterials } =
    useMemo(() => {
      if (!product) {
        return {
          allSizes: [],
          allColors: [],
          allMaterials: [],
        };
      }

      const allSizes = [
        ...new Set(
          sellableVariants.map(getVariantSize).filter(Boolean),
        ),
      ] as string[];

      const allColors = [
        ...new Set(
          sellableVariants.map(getVariantColor).filter(Boolean),
        ),
      ] as string[];

      const allMaterials = [
        ...new Set(
          sellableVariants.map(getVariantMaterial).filter(Boolean),
        ),
      ] as string[];

      return { allSizes, allColors, allMaterials };
    }, [product, sellableVariants]);

  const hasMaterialOptions = allMaterials.length > 0;

  const matchesSelectedSize = (variant: Variant) =>
    !selectedSize || getVariantSize(variant) === selectedSize;

  const matchesSelectedColor = (variant: Variant) =>
    !selectedColor || getVariantColor(variant) === selectedColor;

  const selectedVariant = useMemo(() => {
    if (!selectedSize || !selectedColor || (hasMaterialOptions && !selectedMaterial)) {
      return null;
    }

    return (
      sellableVariants.find(
        (v) =>
          getVariantSize(v) === selectedSize &&
          getVariantColor(v) === selectedColor &&
          (!hasMaterialOptions || getVariantMaterial(v) === selectedMaterial),
      ) || null
    );
  }, [sellableVariants, selectedSize, selectedColor, selectedMaterial, hasMaterialOptions]);

  useEffect(() => {
    if (!selectedMaterial) return;

    const materialStillExists = sellableVariants.some(
      (variant) =>
        matchesSelectedSize(variant) &&
        matchesSelectedColor(variant) &&
        getVariantMaterial(variant) === selectedMaterial,
    );

    if (!materialStillExists) {
      setSelectedMaterial(null);
      setQuantity(1);
    }
  }, [sellableVariants, selectedSize, selectedColor, selectedMaterial]);

  useEffect(() => {
    if (!product) return;

    if (selectedVariant?.images?.length) {
      setSelectedImage(resolveImageUrl(selectedVariant.images[0]));
      return;
    }

    if (selectedColor) {
      const variantsOfColor = product.variants.filter(
        (v) => getVariantColor(v) === selectedColor,
      );
      const colorImages = variantsOfColor.flatMap((v) => v.images || []);
      if (colorImages.length > 0) {
        setSelectedImage(resolveImageUrl(colorImages[0]));
        return;
      }
    }

    if (product.images && product.images.length > 0) {
      setSelectedImage(resolveImageUrl(product.images[0]));
      return;
    }

    setSelectedImage(resolveImageUrl(getProductImage(product)));
  }, [product, selectedColor, selectedVariant]);

  const imageListToDisplay = useMemo(() => {
    if (!product) return [];

    let newImageList: string[] = [];

    if (selectedVariant?.images?.length) {
      newImageList = selectedVariant.images;
    } else if (selectedColor) {
      const variantsOfColor = product.variants.filter(
        (v) => getVariantColor(v) === selectedColor,
      );
      newImageList = variantsOfColor.flatMap((v) => v.images || []);
    }

    if (newImageList.length === 0) {
      newImageList = product.images || [];
    }

    return [...new Set(newImageList)];
  }, [product, selectedColor, selectedVariant]);
  //
  const isSizeDisabled = (size: string) => {
    return !sellableVariants.some(
      (variant) => getVariantSize(variant) === size && getVariantStock(variant) > 0,
    );
  };

  const isColorDisabled = (color: string) => {
    return !sellableVariants.some(
      (variant) =>
        getVariantColor(variant) === color &&
        matchesSelectedSize(variant) &&
        getVariantStock(variant) > 0,
    );
  };

  const isMaterialDisabled = (material: string) => {
    return !sellableVariants.some(
      (variant) =>
        getVariantMaterial(variant) === material &&
        matchesSelectedSize(variant) &&
        matchesSelectedColor(variant),
    );
  };
  //

  const handleSelectAttribute = (type: "size" | "color" | "material", value: string) => {
    if (type === "size") {
      setSelectedSize((prev) => (prev === value ? null : value));
    } else if (type === "color") {
      setSelectedColor((prev) => (prev === value ? null : value));
    } else {
      setSelectedMaterial((prev) => (prev === value ? null : value));
    }
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (addingToCart || addingToCartRef.current) {
      return;
    }

    if (!selectedVariant) {
      message.warning(
        hasMaterialOptions
          ? "Vui lòng chọn đầy đủ kích cỡ, màu sắc và chất liệu"
          : "Vui lòng chọn đầy đủ kích cỡ và màu sắc",
      );
      return;
    }

    if (!quantity || quantity <= 0) {
      message.warning("Số lượng không hợp lệ.");
      return;
    }

    if (getVariantStock(selectedVariant) <= 0) {
      message.error("Sản phẩm này đã hết hàng.");
      return;
    }

    if (quantity > getVariantStock(selectedVariant)) {
      message.warning("Số lượng không được vượt quá tồn kho của biến thể đã chọn");
      return;
    }

    Modal.confirm({
      title: "Xác nhận thêm vào giỏ hàng?",
      content: `Bạn có muốn thêm ${quantity} sản phẩm vào giỏ hàng không?`,
      okText: "Thêm",
      cancelText: "Hủy",
      onOk: async () => {
        if (addingToCartRef.current) {
          return;
        }

        try {
          addingToCartRef.current = true;
          setAddingToCart(true);
          await cartService.addToCart({
            productVariantId: selectedVariant.id,
            quantity,
          });

          message.success("Đã thêm vào giỏ hàng.");
          fetchOrderCount();
        } catch (error: any) {
          message.error(
            error?.response?.data?.message ||
              "Thêm vào giỏ hàng thất bại. Vui lòng thử lại.",
          );
        } finally {
          addingToCartRef.current = false;
          setAddingToCart(false);
        }
      },
    });
  };
  const hasCompleteSelection = Boolean(
    selectedSize && selectedColor && (!hasMaterialOptions || selectedMaterial),
  );
  const selectionHint = hasMaterialOptions
    ? "Vui lòng chọn kích cỡ, màu sắc và chất liệu để xem tồn kho"
    : "Vui lòng chọn kích cỡ và màu sắc để xem tồn kho";
  const selectedStock = getVariantStock(selectedVariant);
  const isOutOfStock = !selectedVariant || selectedStock <= 0;
  const isLowStock =
    selectedVariant != null && selectedStock > 0 && selectedStock <= 5;

  if (!product) {
    return (
      <Spin size="large" style={{ display: "block", margin: "100px auto" }} />
    );
  }

  return (
    <Spin spinning={loading} size="large" tip="Đang tải sản phẩm...">
      <div
        style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.3s ease" }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/products")}
          type="text"
          style={{ marginBottom: 12 }}
        >
          Quay lại
        </Button>

        <Row gutter={[28, 28]} className="product-detail-shell" style={{ padding: 24 }}>
          <Col xs={24} md={12}>
            <div
              style={{
                background: "#f7f7f8",
                border: "1px solid #eef2f7",
                borderRadius: 8,
                padding: 12,
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                width="100%"
                height="100%"
                src={selectedImage || NO_IMAGE_PLACEHOLDER}
                preview={false}
                fallback={NO_IMAGE_PLACEHOLDER}
                style={{ objectFit: "contain" }}
              />
            </div>

            <Row
              gutter={[10, 10]}
              style={{ marginTop: 16, maxHeight: "220px", overflowY: "auto" }}
            >
              {imageListToDisplay.map((img, index) => {
                const resolvedImg = resolveImageUrl(img);

                return (
                  <Col span={4} key={index}>
                    <div
                      style={{
                        aspectRatio: "1 / 1",
                        border:
                          selectedImage === resolvedImg
                            ? "2px solid #1677ff"
                            : "2px solid #f0f0f0",
                        background: "#f7f7f8",
                        borderRadius: 6,
                        padding: "4px",
                        cursor: "pointer",
                        transition:
                          "transform 0.2s ease, border-color 0.2s ease",
                      }}
                      onClick={() => setSelectedImage(resolvedImg)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        if (selectedImage !== resolvedImg) {
                          e.currentTarget.style.borderColor = "#91caff";
                        }
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        if (selectedImage !== resolvedImg) {
                          e.currentTarget.style.borderColor = "#f0f0f0";
                        }
                      }}
                    >
                      <Image
                        src={resolvedImg}
                        preview={false}
                        fallback={NO_IMAGE_PLACEHOLDER}
                        width="100%"
                        height="100%"
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Col>

          <Col xs={24} md={12}>
            <Title level={2} style={{ fontWeight: 800, fontSize: 28, marginTop: 0 }}>
              {product.name}
            </Title>

            <Title
              level={3}
              style={{ color: "#e11d2e", marginTop: 12, marginBottom: 0, fontWeight: 800 }}
            >
              {selectedVariant ? (
                <Space direction="vertical" size={2}>
                  <span>
                    {formatMoney(
                      selectedVariant.salePrice ??
                        selectedVariant.unitPrice ??
                        selectedVariant.sellingPrice,
                    )}
                  </span>
                  {selectedVariant.isSale &&
                    Number(selectedVariant.discountPercent || 0) > 0 &&
                    Number(selectedVariant.originalPrice ?? selectedVariant.sellingPrice) >
                      Number(selectedVariant.salePrice ?? selectedVariant.unitPrice ?? selectedVariant.sellingPrice) && (
                      <Space size={8}>
                        <Text delete type="secondary" style={{ fontSize: 16 }}>
                          {formatMoney(selectedVariant.originalPrice ?? selectedVariant.sellingPrice)}
                        </Text>
                        <Tag color="red">
                          -{Number(selectedVariant.discountPercent).toFixed(0)}%
                        </Tag>
                      </Space>
                    )}
                </Space>
              ) : (
                hasMaterialOptions
                  ? "Chọn kích cỡ, màu sắc và chất liệu để xem giá"
                  : "Chọn kích cỡ và màu sắc để xem giá"
              )}
            </Title>

            <Space>
              <Tag color="blue">{product.brandName}</Tag>
              <Tag color="purple">{product.categoryName}</Tag>
            </Space>

              {!hasCompleteSelection && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    {selectionHint}
                  </Text>
                </div>
              )}

              {hasCompleteSelection && selectedVariant && (
              <>
                <div style={{ marginTop: 8 }}>
                  <Text>Tồn kho: {selectedStock}</Text>
                </div>

                {isOutOfStock && (
                  <div style={{ color: "red", marginTop: 8 }}>
                    Sản phẩm hiện đã hết hàng.
                  </div>
                )}

                {!isOutOfStock && isLowStock && (
                  <div style={{ color: "#fa8c16", marginTop: 8 }}>
                    Sản phẩm sắp hết hàng, vui lòng đặt sớm.
                  </div>
                )}

                {!isOutOfStock && !isLowStock && (
                  <div style={{ color: "#52c41a", marginTop: 8 }}>
                    Sản phẩm còn hàng.
                  </div>
                )}
              </>
            )}

            <Divider />
            <Divider />

            <div>
              <Text strong>Kích cỡ:</Text>
              <Space wrap style={{ marginTop: 8, marginBottom: 16 }}>
                {allSizes.map((size) => (
                  <Button
                    key={size}
                    type={selectedSize === size ? "primary" : "default"}
                    onClick={() => handleSelectAttribute("size", size)}
                    disabled={isSizeDisabled(size)}
                  >
                    {size}
                  </Button>
                ))}
              </Space>
            </div>

            <div>
              <Text strong>Màu sắc:</Text>
              <Space wrap style={{ marginTop: 8, marginBottom: 16 }}>
                {allColors.map((color) => (
                  <Button
                    key={color}
                    type={selectedColor === color ? "primary" : "default"}
                    onClick={() => handleSelectAttribute("color", color)}
                    disabled={isColorDisabled(color)}
                  >
                    {color}
                  </Button>
                ))}
              </Space>
            </div>

            {hasMaterialOptions && (
              <div>
                <Text strong>Chất liệu:</Text>
                <Space wrap style={{ marginTop: 8, marginBottom: 16 }}>
                  {allMaterials.map((material) => (
                    <Button
                      key={material}
                      type={selectedMaterial === material ? "primary" : "default"}
                      onClick={() => handleSelectAttribute("material", material)}
                      disabled={isMaterialDisabled(material)}
                      style={{
                        whiteSpace: "normal",
                        minHeight: 32,
                        maxWidth: 180,
                      }}
                    >
                      {material}
                    </Button>
                  ))}
                </Space>
              </div>
            )}

            <div>
              <Text strong>Mô tả sản phẩm:</Text>
              <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
                {product.description?.split("\n").map((item, index) =>
                  item.trim() ? (
                    <li key={index}>
                      <Paragraph style={{ marginBottom: "4px" }}>
                        {item.trim()}
                      </Paragraph>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>

            <Divider />

            <Space
              direction="vertical"
              size="middle"
              style={{ marginBottom: "24px" }}
            >
              <Space align="center" size="large">
                <InputNumber
                  min={1}
                  max={Math.max(selectedStock, 1)}
                  value={quantity}
                  onChange={(val) => setQuantity(val || 1)}
                  disabled={isOutOfStock}
                />

                <Button
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  size="large"
                  onClick={handleAddToCart}
                  loading={addingToCart}
                  disabled={!selectedVariant || isOutOfStock || addingToCart}
                  style={{ minWidth: 320 }}
                >
                  {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ hàng"}
                </Button>
              </Space>
            </Space>

            <Divider />

            <Row gutter={[12, 12]}>
              {[
                [<TruckOutlined />, "Vận chuyển nhanh", "Vận chuyển 63 tỉnh thành"],
                [<SyncOutlined />, "Bảo hành sản phẩm", "Lỗi 1 đổi 1"],
                [<SafetyOutlined />, "Thanh toán an toàn", "Hỗ trợ nhiều hình thức"],
              ].map(([icon, title, desc]) => (
                <Col xs={24} sm={8} key={String(title)}>
                  <Space align="center">
                    <span style={{ color: "#0f73ff", fontSize: 24 }}>{icon}</span>
                    <span>
                      <Text strong style={{ display: "block", fontSize: 13 }}>
                        {title}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {desc}
                      </Text>
                    </span>
                  </Space>
                </Col>
              ))}
            </Row>

          </Col>
        </Row>

        <Divider />

        <ProductReviewsSection productId={product.id} />

        <Divider />

        <SuggestedProducts currentProductId={product.id} />
      </div>
    </Spin>
  );
};

const SuggestedProducts = ({
  currentProductId,
}: {
  currentProductId: number;
}) => {
  const [products, setProducts] = useState<PageResponse<ProductList>>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    productService
      .filterProducts({ page: 0, size: 4 })
      .then((res) => {
        const filteredProducts = {
          ...res.data,
          content: res.data.content.filter(
            (p: ProductList) => p.id !== currentProductId,
          ),
        };
        setProducts(filteredProducts);
      })
      .finally(() => setLoading(false));
  }, [currentProductId]);

  if (loading) {
    return <Spin />;
  }

  return (
    <div>
      <Title level={3} style={{ fontWeight: "600" }}>
        Có thể bạn cũng thích
      </Title>

      {products?.content?.length ? (
        <ProductListDisplay products={products.content} hideTitle />
      ) : null}
    </div>
  );
};

export default ProductDetailPage;
