import { useEffect, useState, type Key } from "react";
import {
  Modal,
  Spin,
  message,
  Typography,
  Card,
  Descriptions,
  Table,
  Tag,
  Image,
  Timeline,
  Space,
  Divider,
  Button,
  Form,
  Input,
  Rate,
} from "antd";
import { orderService } from "@/services/order.service";
import { reviewService } from "@/services/review.service";
import axios, { AxiosResponse } from "axios";
import type { ReviewRequest } from "@/features/review/review.model";
import {
  formatKnownVariantAttributes,
  normalizeProductAttributeText,
} from "@/utils/productAttributeLabel";
import { FALLBACK_PRODUCT_IMAGE, resolveImageUrl } from "@/utils/utils";

const { Title, Text } = Typography;

interface OrderItem {
  orderItemId: number;
  productId: number;
  productName: string;
  variantInfo: string;
  imageUrl: string;
  productImage?: string;
  size?: string;
  color?: string;
  material?: string;
  quantity: number;
  price: number;
  subtotal: number;
  reviewed?: boolean;
  canReview?: boolean;
  reviewId?: number | null;
  key: Key;
}

interface OrderStatusHistory {
  id: number;
  orderId?: number;
  fromStatus?: string | null;
  toStatus: string;
  changedAt: string;
}

interface OrderDetail {
  id: number;
  code: string;
  createdAt: string;
  status: string;
  customerName: string;
  phone: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  fullAddress?: string;
  paymentMethodName: string;
  paymentStatus?: string | null;
  paymentMethodCode?: string | null;
  subtotalAmount: number;
  originalSubtotal?: number | string | null;
  productDiscountTotal?: number | string | null;
  subtotalBeforeVoucher?: number | string | null;
  totalAmount: number;
  shippingFee: number;
  voucherCode?: string | null;
  couponCode?: string | null;
  discountCode?: string | null;
  discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue?: number;
  discountAmount?: number;
  voucherDiscountAmount?: number | string | null;
  couponDiscountAmount?: number | string | null;
  promotionDiscountAmount?: number | string | null;
  discountPercent?: number;
  orderType?: string | null;
  employeeId?: number | null;
  employeeName?: string | null;
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
}

const formatCurrency = (value?: number | string | null) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const normalizePositiveMoney = (value: unknown) => {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue) || Math.abs(numericValue) < 1) {
    return 0;
  }

  return Math.abs(numericValue);
};

const getVoucherDiscountAmount = (order: OrderDetail) =>
  normalizePositiveMoney(
    order.voucherDiscountAmount ??
      order.couponDiscountAmount ??
      order.discountAmount ??
      0,
  );

const getStatusMeta = (status: string) => {
  const statusMap: Record<string, { color: string; text: string }> = {
    DRAFT: { color: "default", text: "Nháp" },
    PENDING: { color: "gold", text: "Chờ xác nhận" },
    CONFIRMED: { color: "lime", text: "Đã xác nhận" },
    SHIPPING: { color: "blue", text: "Đang giao" },
    COMPLETED: { color: "green", text: "Hoàn thành" },
    CANCELLED: { color: "red", text: "Đã hủy" },
  };

  return statusMap[status] || { color: "default", text: status };
};

const getStatusTag = (status: string) => {
  const meta = getStatusMeta(status);
  return <Tag color={meta.color}>{meta.text}</Tag>;
};

