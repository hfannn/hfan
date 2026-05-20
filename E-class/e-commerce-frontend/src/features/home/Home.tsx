import { Col, Row, Space, Spin, Typography, message } from "antd";
import {
  CreditCardOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { productService } from "@/services/product.service";
import { HomeProduct, HomeResponse } from "@/features/product/product.model";
import ProductSection from "@/features/product/components/ProductSection";
import { HomeHeroBanner } from "@/features/product/components/HeroBanners";

const { Text, Title } = Typography;

const benefits = [
  {
    icon: <SafetyCertificateOutlined />,
    title: "Chính hãng",
    desc: "Cam kết 100% sản phẩm chính hãng",
  },
  {
    icon: <ShoppingCartOutlined />,
    title: "Mua sắm dễ dàng",
    desc: "Đặt hàng nhanh chóng, giao tận nơi",
  },
  {
    icon: <CreditCardOutlined />,
    title: "Thanh toán linh hoạt",
    desc: "Nhiều phương thức thanh toán an toàn",
  },
];

const emptyHome: HomeResponse = {
  featuredProducts: [],
  promotionProducts: [],
  bestSellerProducts: [],
};

const removeDuplicated = (home: HomeResponse): HomeResponse => {
  const sharedUsed = new Set<number>();
  const unique = (items: HomeProduct[]) =>
    items.filter((item) => {
      if (!item.productId || sharedUsed.has(item.productId)) {
        return false;
      }
      sharedUsed.add(item.productId);
      return true;
    });

  const promotionProducts = unique(home.promotionProducts || []).slice(0, 4);
  const featuredProducts = unique(home.featuredProducts || []).slice(0, 4);

  // bestSellerProducts được phép trùng với các section khác
  const bestSellerUsed = new Set<number>();
  const bestSellerProducts = (home.bestSellerProducts || [])
    .filter((item) => {
      if (!item.productId || bestSellerUsed.has(item.productId)) return false;
      bestSellerUsed.add(item.productId);
      return true;
    })
    .slice(0, 4);

  return { promotionProducts, featuredProducts, bestSellerProducts };
};

const Home = () => {
  const [homeData, setHomeData] = useState<HomeResponse>(emptyHome);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHome = async () => {
      setLoading(true);
      try {
        const res = await productService.getHome(4);
        setHomeData(removeDuplicated(res.data || emptyHome));
      } catch {
        message.error("Không thể tải dữ liệu trang chủ.");
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, []);

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <HomeHeroBanner />

        <Row gutter={[16, 16]}>
          {benefits.map((item) => (
            <Col xs={24} md={8} key={item.title}>
              <div className="shop-benefit-card">
                <span className="shop-benefit-icon">{item.icon}</span>
                <span>
                  <Title level={5}>{item.title}</Title>
                  <Text type="secondary">{item.desc}</Text>
                </span>
              </div>
            </Col>
          ))}
        </Row>

        <ProductSection
          title="Sản phẩm nổi bật"
          products={homeData.featuredProducts}
          mode="normal"
          viewAllTo="/products"
        />
        <ProductSection
          title="Khuyến mãi nổi bật"
          products={homeData.promotionProducts}
          mode="sale"
          viewAllTo="/promotions"
        />
        <ProductSection
          title="Sản phẩm bán chạy"
          products={homeData.bestSellerProducts}
          mode="bestSeller"
          viewAllTo="/products"
        />
      </Space>
    </Spin>
  );
};

export default Home;
