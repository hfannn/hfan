import { Card, Space, Tag, Tooltip, Typography } from "antd";
import { Link } from "react-router-dom";
import { ProductList } from "../product.model";
import { resolveImageUrl } from "@/utils/utils";

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

const fallbackImage =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='360' viewBox='0 0 480 360'%3E%3Crect width='480' height='360' fill='%23f3f6fb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23667085' font-size='22'%3ENo Image%3C/text%3E%3C/svg%3E";

export const money = (value?: number | null) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "Chưa có giá";
  }
  return `${Number(value).toLocaleString("vi-VN")} đ`;
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
            src={imageUrl || fallbackImage}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = fallbackImage;
            }}
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
            <span className="product-price">{money(salePrice)}</span>
            <span className="product-original-price">{money(originalPrice)}</span>
          </Space>
        ) : (
          <span className="product-price">{money(normalPrice)}</span>
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
