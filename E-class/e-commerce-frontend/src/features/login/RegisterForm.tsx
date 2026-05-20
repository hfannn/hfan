import { useState } from "react";
import {
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Typography, message } from "antd";
import { axiosClient } from "@/services/axiosClient";

const { Title } = Typography;

const RegisterForm = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setSubmitting(true);

      await axiosClient.post("/v1/auth/register", {
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        phone: values.phone,
        address: values.address,
        password: values.password,
      });

      message.success("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
      form.resetFields();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        Đăng ký
      </Title>

      <Form form={form} name="register" layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên" />
        </Form.Item>

        <Form.Item
          label="Tên đăng nhập"
          name="username"
          rules={[
            { required: true, message: "Vui lòng nhập tên đăng nhập!" },
            { min: 4, message: "Tên đăng nhập phải từ 4 ký tự!" },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Nhập username" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Vui lòng nhập email!" },
            { type: "email", message: "Email không hợp lệ!" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Nhập email" />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          name="phone"
          rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" />
        </Form.Item>

        <Form.Item label="Địa chỉ" name="address">
          <Input placeholder="Nhập địa chỉ" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu!" },
            { min: 6, message: "Mật khẩu phải từ 6 ký tự!" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập mật khẩu"
          />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu"
          name="confirm"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Hai mật khẩu không khớp!"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập lại mật khẩu"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Đăng ký
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default RegisterForm;