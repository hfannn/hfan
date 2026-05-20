import {
  AppstoreOutlined,
  BellOutlined,
  DashboardOutlined,
  LogoutOutlined,
  ShopOutlined,
  SolutionOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import ProLayout, { PageContainer } from "@ant-design/pro-layout";
import proViVN from "@ant-design/pro-provider/es/locale/vi_VN";
import { Avatar, Badge, ConfigProvider, Dropdown, Space } from "antd";
import antdViVN from "antd/locale/vi_VN";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import ChatbotWidget from "@/features/chatbot/ChatbotWidget";
import logo from "@/assets/logo-shoe-shop.png";
import { useAuth } from "@/services/AuthContext";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const currentUser = user || (storedUser ? safeParseUser(storedUser) : null);
  const isAdmin = String(currentUser?.role || "").toUpperCase() === "ADMIN";

  if (!token || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const userMenuItems = [
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <ConfigProvider
      locale={{ ...antdViVN, ...proViVN }}
      theme={{
        token: {
          borderRadius: 10,
          borderRadiusSM: 8,
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
          colorBgContainer: "#ffffff",
          colorBgLayout: "#f3f6fb",
          colorBorder: "#e5eaf3",
          colorPrimary: "#1b6eea",
          colorText: "#172033",
          colorTextSecondary: "#667085",
          controlHeight: 40,
          controlHeightLG: 44,
        },
      }}
    >
      <>
        <ProLayout
          style={{ minHeight: "100vh", backgroundColor: "#f3f6fb" }}
          title="S-Shop Admin"
          logo={logo}
          layout="mix"
          navTheme="light"
          splitMenus={false}
          token={{
            header: {
              colorBgHeader: "#ffffff",
            },
            sider: {
              colorBgMenuItemActive: "rgba(27, 110, 234, 0.1)",
              colorBgMenuItemHover: "rgba(27, 110, 234, 0.08)",
              colorTextMenu: "#344054",
              colorTextMenuActive: "#1b6eea",
            },
            pageContainer: {
              paddingBlockPageContainerContent: 24,
              paddingInlinePageContainerContent: 24,
            },
          }}
          location={location}
          menuDataRender={() => [
            {
              key: "/admin",
              path: "/admin",
              name: "Dashboard",
              icon: <DashboardOutlined />,
            },
            {
              key: "/admin/users",
              path: "/admin/users",
              name: "Tài khoản hệ thống",
              icon: <UserOutlined />,
            },
            {
              key: "/admin/pos",
              path: "/admin/pos",
              name: "Bán hàng POS",
              icon: <ShopOutlined />,
            },
            {
              key: "product-management",
              name: "Sản phẩm",
              icon: <AppstoreOutlined />,
              children: [
                {
                  key: "/admin/products",
                  path: "/admin/products",
                  name: "Danh sách sản phẩm",
                },
                {
                  key: "/admin/brands",
                  path: "/admin/brands",
                  name: "Thương hiệu",
                },
                {
                  key: "/admin/categories",
                  path: "/admin/categories",
                  name: "Danh mục",
                },
                {
                  key: "/admin/attributes/colors",
                  path: "/admin/attributes/colors",
                  name: "Màu sắc",
                },
                {
                  key: "/admin/attributes/sizes",
                  path: "/admin/attributes/sizes",
                  name: "Kích cỡ",
                },
                {
                  key: "/admin/attributes/materials",
                  path: "/admin/attributes/materials",
                  name: "Chất liệu",
                },
              ],
            },
            {
              key: "/admin/orders",
              path: "/admin/orders",
              name: "Hóa đơn",
              icon: <SolutionOutlined />,
            },
            {
              key: "/admin/reviews",
              path: "/admin/reviews",
              name: "Đánh giá",
              icon: <StarOutlined />,
            },
            {
              key: "/admin/employees",
              path: "/admin/employees",
              name: "Nhân viên",
              icon: <TeamOutlined />,
            },
            {
              key: "/admin/customers",
              path: "/admin/customers",
              name: "Khách hàng",
              icon: <UserOutlined />,
            },
            {
              key: "/admin/discounts",
              name: "Khuyến mãi",
              icon: <TagsOutlined />,
              children: [
                {
                  key: "/admin/discounts/promotions",
                  path: "/admin/discounts/promotions",
                  name: "Khuyến mãi sản phẩm",
                },
                {
                  key: "/admin/discounts/coupons",
                  path: "/admin/discounts/coupons",
                  name: "Mã giảm giá",
                },
              ],
            },
          ]}
          menuItemRender={(menuItemProps, defaultDom) => {
            if (menuItemProps.isUrl || !menuItemProps.path) {
              return defaultDom;
            }
            return <Link to={menuItemProps.path}>{defaultDom}</Link>;
          }}
          actionsRender={() => [
            <Space size="middle" key="admin-actions">
              <Badge count={5} size="small">
                <BellOutlined style={{ color: "#344054", fontSize: 18 }} />
              </Badge>
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                key="user-menu"
              >
                <a onClick={(e) => e.preventDefault()}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <span>Admin</span>
                  </Space>
                </a>
              </Dropdown>
            </Space>,
          ]}
        >
          <PageContainer>
            <Outlet />
          </PageContainer>
        </ProLayout>

        <ChatbotWidget channel="ADMIN" />
      </>
    </ConfigProvider>
  );
};

const safeParseUser = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export default AdminLayout;