const getPaymentStatusTag = (paymentStatus?: string | null) => {
  const normalizedStatus = String(paymentStatus ?? "").trim().toUpperCase();

  switch (normalizedStatus) {
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

const OrderDetailModal = ({
  orderId,
  visible,
  onClose,
  onReviewSubmitted,
}: {
  orderId: number | null;
  visible: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm] = Form.useForm<ReviewRequest>();

  const loadOrder = (signal?: AbortSignal) => {
    if (!orderId || !visible) {
      return;
    }

    setLoading(true);
    orderService
      .getOrderDetails(orderId, signal ? { signal } : undefined)
      .then((response: AxiosResponse<OrderDetail>) => {
        setOrder(response.data);
      })
      .catch((error: any) => {
        if (error.name !== "AbortError" && !axios.isCancel(error)) {
          message.error("Không thể tải chi tiết đơn hàng.");
          onClose();
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    loadOrder(controller.signal);
    return () => controller.abort();
  }, [orderId, visible]);

  const openReviewModal = (item: OrderItem) => {
    setReviewingItem(item);
    reviewForm.resetFields();
  };

  const closeReviewModal = () => {
    setReviewingItem(null);
    reviewForm.resetFields();
  };

  const submitReview = async () => {
    const values = await reviewForm.validateFields();
    if (!reviewingItem) return;

    setSubmittingReview(true);
    try {
      await reviewService.createReviewByOrderItem(reviewingItem.orderItemId, {
        rating: values.rating,
        comment: values.comment?.trim() ?? "",
      });
      message.success("Đánh giá sản phẩm thành công");
      closeReviewModal();
      loadOrder();
      onReviewSubmitted?.();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể gửi đánh giá sản phẩm",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const itemColumns = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (text: string, record: OrderItem) => {
        const variantText =
          formatKnownVariantAttributes({
            color: record.color,
            size: record.size,
            material: record.material,
          }) || normalizeProductAttributeText(record.variantInfo);

        return (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Image
              width={60}
              src={resolveImageUrl(record.productImage || record.imageUrl)}
              fallback={FALLBACK_PRODUCT_IMAGE}
              preview={false}
              style={{ marginRight: 12, borderRadius: 8, objectFit: "cover" }}
            />
            <div>
              <Text strong>{text}</Text>
              {variantText && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {variantText}
                  </Text>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Đơn giá",
      dataIndex: "price",
      key: "price",
      render: (price: number) => formatCurrency(price),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Thành tiền",
      dataIndex: "subtotal",
      key: "subtotal",
      render: (total: number) => (
        <Text strong style={{ color: "#c81d1d" }}>
          {formatCurrency(total)}
        </Text>
      ),
    },
    {
      title: "Đánh giá",
      key: "review",
      width: 150,
      render: (_: unknown, record: OrderItem) => {
        if (record.reviewed) {
          return <Tag color="green">Đã đánh giá</Tag>;
        }

        if (record.canReview) {
          return (
            <Button type="primary" onClick={() => openReviewModal(record)}>
              Đánh giá
            </Button>
          );
        }

        return <Text type="secondary">Chưa thể đánh giá</Text>;
      },
    },
  ];

  const voucherDiscountAmount = order ? getVoucherDiscountAmount(order) : 0;
  const productDiscountAmount = order
    ? normalizePositiveMoney(order.productDiscountTotal)
    : 0;
  const shouldShowProductDiscountRow =
    Boolean(order) &&
    Number.isFinite(productDiscountAmount) &&
    productDiscountAmount > 0;
  const shouldShowVoucherRow =
    Boolean(order) &&
    Number.isFinite(voucherDiscountAmount) &&
    voucherDiscountAmount > 0;
  const rawVoucherCode =
    order?.voucherCode ?? order?.couponCode ?? order?.discountCode ?? "";
  const voucherCode = String(rawVoucherCode).trim();
  const voucherLabel = voucherCode
    ? `Mã giảm giá (${voucherCode})`
    : "Mã giảm giá";
  const displaySubtotal = shouldShowProductDiscountRow
    ? order?.originalSubtotal ?? order?.subtotalAmount
    : order?.subtotalAmount;

  return (
    <>
      <Modal
        title={<Title level={4}>Chi tiết đơn hàng #{order?.code}</Title>}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={980}
        destroyOnClose
      >
        <Spin spinning={loading}>
          {order && (
            <Card bordered={false}>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Ngày đặt">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString("vi-VN")
                    : "N/A"}
                </Descriptions.Item>

                <Descriptions.Item label="Trạng thái hiện tại">
                  {getStatusTag(order.status)}
                </Descriptions.Item>

                <Descriptions.Item label="Loại đơn hàng">
                  {order.orderType === "POS" ? "Tại quầy" : "Online"}
                </Descriptions.Item>

                <Descriptions.Item label="Người nhận / Khách hàng">
                  {order.customerName || "N/A"}
                </Descriptions.Item>

                {order.phone && (
                  <Descriptions.Item label="Số điện thoại">
                    {order.phone}
                  </Descriptions.Item>
                )}

                {order.fullAddress && (
                  <Descriptions.Item label="Địa chỉ ">
                    {order.fullAddress}
                  </Descriptions.Item>
                )}

                {order.orderType === "POS" && (
                  <>
                    <Descriptions.Item label="ID NV tạo">
                      {order.employeeId || ""}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tên NV tạo">
                      {order.employeeName || ""}
                    </Descriptions.Item>
                  </>
                )}

                <Descriptions.Item label="Phương thức thanh toán">
                  {order.paymentMethodName}
                </Descriptions.Item>

                <Descriptions.Item label="Trạng thái thanh toán">
                  {getPaymentStatusTag(order.paymentStatus)}
                </Descriptions.Item>
              </Descriptions>

              <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
                Danh sách sản phẩm
              </Title>

              <Table
                columns={itemColumns}
                dataSource={order.items.map((item) => ({
                  ...item,
                  key: item.orderItemId,
                }))}
                pagination={false}
                bordered
              />

              <Descriptions
                bordered
                column={1}
                size="small"
                style={{ marginTop: 24 }}
              >
                <Descriptions.Item label="Tạm tính">
                  <Text strong>{formatCurrency(displaySubtotal)}</Text>
                </Descriptions.Item>

                {shouldShowProductDiscountRow && (
                  <Descriptions.Item label="Giảm sản phẩm">
                    <Text strong type="success">
                      -{formatCurrency(productDiscountAmount)}
                    </Text>
                  </Descriptions.Item>
                )}

                {shouldShowVoucherRow && (
                  <Descriptions.Item label={voucherLabel}>
                    <Text strong type="success">
                      -{formatCurrency(voucherDiscountAmount)}
                    </Text>
                  </Descriptions.Item>
                )}

                <Descriptions.Item label="Phí vận chuyển">
                  <Text strong>{formatCurrency(order.shippingFee)}</Text>
                </Descriptions.Item>

                <Descriptions.Item label="Tổng thanh toán">
                  <Title level={4} style={{ color: "#c81d1d", margin: 0 }}>
                    {formatCurrency(order.totalAmount)}
                  </Title>
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Title level={5} style={{ margin: 0 }}>
                  Lịch sử trạng thái
                </Title>

                {order.statusHistory && order.statusHistory.length > 0 ? (
                  <Timeline
                    items={order.statusHistory.map((history) => ({
                      color: getStatusMeta(history.toStatus).color,
                      children: (
                        <Space direction="vertical" size={0}>
                          <Text strong>
                            {getStatusMeta(history.toStatus).text}
                          </Text>
                          <Text type="secondary">
                            {history.changedAt
                              ? new Date(history.changedAt).toLocaleString(
                                  "vi-VN",
                                )
                              : "N/A"}
                          </Text>
                          {history.fromStatus && (
                            <Text type="secondary">
                              Từ {getStatusMeta(history.fromStatus).text} →{" "}
                              {getStatusMeta(history.toStatus).text}
                            </Text>
                          )}
                        </Space>
                      ),
                    }))}
                  />
                ) : (
                  <Text type="secondary">Chưa có lịch sử trạng thái.</Text>
                )}
              </Space>
            </Card>
          )}
        </Spin>
      </Modal>

      <Modal
        title="Đánh giá sản phẩm"
        open={!!reviewingItem}
        onCancel={closeReviewModal}
        onOk={submitReview}
        okText="Gửi đánh giá"
        cancelText="Hủy"
        confirmLoading={submittingReview}
        destroyOnClose
        width={560}
      >
        {reviewingItem && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space align="center">
              <Image
                width={72}
                height={72}
                src={resolveImageUrl(
                  reviewingItem.productImage || reviewingItem.imageUrl,
                )}
                fallback={FALLBACK_PRODUCT_IMAGE}
                preview={false}
                style={{ borderRadius: 8, objectFit: "cover" }}
              />
              <div>
                <Text strong>{reviewingItem.productName}</Text>
                <br />
                <Text type="secondary">
                  {formatKnownVariantAttributes({
                    color: reviewingItem.color,
                    size: reviewingItem.size,
                    material: reviewingItem.material,
                  }) || reviewingItem.variantInfo}
                </Text>
              </div>
            </Space>

            <Form<ReviewRequest> form={reviewForm} layout="vertical">
              <Form.Item
                name="rating"
                label="Số sao"
                rules={[{ required: true, message: "Vui lòng chọn số sao" }]}
              >
                <Rate style={{ fontSize: 30, color: "#f5b800" }} />
              </Form.Item>

              <Form.Item
                name="comment"
                label="Nhận xét"
                rules={[
                  { required: true, message: "Vui lòng nhập nhận xét" },
                  { max: 1000, message: "Nhận xét không được quá 1000 ký tự" },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  maxLength={1000}
                  showCount
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm"
                />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>
    </>
  );
};

export default OrderDetailModal;
