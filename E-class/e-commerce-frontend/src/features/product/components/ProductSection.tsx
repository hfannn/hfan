import { Button, Empty, Space, Typography } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import ProductCard, { ProductCardData, ProductCardMode } from "./ProductCard";

const { Title } = Typography;

interface ProductSectionProps {
  title: string;
  products: ProductCardData[];
  mode?: ProductCardMode;
  viewAllTo: string;
}

const ProductSection = ({ title, products, mode = "normal", viewAllTo }: ProductSectionProps) => (
  <section className="shop-product-section">
    <Space align="center" className="shop-section-heading">
      <Title level={3}>{title}</Title>
      <Link to={viewAllTo}>
        <Button size="small" icon={<RightOutlined />} iconPosition="end">
          Xem tất cả
        </Button>
      </Link>
    </Space>

    {products.length ? (
      <div className="shop-card-grid shop-card-grid-compact">
        {products.map((product) => (
          <ProductCard
            key={product.productId ?? product.id}
            product={product}
            mode={mode}
          />
        ))}
      </div>
    ) : (
      <Empty description="Hiện chưa có sản phẩm." />
    )}
  </section>
);

export default ProductSection;
