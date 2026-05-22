import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Col, Form, Input, Row, Space, Typography, message } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-shoe-shop.png";
import { axiosClient } from "@/services/axiosClient";
import { useAuth } from "@/services/AuthContext";

const { Text, Title } = Typography;

type LoginProps = {
  mode?: "user" | "admin";
};

const Login = ({ mode = "user" }: LoginProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = location.state?.from?.pathname || "/";
  const isAdminLogin = mode === "admin";

  const onFinish = async (values: any) => {
    try {
      const response = await axiosClient.post("/v1/auth/login", {
        username: values.username,
        password: values.password,
      });

      if (response.status === 200) {
        const data = response.data;
        const role = String(data.role || "").toUpperCase();
        const user = {
          userId: data.userId,
          username: data.username,
          role: data.role,
        };

        if (isAdminLogin && role !== "ADMIN" && role !== "STAFF") {
          message.error("Tài khoản này không có quyền truy cập trang quản trị.");
          return;
        }

        if (!isAdminLogin && (role === "ADMIN" || role === "STAFF")) {
          message.error("Tài khoản nhân viên không được đăng nhập ở màn khách hàng.");
          return;
        }

        login(data.token, user);
        message.success("Đăng nhập thành công");

        if (role === "ADMIN") {
          navigate("/admin");
        } else if (role === "STAFF") {
          navigate("/admin/pos");
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error("Tên đăng nhập hoặc mật khẩu không đúng.");
      } else {
        message.error("Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    }
  };

  return (
    <Row
      align="middle"
      justify="center"
      style={{
        minHeight: "100vh",
        padding: 24,
        background:
          "linear-gradient(135deg, rgba(27,110,234,0.12), rgba(22,163,74,0.08))",
      }}
    >
      <Col xs={24} sm={18} md={12} lg={8} xl={6}>
        <Card style={{ borderRadius: 10 }}>
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            <Space direction="vertical" align="center" style={{ width: "100%" }}>
              <img src={logo} alt="S-Shop Logo" style={{ width: 72, height: 72 }} />
              <div style={{ textAlign: "center" }}>
                <Title level={2} style={{ margin: 0 }}>
                  {isAdminLogin ? "Đăng nhập Admin" : "Đăng nhập"}
                </Title>
                <Text type="secondary">
                  {isAdminLogin
                    ? "Chỉ dành cho tài khoản quản trị hệ thống"
                    : "Truy cập tài khoản S-Shop của bạn"}
                </Text>
              </div>
            </Space>

            <Form name={isAdminLogin ? "admin-login" : "login"} layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="username"
                label="Tên đăng nhập"
                rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nhập tên đăng nhập" />
              </Form.Item>

              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
              </Form.Item>

              <Form.Item>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                  </Form.Item>
                </div>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" block size="large">
                  Đăng nhập
                </Button>
              </Form.Item>

              <div style={{ marginTop: 16, textAlign: "center" }}>
                {isAdminLogin ? (
                  <Link to="/login">Quay lại đăng nhập khách hàng</Link>
                ) : (
                  <Space direction="vertical" size={8}>
                    <Link to="/register">Đăng ký tài khoản</Link>
                    <Link to="/admin/login">Đăng nhập dành cho admin</Link>
                  </Space>
                )}
              </div>
            </Form>
          </Space>
        </Card>
      </Col>
    </Row>
  );
};

export default Login;
