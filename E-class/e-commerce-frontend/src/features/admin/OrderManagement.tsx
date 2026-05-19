import { useEffect, useMemo, useState } from "react";
import {
  Tag,
  Space,
  Button,
  message,
  Tooltip,
  Popconfirm,
  Tabs,
  Table,
  Spin,
  Typography,
  Card,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Empty,
} from "antd";
import {
  EyeOutlined,
  CheckCircleOutlined,
  CarOutlined,
  SearchOutlined,
  ReloadOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import type { ProColumns } from "@ant-design/pro-table";
import { adminOrderService } from "@/services/admin.order.service";
import { useLocation, useNavigate } from "react-router-dom";
import OrderDetailModal from "@/layouts/components/OrderDetailModal";
import { printThermalInvoice } from "@/utils/invoicePrint";
import dayjs, { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Order {
  id: number;
  code?: string | null;
  customer?: {
    userProfile?: {
      fullName?: string;
    };
  };
  customerName?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  fullAddress?: string;
  totalAmount?: number;
  finalTotal?: number;
  subtotalAmount?: number;
  discountAmount?: number;
  discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue?: number;
  voucherCode?: string;
  discountPercent?: number;
  paymentStatus?: string;
  paymentMethodName?: string;
  status: string;
  createdAt: string;
  orderType?: string | null;
  inventoryReserved?: boolean;
  inventoryReleased?: boolean;
}

type OrderTypeLabel = "Online" | "Tại quầy";

const OrderManagementPage = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | undefined>(
    undefined,
  );
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(
    () => new URLSearchParams(location.search).get("tab") || "PENDING",
    [location.search],
  );

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const response = await adminOrderService.getAllOrders({
        page: 0,
        size: 1000,
      });
      setAllOrders(response.data.content || []);
    } catch (error) {
      message.error("Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      await adminOrderService.updateOrderStatus(orderId, status);
      message.success("Cập nhật trạng thái thành công");
      fetchAllOrders();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Cập nhật thất bại");
    }
  };

  const formatCurrency = (value?: number) =>
    `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

  const normalizeStatus = (status?: string) => {
    const raw = String(status ?? "").trim().toUpperCase();

    if (["DRAFT"].includes(raw)) return "DRAFT";
    if (["PENDING", "WAITING_CONFIRM"].includes(raw)) return "PENDING";
    if (["CONFIRMED", "PROCESSING"].includes(raw)) return "CONFIRMED";
    if (["SHIPPING", "DELIVERING"].includes(raw)) return "SHIPPING";
    if (["COMPLETED", "DONE", "DELIVERED", "SUCCESS"].includes(raw)) return "COMPLETED";
    if (["CANCELLED", "CANCELED"].includes(raw)) return "CANCELLED";

    return raw;
  };

  const handlePrintInvoice = async (record: Order) => {
    if (normalizeStatus(record.status) !== "COMPLETED") {
      return;
    }

    try {
      setPrintingOrderId(record.id);
      const orderDetailPromise = Array.isArray((record as any).items)
        ? Promise.resolve(record as any)
        : adminOrderService.getOrderById(record.id).then((response) => response.data);

      await printThermalInvoice(orderDetailPromise);
    } catch (error) {
      message.error("Không thể in hóa đơn. Vui lòng thử lại.");
    } finally {
      setPrintingOrderId(null);
    }
  };

  const normalizeOrderType = (orderType?: string | null): "POS" | "ONLINE" => {
    const normalized = String(orderType || "").trim().toUpperCase();

    if (
      normalized === "POS" ||
      normalized === "OFFLINE" ||
      normalized === "COUNTER" ||
      normalized === "IN_STORE" ||
      normalized === "AT_COUNTER"
    ) {
      return "POS";
    }

    if (
      normalized === "ONLINE" ||
      normalized === "WEB" ||
      normalized === "WEBSITE" ||
      normalized === "ONLINE_ORDER" ||
      normalized === "DELIVERY" ||
      normalized === "ECOMMERCE"
    ) {
      return "ONLINE";
    }

    return "ONLINE";
  };

  const getOrderTypeLabel = (orderType?: string | null): OrderTypeLabel =>
    normalizeOrderType(orderType) === "POS" ? "Tại quầy" : "Online";

  const getCustomerName = (order: Order) =>
    order.customerName ||
    order.customer?.userProfile?.fullName ||
    (normalizeOrderType(order.orderType) === "POS" ? "Khách lẻ" : "N/A");

  const getDisplayTotal = (record: Order) =>
    record.finalTotal ?? record.totalAmount ?? 0;

  const getStatusTag = (status: string) => {
    switch (normalizeStatus(status)) {
      case "DRAFT":
        return <Tag color="default">Nháp</Tag>;
      case "PENDING":
        return <Tag color="gold">Chờ xác nhận</Tag>;
      case "CONFIRMED":
        return <Tag color="lime">Đã xác nhận</Tag>;
      case "SHIPPING":
        return <Tag color="blue">Đang giao hàng</Tag>;
      case "COMPLETED":
        return <Tag color="green">Hoàn thành</Tag>;
      case "CANCELLED":
        return <Tag color="red">Đã hủy</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getPaymentStatusTag = (paymentStatus?: string) => {
    switch (String(paymentStatus ?? "").trim().toUpperCase()) {
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
      default:
        return <Tag>Chưa có thông tin</Tag>;
    }
  };

  const getOrderTypeTag = (order: Order) => {
    const label = getOrderTypeLabel(order.orderType);
    return <Tag color={label === "Tại quầy" ? "blue" : "geekblue"}>{label}</Tag>;
  };

  const getConfirmDescription = (order: Order) => {
    if (normalizeOrderType(order.orderType) !== "ONLINE") {
      return "Đơn sẽ chuyển sang Đã xác nhận.";
    }

    return order.inventoryReserved
      ? "Đơn sẽ chuyển sang Đã xác nhận. Tồn kho đã được trừ/giữ khi khách hoàn tất đặt hàng."
      : "Đơn sẽ chuyển sang Đã xác nhận. Hệ thống sẽ kiểm tra tồn kho cho đơn chưa được giữ kho.";
  };

  const normalizedKeyword = searchText.trim().toLowerCase();

  const baseFilteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [
          order.code,
          getCustomerName(order),
          order.phone,
          order.fullAddress,
          order.address,
          order.province,
          order.district,
          order.ward,
          getOrderTypeLabel(order.orderType),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedKeyword),
          );

      const matchesOrderType =
        !orderTypeFilter || normalizeOrderType(order.orderType) === orderTypeFilter;

      const matchesDateRange = (() => {
        if (!dateRange || !dateRange[0] || !dateRange[1] || !order.createdAt) {
          return true;
        }

        const createdAt = dayjs(order.createdAt);
        return (
          (createdAt.isAfter(dateRange[0].startOf("day")) &&
            createdAt.isBefore(dateRange[1].endOf("day"))) ||
          createdAt.isSame(dateRange[0], "day") ||
          createdAt.isSame(dateRange[1], "day")
        );
      })();

      return matchesKeyword && matchesOrderType && matchesDateRange;
    });
  }, [allOrders, normalizedKeyword, orderTypeFilter, dateRange]);

  const resetFilters = () => {
    setSearchText("");
    setOrderTypeFilter(undefined);
    setDateRange(null);
  };

  const columns: ProColumns<Order>[] = [
    {
      title: "STT",
      width: 64,
      search: false,
      align: "center",
      render: (_text, _record, index) => index + 1,
    },
    {
      title: "Mã đơn",
      dataIndex: "code",
      width: 150,
      render: (text) => <Text strong>{text ? `#${text}` : "N/A"}</Text>,
    },
    {
      title: "Loại đơn",
      dataIndex: "orderType",
      key: "orderType",
      width: 120,
      align: "center",
      render: (_, record) => getOrderTypeTag(record),
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 180,
      render: (_, record) => getCustomerName(record),
    },
    {
      title: "Ngày đặt",
      dataIndex: "createdAt",
      valueType: "dateTime",
      search: false,
      width: 160,
      render: (date: any) =>
        date ? new Date(date).toLocaleString("vi-VN") : "N/A",
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      search: false,
      width: 140,
      render: (_, record: Order) => (
        <Text strong style={{ color: "#c81d1d" }}>
          {formatCurrency(getDisplayTotal(record))}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (_, record) => getStatusTag(record.status),
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentStatus",
      width: 145,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {getPaymentStatusTag(record.paymentStatus)}
          {record.paymentMethodName && (
            <Text type="secondary">{record.paymentMethodName}</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Thao tác",
      valueType: "option",
      align: "center",
      fixed: "right",
      width: 170,
      render: (_, record) => [
        <Tooltip title="Xem chi tiết" key="view">
          <Button
            icon={<EyeOutlined />}
            shape="circle"
            type="text"
            size="large"
            onClick={() => {
              setSelectedOrderId(record.id);
              setIsModalVisible(true);
            }}
          />
        </Tooltip>,

        normalizeStatus(record.status) === "COMPLETED" && (
          <Tooltip title="In hóa đơn" key="print">
            <Button
              icon={<PrinterOutlined />}
              shape="circle"
              type="text"
              size="large"
              loading={printingOrderId === record.id}
              onClick={() => handlePrintInvoice(record)}
            />
          </Tooltip>
        ),

        record.status === "PENDING" && (
          <Popconfirm
            key="confirm"
            title="Xác nhận đơn hàng này?"
            description={getConfirmDescription(record)}
            onConfirm={() => handleUpdateStatus(record.id, "CONFIRMED")}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Tooltip title="Xác nhận đơn hàng">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                shape="circle"
                size="large"
              />
            </Tooltip>
          </Popconfirm>
        ),

        record.status === "CONFIRMED" && (
          <Popconfirm
            key="ship"
            title="Xác nhận giao hàng?"
            description="Trạng thái sẽ chuyển sang Đang giao hàng."
            onConfirm={() => handleUpdateStatus(record.id, "SHIPPING")}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Tooltip title="Giao hàng">
              <Button
                type="default"
                icon={<CarOutlined />}
                shape="circle"
                size="large"
              />
            </Tooltip>
          </Popconfirm>
        ),

        record.status === "SHIPPING" && (
          <Popconfirm
            key="complete"
            title="Hoàn thành đơn hàng?"
            onConfirm={() => handleUpdateStatus(record.id, "COMPLETED")}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Tooltip title="Hoàn thành">
              <Button
                icon={<CheckCircleOutlined />}
                shape="circle"
                size="large"
                style={{ color: "green", borderColor: "green" }}
              />
            </Tooltip>
          </Popconfirm>
        ),
      ],
    },
  ];

  const renderOrderTable = (orders: Order[]) => {
    if (!orders.length) {
      return (
        <Empty
          description="Không có hóa đơn phù hợp"
          style={{ padding: "24px 0" }}
        />
      );
    }

    return (
      <Table
        columns={columns as any}
        dataSource={orders}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1250 }}
      />
    );
  };

  const getOrdersByStatus = (status: string) =>
    baseFilteredOrders.filter((order) => normalizeStatus(order.status) === status);

  const tabItems = [
    {
      key: "PENDING",
      label: `Chờ xác nhận (${getOrdersByStatus("PENDING").length})`,
      children: renderOrderTable(getOrdersByStatus("PENDING")),
    },
    {
      key: "CONFIRMED",
      label: `Đã xác nhận (${getOrdersByStatus("CONFIRMED").length})`,
      children: renderOrderTable(getOrdersByStatus("CONFIRMED")),
    },
    {
      key: "SHIPPING",
      label: `Đang giao (${getOrdersByStatus("SHIPPING").length})`,
      children: renderOrderTable(getOrdersByStatus("SHIPPING")),
    },
    {
      key: "COMPLETED",
      label: `Hoàn thành (${getOrdersByStatus("COMPLETED").length})`,
      children: renderOrderTable(getOrdersByStatus("COMPLETED")),
    },
    {
      key: "CANCELLED",
      label: `Đã hủy (${getOrdersByStatus("CANCELLED").length})`,
      children: renderOrderTable(getOrdersByStatus("CANCELLED")),
    },
  ];

  return (
    <Card
      style={{
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        boxShadow: "0 6px 16px rgb(0 0 0 / 8%)",
        margin: "16px",
      }}
      bodyStyle={{ padding: 24 }}
      bordered={false}
      title={
        <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
          Quản lý Đơn hàng / Hóa đơn
        </Title>
      }
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={10}>
              <Input
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
                placeholder="Tìm theo mã đơn, tên khách, số điện thoại, địa chỉ..."
              />
            </Col>

            <Col xs={24} md={5}>
              <Select
                allowClear
                value={orderTypeFilter}
                onChange={(value) => setOrderTypeFilter(value)}
                placeholder="Lọc theo loại đơn"
                style={{ width: "100%" }}
                options={[
                  { label: "Tại quầy", value: "POS" },
                  { label: "Online", value: "ONLINE" },
                ]}
              />
            </Col>

            <Col xs={24} md={7}>
              <RangePicker
                value={dateRange}
                onChange={(values) =>
                  setDateRange(values as [Dayjs | null, Dayjs | null] | null)
                }
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} md={2}>
              <Button icon={<ReloadOutlined />} onClick={resetFilters} block>
                Reset
              </Button>
            </Col>
          </Row>

          <Tabs
            defaultActiveKey="PENDING"
            activeKey={activeTab}
            items={tabItems}
            onChange={(key) => navigate(`/admin/orders?tab=${key}`)}
          />
        </Space>
      </Spin>

      <OrderDetailModal
        orderId={selectedOrderId}
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </Card>
  );
};

export default OrderManagementPage;
