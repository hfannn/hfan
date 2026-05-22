import { useState } from "react";
import {
  Table,
  Tag,
  Typography,
  Card,
  Button,
  Space,
  Spin,
  Popconfirm,
  message,
  Tooltip,
} from "antd";
import { useNavigate } from "react-router-dom";
import OrderDetailModal from "./OrderDetailModal";
import { orderService } from "@/services/order.service";
import { DeleteOutlined, CreditCardOutlined } from "@ant-design/icons";
import { useAuth } from "@/services/AuthContext";

const { Title, Text } = Typography;

interface Order {
  id: number;
  key: React.Key;
  code: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  orderType?: string;
  discountAmount?: number;
  voucherCode?: string;
  paymentStatus?: string;
  paymentMethodCode?: string;
  paymentMethodName?: string;
  canRetryVnpay?: boolean;
}

const MyOrdersPage = ({
  orders,
  loading,
  onUpdate,
}: {
  orders: Order[];
  loading: boolean;
  onUpdate: () => void;
}) => {
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState<number | null>(null);
  const { fetchOrderCount } = useAuth();

  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsModalVisible(true);
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await orderService.cancelOrder(orderId);
      message.success("Hủy đơn hàng thành công!");
      onUpdate();
      fetchOrderCount();
    } catch (error: any) {
      message.error(error.response?.data?.message || "Hủy đơn hàng thất bại.");
    }
  };

  const handleRetryVnpay = async (orderId: number) => {
    try {
      setRetryingOrderId(orderId);

      const response = await orderService.createOnlineVnpayPayment(orderId);
      const paymentUrl = response.data.paymentUrl;

      if (!paymentUrl) {
        throw new Error("Không tạo được link thanh toán VNPAY");
      }

      window.location.href = paymentUrl;
    } catch (error: any) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể khởi tạo lại thanh toán VNPAY.",
      );
    } finally {
      setRetryingOrderId(null);
    }
  };

  const normalizeStatus = (status?: string) => {
    const raw = String(status ?? "").trim().toUpperCase();

    if (["PENDING", "WAITING_CONFIRM"].includes(raw)) return "PENDING";
    if (["CONFIRMED"].includes(raw)) return "CONFIRMED";
    if (["SHIPPING", "DELIVERING"].includes(raw)) return "SHIPPING";
    if (["COMPLETED"].includes(raw)) return "COMPLETED";
    if (["CANCELLED", "CANCELED"].includes(raw)) return "CANCELLED";

    return raw;
  };

  const normalizePaymentStatus = (paymentStatus?: string) =>
    String(paymentStatus ?? "").trim().toUpperCase();

  const getStatusTag = (status: string) => {
    switch (normalizeStatus(status)) {
      case "PENDING":
        return <Tag color="gold">Chờ xác nhận</Tag>;
      case "CONFIRMED":
        return <Tag color="lime">Đã xác nhận</Tag>;
      case "SHIPPING":
        return <Tag color="blue">Đang giao</Tag>;
      case "COMPLETED":
        return <Tag color="green">Hoàn thành</Tag>;
      case "CANCELLED":
        return <Tag color="red">Đã hủy</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };
  const getPaymentStatusTag = (paymentStatus?: string) => {
    switch (normalizePaymentStatus(paymentStatus)) {
      case "PAID":
        return <Tag color="green">Đã thanh toán</Tag>;
      case "UNPAID":
        return <Tag color="default">Chưa thanh toán</Tag>;
      case "PENDING":
        return <Tag color="gold">Chờ thanh toán</Tag>;
      case "FAILED":
        return <Tag color="red">Thanh toán thất bại</Tag>;
      case "REFUNDED":
        return <Tag color="blue">Đã hoàn tiền</Tag>;
      case "EXPIRED":
        return <Tag color="orange">Hết hạn thanh toán</Tag>;
      default:
        return <Tag>Chưa có thông tin</Tag>;
    }
  };

  const columns = [
    {
      title: "Mã đơn hàng",
      dataIndex: "code",
      key: "code",
      render: (text: string) => <Text strong>#{text}</Text>,
    },
    {
      title: "Ngày đặt",
      dataIndex: "orderDate",
      key: "orderDate",
      render: (date: string) => {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime())
          ? d.toLocaleDateString("vi-VN")
          : "Ngày không hợp lệ";
      },
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amount: number) => (
        <Text strong style={{ color: "#c81d1d" }}>
          {amount.toLocaleString("vi-VN")} ₫
        </Text>
      ),
    },
    {
      title: "Giảm giá",
      dataIndex: "discountAmount",
      key: "discountAmount",
      render: (discount: number, record: Order) => {
        if (!discount || discount === 0) {
          return <Text type="secondary">Không có</Text>;
        }
        return (
          <Space direction="vertical" size={0}>
            <Text type="success" strong>
              -{discount.toLocaleString("vi-VN")} ₫
            </Text>
            {record.voucherCode && (
              <Tag color="green">{record.voucherCode}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Trạng thái đơn",
      dataIndex: "status",
      key: "status",
      render: getStatusTag,
    },
    {
      title: "Thanh toán",
      key: "payment",
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={4}>
          {getPaymentStatusTag(record.paymentStatus)}
          {record.paymentMethodName && (
            <Text type="secondary">{record.paymentMethodName}</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: Order) => (
        <Space wrap>
          <Button type="primary" onClick={() => handleViewDetails(record.id)}>
            Xem chi tiết
          </Button>

          {record.canRetryVnpay && (
            <Button
              icon={<CreditCardOutlined />}
              loading={retryingOrderId === record.id}
              onClick={() => handleRetryVnpay(record.id)}
            >
              Thanh toán lại
            </Button>
          )}
          {normalizeStatus(record.status) === "PENDING" &&
            !(record.paymentMethodCode === "VNPAY" && record.paymentStatus === "PAID") && (
            <Popconfirm
              title="Bạn chắc chắn muốn hủy đơn hàng này?"
              description="Hành động này không thể hoàn tác."
              onConfirm={() => handleCancelOrder(record.id)}
              okText="Đồng ý"
              cancelText="Không"
            >
              <Tooltip title="Hủy đơn hàng">
                <Button icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        bordered={false}
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      >
        <Spin spinning={loading}>
          {orders.length > 0 ? (
            <Table
              columns={columns}
              dataSource={orders}
              pagination={{ pageSize: 10 }}
              rowKey="key"
            />
          ) : (
            !loading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <Title level={4}>Không có đơn hàng nào trong mục này</Title>
                <Text type="secondary">
                  Hãy kiểm tra các mục khác hoặc tiếp tục mua sắm nhé!
                </Text>
                <br />
                <Button
                  type="primary"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate("/products")}
                >
                  Đến trang sản phẩm
                </Button>
              </div>
            )
          )}
        </Spin>
      </Card>

      <OrderDetailModal
        orderId={selectedOrderId}
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onReviewSubmitted={onUpdate}
      />
    </>
  );
};

export default MyOrdersPage;
