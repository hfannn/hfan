import { useState } from "react";
import {
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Form, Input, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { axiosClient } from "@/services/axiosClient";

const { Title } = Typography;

const FULL_NAME_REGEX = /^[A-Za-zÀ-ỹ\s'-]+$/;
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

const RegisterForm = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    navigate("/login");
  };

  const onFinish = async (values: any) => {
    setGeneralError(null);
    try {
      setSubmitting(true);

      await axiosClient.post("/v1/auth/register", {
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address?.trim() || "",
        password: values.password,
      });

      setRegistered(true);
    } catch (error: any) {
      const msg: string = error?.response?.data?.message ?? "Đăng ký thất bại, vui lòng thử lại.";

      if (msg.toLowerCase().includes("username") || msg.includes("tên đăng nhập") || msg.toLowerCase().includes("đăng nhập")) {
        form.setFields([{ name: "username", errors: ["Tên đăng nhập đã tồn tại."] }]);
      } else if (msg.toLowerCase().includes("email")) {
        form.setFields([{ name: "email", errors: ["Email đã được sử dụng"] }]);
      } else if (msg.includes("điện thoại") || msg.includes("phone")) {
        form.setFields([{ name: "phone", errors: ["Số điện thoại đã được sử dụng"] }]);
      } else {
        setGeneralError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <>
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          Đăng ký
        </Title>
        <Alert
          message="Đăng ký thành công!"
          description="Tài khoản của bạn đã được tạo. Bạn có thể đăng nhập ngay bây giờ."
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Button type="primary" block onClick={handleBackToLogin}>
          Quay lại màn đăng nhập
        </Button>
      </>
    );
  }

  return (
    <>
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        Đăng ký
      </Title>

      {generalError && (
        <Alert
          message={generalError}
          type="error"
          showIcon
          closable
          onClose={() => setGeneralError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} name="register" layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[
            { required: true, message: "Vui lòng nhập họ tên" },
            {
              validator(_, value) {
                if (!value) return Promise.resolve();
                const trimmed = value.trim();
                if (!trimmed) return Promise.reject(new Error("Vui lòng nhập họ tên"));
                if (trimmed.length < 2) return Promise.reject(new Error("Họ tên phải có ít nhất 2 ký tự"));
                if (trimmed.length > 100) return Promise.reject(new Error("Họ tên không được vượt quá 100 ký tự"));
                if (!FULL_NAME_REGEX.test(trimmed)) return Promise.reject(new Error("Họ tên không được chứa ký tự đặc biệt"));
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên" />
        </Form.Item>

        <Form.Item
          label="Tên đăng nhập"
          name="username"
          rules={[
            { required: true, message: "Vui lòng nhập tên đăng nhập" },
            { min: 4, message: "Tên đăng nhập phải từ 4 ký tự" },
            { max: 50, message: "Tên đăng nhập không được vượt quá 50 ký tự" },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Nhập tên đăng nhập" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Vui lòng nhập email" },
            { type: "email", message: "Email không đúng định dạng" },
            { max: 255, message: "Email không được vượt quá 255 ký tự" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Nhập email" />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          name="phone"
          rules={[
            { required: true, message: "Vui lòng nhập số điện thoại" },
            {
              validator(_, value) {
                if (!value) return Promise.resolve();
                const trimmed = value.trim();
                if (!PHONE_REGEX.test(trimmed)) {
                  return Promise.reject(new Error("Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678)"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            prefix={<PhoneOutlined />}
            placeholder="VD: 0912345678 hoặc +84912345678"
            onChange={(e) => {
              const raw = e.target.value;
              const filtered = raw.replace(/[^0-9+]/g, "").replace(/(?!^)\+/g, "");
              if (filtered !== raw) {
                form.setFieldValue("phone", filtered);
              }
            }}
          />
        </Form.Item>

        <Form.Item label="Địa chỉ" name="address">
          <Input placeholder="Nhập địa chỉ" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu" },
            {
              validator(_, value) {
                if (!value) return Promise.resolve();
                if (value.trim() === "") return Promise.reject(new Error("Mật khẩu không được chỉ chứa khoảng trắng"));
                if (value.length < 8 || value.length > 64) return Promise.reject(new Error("Mật khẩu phải từ 8 đến 64 ký tự"));
                if (!PASSWORD_REGEX.test(value)) return Promise.reject(new Error("Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt"));
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu"
          name="confirm"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Vui lòng nhập lại mật khẩu" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="default"
            htmlType="button"
            block
            disabled={submitting}
            onClick={handleBackToLogin}
          >
            Quay lại
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default RegisterForm;
