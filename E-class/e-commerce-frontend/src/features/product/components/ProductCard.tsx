import { Card, Space, Tag, Tooltip, Typography } from "antd";
import { Link } from "react-router-dom";
import { ProductList } from "../product.model";
import {
  FALLBACK_PRODUCT_IMAGE,
  handleImageError,
  resolveImageUrl,
} from "@/utils/utils";

const { Text } = Typography;

export type ProductCardMode = "normal" | "sale" | "bestSeller";

export interface ProductCardData extends Partial<ProductList> {
  productId?: number;
  price?: number;
  originalPrice?: number;
  soldQuantity?: number;
  isPromotionActive?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  mode?: ProductCardMode;
}

export const money = (value?: number | null) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "Chưa có giá";
  }
  return `${Number(value).toLocaleString("vi-VN")} đ`;
};

const formatPriceRange = (min?: number | null, max?: number | null): string | null => {
  const minVal = min != null && Number.isFinite(Number(min)) ? Number(min) : null;
  const maxVal = max != null && Number.isFinite(Number(max)) ? Number(max) : null;
  if (minVal == null) return null;
  if (maxVal == null || maxVal <= minVal) return money(minVal);
  return `${money(minVal)} - ${money(maxVal)}`;
};

const getProductId = (product: ProductCardData) => product.productId ?? product.id;

const firstNumber = (...values: Array<number | null | undefined>) =>
  values.find((value) => value != null && Number.isFinite(Number(value)));

const ProductCard = ({ product, mode = "normal" }: ProductCardProps) => {
  const productId = getProductId(product);
  const isSaleMode =
    mode === "sale" ||
    Boolean(product.isPromotionActive) ||
    Boolean(product.isSale && Number(product.discountPercent || 0) > 0);
  const imageUrl = resolveImageUrl(product.imageUrl);
  const salePrice = firstNumber(product.salePrice, product.minSalePrice, product.price, product.minPrice);
  const normalPrice = firstNumber(product.price, product.minPrice, product.salePrice);
  const originalPrice = firstNumber(
    product.originalPrice,
    product.minOriginalPrice,
    product.maxOriginalPrice,
    product.minPrice,
  );
  const discountPercent = Number(product.discountPercent || 0);

  return (
    <Card
      hoverable
      className="product-card"
      styles={{ body: { padding: 14 } }}
      cover={
        <Link to={`/products/${productId}`} className="product-card-cover">
          {isSaleMode && discountPercent > 0 && (
            <Tag color="red" className="product-sale-badge">
              -{discountPercent.toFixed(0)}%
            </Tag>
          )}
          <img
            alt={product.name}
            src={imageUrl || FALLBACK_PRODUCT_IMAGE}
            onError={handleImageError}
          />
        </Link>
      }
    >
      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        {product.categoryName && mode === "normal" && (
          <Text type="secondary" className="product-card-category">
            {product.categoryName}
          </Text>
        )}
        <Link to={`/products/${productId}`}>
          <Tooltip title={product.name}>
            <span className="product-card-title">{product.name}</span>
          </Tooltip>
        </Link>
        {isSaleMode ? (
          <Space size={8} align="baseline" wrap>
            <span className="product-price">
              {formatPriceRange(product.minSalePrice, product.maxSalePrice) ?? money(salePrice)}
            </span>
            <span className="product-original-price">
              {formatPriceRange(product.minOriginalPrice, product.maxOriginalPrice) ?? money(originalPrice)}
            </span>
          </Space>
        ) : (
          <span className="product-price">
            {formatPriceRange(product.minPrice, product.maxPrice) ?? money(normalPrice)}
          </span>
        )}
        {mode === "bestSeller" && product.soldQuantity != null && (
          <Text type="secondary" className="product-sold-count">
            Đã bán {Number(product.soldQuantity).toLocaleString("vi-VN")}
          </Text>
        )}
      </Space>
    </Card>
  );
};

export default ProductCard;
