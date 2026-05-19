import { Button, Carousel, Space, Typography } from "antd";
import { ShoppingOutlined, TagsOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

const { Text, Title } = Typography;

const homeSlides = [
  {
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
  },
  {
    image:
      "https://images.unsplash.com/photo-1511746315387-c4a76990fdce?q=80&w=2070&auto=format&fit=crop",
  },
  {
    image:
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1964&auto=format&fit=crop",
  },
];

export const HomeHeroBanner = () => (
  <Carousel autoplay dots className="shop-hero">
    {homeSlides.map((slide) => (
      <div key={slide.image}>
        <div
          className="shop-hero-panel"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(7, 18, 40, 0.9), rgba(7, 18, 40, 0.28)), url(${slide.image})`,
          }}
        >
          <Space direction="vertical" size={16} className="shop-hero-copy">
            <Title level={1}>Dễ chọn kích cỡ, rõ giá, giao nhanh</Title>
            <Text>Trải nghiệm mua sắm gọn gàng từ xem sản phẩm đến thanh toán.</Text>
            <Space wrap>
              <Link to="/products">
                <Button type="primary" size="large" icon={<ShoppingOutlined />}>
                  Mua ngay
                </Button>
              </Link>
              <Link to="/promotions">
                <Button ghost size="large" icon={<TagsOutlined />}>
                  Xem khuyến mãi
                </Button>
              </Link>
            </Space>
          </Space>
        </div>
      </div>
    ))}
  </Carousel>
);

export const PromotionHeroBanner = () => (
  <div
    className="promotion-hero"
    style={{
      backgroundImage:
        "linear-gradient(90deg, rgba(7, 25, 70, 0.95), rgba(10, 62, 175, 0.45)), url(https://images.unsplash.com/photo-1543508282-6319a3e2621f?q=80&w=2070&auto=format&fit=crop)",
    }}
  >
    <Space direction="vertical" size={12}>
      <Title level={1}>Khuyến mãi lên đến 50%</Title>
      <Text>Ưu đãi có thời hạn cho các mẫu giày nổi bật</Text>
      <Link to="/promotions">
        <Button type="primary" size="large" icon={<ShoppingOutlined />}>
          Mua ngay
        </Button>
      </Link>
    </Space>
  </div>
);
