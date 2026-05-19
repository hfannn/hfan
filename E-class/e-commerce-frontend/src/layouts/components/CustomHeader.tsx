import {
  AppstoreOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Col,
  ConfigProvider,
  Dropdown,
  Input,
  Layout,
  Menu,
  Popconfirm,
  Row,
  Space,
  message,
} from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-shoe-shop.png";
import { useAuth } from "@/services/AuthContext";

const { Header } = Layout;

const CustomHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, orderCount } = useAuth();

  const handleSearch = (value: string) => {
    const keyword = value.trim();
    const isPromotionRoute =
      location.pathname.startsWith("/promotions") ||
      location.pathname.startsWith("/san-pham-khuyen-mai");

    if (!keyword) {
      navigate(isPromotionRoute ? "/promotions" : "/products");
      return;
    }

    const targetPath = isPromotionRoute ? "/promotions" : "/products";
    navigate(`${targetPath}?search=${encodeURIComponent(keyword)}`);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      logout();
      message.success("Đăng xuất thành công");
      navigate("/");
    }
  };

  const selectedMenuKey = location.pathname.startsWith("/san-pham-khuyen-mai")
    ? "/promotions"
    : location.pathname.startsWith("/products")
      ? "/products"
      : location.pathname;

  const userMenuItems = isAuthenticated
    ? [
        {
          key: "profile",
          label: <Link to="/profile">Thông tin cá nhân</Link>,
        },
        {
          key: "logout",
          label: (
            <Popconfirm
              title="Bạn có chắc chắn muốn đăng xuất?"
              onConfirm={() => handleUserMenuClick({ key: "logout" })}
              okText="Đồng ý"
              cancelText="Không"
            >
              <span style={{ display: "block", width: "100%" }}>Đăng xuất</span>
            </Popconfirm>
          ),
        },
      ]
    : [
        {
          key: "login",
          label: <Link to="/login">Đăng nhập / Đăng ký</Link>,
        },
      ];

  return (
    <Header className="app-header">
      <Row
        align="middle"
        gutter={[20, 10]}
        style={{ minHeight: 64, flexWrap: "nowrap" }}
        className="shop-header-row"
      >
        <Col flex="0 0 auto">
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={logo}
              alt="S-Shop Logo"
              style={{ height: 34, width: 34, objectFit: "contain" }}
            />
            <h1
              style={{
                margin: 0,
                color: "#172033",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 0,
              }}
            >
              S-Shop Online
            </h1>
          </Link>
        </Col>

        <Col flex="auto" className="shop-header-menu">
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemHoverBg: "rgba(15, 115, 255, 0.08)",
                  itemHoverColor: "#0f73ff",
                  itemSelectedBg: "transparent",
                  itemSelectedColor: "#0f73ff",
                },
              },
            }}
          >
            <Menu
              mode="horizontal"
              selectedKeys={[selectedMenuKey]}
              onClick={({ key }) => navigate(key)}
              style={{
                background: "transparent",
                borderBottom: "none",
                display: "flex",
                fontSize: 14,
                fontWeight: 700,
                justifyContent: "center",
                lineHeight: "52px",
                minWidth: 340,
              }}
              items={[
                { key: "/", label: "Trang chủ", icon: <HomeOutlined /> },
                {
                  key: "/products",
                  label: "Sản phẩm",
                  icon: <AppstoreOutlined />,
                },
                {
                  key: "/promotions",
                  label: "Khuyến mãi",
                  icon: <TagsOutlined />,
                },
              ]}
            />
          </ConfigProvider>
        </Col>

        <Col
          flex="0 1 520px"
          className="shop-header-actions"
          style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}
        >
          <Space size={12} align="center" style={{ width: "100%", justifyContent: "flex-end" }}>
            <Input.Search
              allowClear
              size="large"
              placeholder="Tìm kiếm sản phẩm..."
              className="shop-header-search"
              style={{ width: 340 }}
              onSearch={handleSearch}
            />

            <Link to="/cart" style={{ color: "#0f73ff", display: "inline-flex" }}>
              <Badge count={orderCount} size="small">
                <Button shape="circle" icon={<ShoppingCartOutlined />} />
              </Badge>
            </Link>

            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) =>
                  key !== "logout" && handleUserMenuClick({ key }),
              }}
              placement="bottomRight"
            >
              <a
                onClick={(e) => e.preventDefault()}
                style={{
                  alignItems: "center",
                  color: "#0f73ff",
                  display: "flex",
                  gap: 8,
                }}
              >
                {isAuthenticated && user ? (
                  <Avatar style={{ backgroundColor: "#0f73ff", fontWeight: 700 }}>
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                ) : (
                  <Button shape="circle" icon={<UserOutlined />} />
                )}
              </a>
            </Dropdown>
          </Space>
        </Col>
      </Row>
    </Header>
  );
};

export default CustomHeader;
