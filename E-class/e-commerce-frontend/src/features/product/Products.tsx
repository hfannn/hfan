import { Empty, Typography } from "antd";
import { ProductList } from "./product.model";
import ProductCard, { ProductCardMode } from "./components/ProductCard";

const { Text, Title } = Typography;

interface ProductProps {
  products: ProductList[];
  hideTitle?: boolean;
  mode?: ProductCardMode;
}

const ProductListDisplay = ({ products, hideTitle = false, mode = "normal" }: ProductProps) => {
  if (!products?.length) {
    return <Empty description="Không có sản phẩm để hiển thị" />;
  }

  return (
    <div className="product-grid">
      {!hideTitle && (
        <div style={{ marginBottom: 18 }}>
          <Title level={2} style={{ margin: 0 }}>
            Danh sách sản phẩm
          </Title>
          <Text type="secondary">
            Chọn sản phẩm để xem kích cỡ, màu sắc và tồn kho
          </Text>
        </div>
      )}

      <div className="shop-card-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            mode={mode === "sale" || product.isSale ? "sale" : mode}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductListDisplay;
