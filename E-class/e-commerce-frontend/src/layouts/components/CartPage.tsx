import { useState, useEffect, useMemo, useRef } from "react";
import {
  Table,
  Button,
  InputNumber,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Image,
  Tooltip,
  Divider,
  message, // eslint-disable-next-line prettier/prettier
  Popconfirm,
  Spin, // eslint-disable-next-line prettier/prettier
  Tabs,
} from "antd";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableRowSelection } from "antd/es/table/interface";
import { cartService } from "@/services/cart.service";
import { useNavigate, useLocation } from "react-router-dom";
import { orderService } from "@/services/order.service";
import MyOrdersPage from "./MyOrdersPage";
import { useAuth } from "@/services/AuthContext";
import { FALLBACK_PRODUCT_IMAGE, resolveImageUrl } from "@/utils/utils";
import { getProductAttributeLabel } from "@/utils/productAttributeLabel";

const { Title, Text } = Typography;

interface CartItem {
  key: React.Key;
  id: number;
  productId: number;
  image: string;
  name: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  materialName?: string | null;
  price: number;
  originalPrice: number;
  unitPrice: number;
  discountPercent: number;
  isSale: boolean;
  quantity: number;
  total: number;
  variantId: number;
  productActive?: boolean | null;
  variantActive?: boolean | null;
  stockRemaining?: number | null;
}

const CartPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});
  const [updatingItemIds, setUpdatingItemIds] = useState<Record<number, boolean>>({});
  const [loadingCart, setLoadingCart] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchOrderCount } = useAuth();
  const quantityRequestSeqRef = useRef<Record<number, number>>({});
  const updatingItemIdsRef = useRef<Record<number, boolean>>({});

  const activeTab = useMemo(
    () => new URLSearchParams(location.search).get("tab") || "cart",
    [location.search],
  ); // eslint-disable-line

  const formatMoney = (value: number) =>
    `${Number(value || 0).toLocaleString("vi-VN")} đ`;

  const mapCartItems = (items: any[] = []): CartItem[] =>
    items.map((item: any) => ({
      key: item.cartItemId,
      id: item.cartItemId,
      productId: item.productId,
      image: resolveImageUrl(item.imageUrl),
      name: String(item.productName || "-"),
      sku: String(item.variantCode || "-"),
      size: item.size,
      color: item.color,
      material: item.materialName ?? item.material ?? null,
      materialName: item.materialName ?? item.material ?? null,
      price: Number(item.unitPrice ?? item.salePrice ?? item.price ?? 0),
      originalPrice: Number(item.originalPrice ?? item.price ?? 0),
      unitPrice: Number(item.unitPrice ?? item.salePrice ?? item.price ?? 0),
      discountPercent: Number(item.discountPercent ?? 0),
      isSale: Boolean(item.isSale),
      quantity: Number(item.quantity ?? 0),
      total: Number(
        item.lineTotal ??
          item.subTotal ??
          Number(item.quantity || 0) *
            Number(item.unitPrice ?? item.salePrice ?? item.price ?? 0),
      ),
      variantId: item.variantId,
      productActive: item.productActive ?? null,
      variantActive: item.variantActive ?? null,
      stockRemaining: item.stockRemaining ?? null,
    }));

const getItemError = (item: CartItem): string | null => {
  if (item.productActive === false) return "Sản phẩm đã ngừng bán";
  if (item.variantActive === false) return "Biến thể đã ngừng bán";
  if (item.stockRemaining !== null && item.stockRemaining !== undefined && item.stockRemaining <= 0)
    return "Sản phẩm đã hết hàng";
  return null;
};

  const applyCartResponse = (cartData: any) => {
    const items = mapCartItems(cartData?.items || []);
    const validKeys = new Set(items.map((item) => item.key));

    setCartItems(items);
    setLocalQuantities(
      items.reduce<Record<number, number>>((acc, item) => {
        acc[item.id] = item.quantity;
        return acc;
      }, {}),
    );
    setSelectedRowKeys((prev) => prev.filter((key) => validKeys.has(key)));
    fetchOrderCount();
  };

  const fetchCart = async () => {
    try {
      setLoadingCart(true);

      const response = await cartService.getCart();
      applyCartResponse(response.data);
    } catch (error: any) {
      console.error("Failed to fetch cart:", error);

      if (error.response?.status === 401) {
        message.error("Vui lòng đăng nhập để xem giỏ hàng!");
        navigate("/account");
      } else if (error.response?.status === 403) {
        setCartItems([]);
      } else {
        message.error("Không thể tải giỏ hàng. Vui lòng thử lại!");
      }
    } finally {
      setLoadingCart(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await orderService.getMyOrders();
      setAllOrders(
        response.data.content.map((order: any) => ({
          ...order,
          orderDate: order.createdAt,
          key: order.id,
        })),
      );
    } catch (error: any) {
      if (error.response?.status === 401) {
        message.error("Vui lòng đăng nhập để xem đơn hàng!");
      } else {
        message.error("Không thể tải danh sách đơn hàng.");
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === "cart") {
      fetchCart();
    } else if (
      ["pending", "confirmed", "shipping", "completed", "cancelled"].includes(
        activeTab,
      )
    ) {
      fetchOrders();
    }
  }, [activeTab]);


  const setItemUpdating = (cartItemId: number, value: boolean) => {
    updatingItemIdsRef.current[cartItemId] = value;
    setUpdatingItemIds((prev) => ({
      ...prev,
      [cartItemId]: value,
    }));
  };

  const handleQuantityInputChange = (
    cartItemId: number,
    quantity: number | null,
  ) => {
    setLocalQuantities((prev) => ({
      ...prev,
      [cartItemId]: quantity === null ? 1 : Math.max(1, Number(quantity)),
    }));
  };

  const handleQuantityCommit = async (
    cartItemId: number,
    quantity: number | null,
  ) => {
    const nextQuantity = Number(quantity);
    const currentItem = cartItems.find((item) => item.id === cartItemId);

    if (updatingItemIdsRef.current[cartItemId]) {
      return;
    }

    if (!currentItem || !Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setLocalQuantities((prev) => ({
        ...prev,
        [cartItemId]: currentItem?.quantity ?? 1,
      }));
      return;
    }

    if (nextQuantity === currentItem.quantity) {
      return;
    }

    const requestSeq = (quantityRequestSeqRef.current[cartItemId] || 0) + 1;
    quantityRequestSeqRef.current[cartItemId] = requestSeq;
    setItemUpdating(cartItemId, true);

    try {
      const response = await cartService.updateItemQuantity(
        cartItemId,
        nextQuantity,
      );
      if (quantityRequestSeqRef.current[cartItemId] !== requestSeq) {
        return;
      }
      applyCartResponse(response.data);
      message.success("Cập nhật số lượng thành công!");
    } catch (error: any) {
      setLocalQuantities((prev) => ({
        ...prev,
        [cartItemId]: currentItem.quantity,
      }));
      message.error(
        error?.response?.data?.message || "Cập nhật số lượng thất bại!",
      );
      console.error("Failed to update quantity:", error);
    } finally {
      if (quantityRequestSeqRef.current[cartItemId] === requestSeq) {
        setItemUpdating(cartItemId, false);
      }
    }
  };

  const handleRemoveItem = async (cartItemId: number) => {
    try {
      await cartService.removeItem(cartItemId);
      message.success("Đã xóa sản phẩm khỏi giỏ hàng!");
      fetchCart();
      fetchOrderCount();
      setSelectedRowKeys(selectedRowKeys.filter((k) => k !== cartItemId));
    } catch (error) {
      message.error("Xóa sản phẩm thất bại!");
    }
  };

  const handleViewDetail = (record: CartItem) => {
    if (!record.productId) {
      message.warning("Sản phẩm này chưa có productId, cần sửa API giỏ hàng.");
      return;
    }

    navigate(`/products/${record.productId}`);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<any> = {
    selectedRowKeys,
    onChange: onSelectChange,
    columnWidth: 48,
  };

  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "name",
      key: "name",
      width: 360,
      render: (_: any, record: CartItem) => (
        <Space align="start" className="cart-product-cell">
          <Image
            width={76}
            height={76}
            src={record.image}
            preview={false}
            className="cart-product-image"
            fallback={FALLBACK_PRODUCT_IMAGE}
          />
          <Space direction="vertical" size={4} className="cart-product-info">
            <Text strong className="cart-product-name">{record.name}</Text>

            <Text type="secondary" className="cart-product-sku" title={record.sku}>
              SKU: {record.sku || "-"}
            </Text>
            <div className="cart-variant-line cart-variant-inline">
              <span>
                {getProductAttributeLabel("SIZE")}: <strong>{record.size || "-"}</strong>
              </span>
              <span>
                {getProductAttributeLabel("COLOR")}: <strong>{record.color || "-"}</strong>
              </span>
            </div>
            <div className="cart-variant-line">
              {getProductAttributeLabel("MATERIAL")}: <strong>{record.materialName || record.material || "Chưa cập nhật"}</strong>
            </div>
            {getItemError(record) && (
              <Text type="danger" style={{ fontSize: 12 }}>
                ⚠ {getItemError(record)}
              </Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "price",
      key: "price",
      width: 150,
      align: "right" as const,
      render: (_price: number, record: CartItem) => (
        <Space size={8} className="cart-price-cell">
          <Text strong className={record.isSale ? "cart-price-sale" : "cart-price"}>
            {formatMoney(record.unitPrice)}
          </Text>
          {record.isSale && record.originalPrice > record.unitPrice && (
            <Space size={6} className="cart-original-price-row">
              <Text delete type="secondary" className="cart-original-price">
                {formatMoney(record.originalPrice)}
              </Text>
              <Text type="danger" className="cart-discount-text">
                -{record.discountPercent}%
              </Text>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      align: "center" as const,
      render: (quantity: number, record: CartItem) => (
        <InputNumber
          className="cart-quantity-input"
          min={1}
          value={localQuantities[record.id] ?? quantity}
          disabled={!!updatingItemIds[record.id]}
          onChange={(value) => handleQuantityInputChange(record.id, value)}
          onBlur={() =>
            handleQuantityCommit(record.id, localQuantities[record.id] ?? quantity)
          }
          onPressEnter={() =>
            handleQuantityCommit(record.id, localQuantities[record.id] ?? quantity)
          }
          onStep={(value) => handleQuantityCommit(record.id, Number(value))}
        />
      ),
    },
    {
      title: "Thành tiền",
      dataIndex: "total",
      key: "total",
      width: 150,
      align: "right" as const,
      render: (total: number) => (
        <Text strong className="cart-line-total">
          {formatMoney(total)}
        </Text>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 116,
      align: "center" as const,
      render: (_: any, record: CartItem) => (
        <Space size={8} className="cart-actions">
          <Tooltip title="Xem chi tiết">
            <Button
              icon={<EyeOutlined />}
              shape="circle"
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa sản phẩm?"
            description="Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?"
            onConfirm={() => handleRemoveItem(record.id)}
            okText="Đồng ý"
            cancelText="Không"
          >
            <Tooltip title="Xóa khỏi giỏ">
              <Button icon={<DeleteOutlined />} shape="circle" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const selectedItems = cartItems.filter((item) =>
    selectedRowKeys.includes(item.key),
  );
  const subtotal = selectedItems.reduce((acc, item) => acc + item.total, 0);

  const invalidSelectedItems = selectedItems.filter((item) => getItemError(item) !== null);

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      message.warning("Vui lòng chọn sản phẩm để thanh toán.");
      return;
    }

    if (invalidSelectedItems.length > 0) {
      message.error("Vui lòng bỏ chọn các sản phẩm không hợp lệ trước khi thanh toán.");
      return;
    }

    navigate("/checkout", { state: { items: selectedItems, subtotal } });
  };

  const handleTabChange = (key: string) => {
    navigate(`/cart?tab=${key}`);
  };

  const filterOrdersByStatus = (status: string) => {
    const normalizeStatus = (value?: string) => {
      const raw = String(value ?? "").trim().toUpperCase();

      if (["PENDING", "WAITING_CONFIRM"].includes(raw)) return "PENDING";
      if (["CONFIRMED"].includes(raw)) return "CONFIRMED";
      if (["SHIPPING", "DELIVERING"].includes(raw)) return "SHIPPING";
      if (["COMPLETED"].includes(raw)) return "COMPLETED";
      if (["CANCELLED", "CANCELED"].includes(raw)) return "CANCELLED";

      return raw;
    };

    return allOrders.filter((order) => normalizeStatus(order.status) === status);
  };

  const tabItems = [
    {
      key: "cart",
      label: `Giỏ hàng của bạn (${cartItems.length})`,
      children: (
        <Row gutter={[24, 24]} align="start" className="cart-content-row">
          <Col xs={24} lg={16} xl={17}>
            <Card bordered={false} className="cart-table-card">
              <Spin spinning={loadingCart}>
                <Table
                  className="cart-table"
                  rowSelection={rowSelection}
                  columns={columns}
                  dataSource={cartItems}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 900 }}
                />
              </Spin>
            </Card>
          </Col>
          <Col xs={24} lg={8} xl={7}>
            <Card hoverable bordered={false} className="cart-summary-card">
              <Title level={4} className="cart-summary-title">Tóm tắt đơn hàng</Title>
              <Divider className="cart-summary-divider" />
              <Row justify="space-between" align="middle" key="selected-row" className="cart-summary-row">
                <Text>Đã chọn {selectedItems.length} sản phẩm</Text>
                <Text strong>{formatMoney(subtotal)}</Text>
              </Row>
              <Row justify="space-between" align="middle" key="subtotal-row" className="cart-summary-row">
                <Text>Tạm tính</Text>
                <Text strong>{formatMoney(subtotal)}</Text>
              </Row>
              <Divider className="cart-summary-divider" />
              <Row justify="space-between" align="middle" key="total-row" className="cart-summary-total">
                <Text strong>Tổng cộng</Text>
                <Text strong className="cart-summary-total-value">
                  {formatMoney(subtotal)}
                </Text>
              </Row>
              {selectedItems.length === 0 && (
                <Text type="secondary" className="cart-checkout-hint">
                  Vui lòng chọn sản phẩm để thanh toán.
                </Text>
              )}
              {invalidSelectedItems.length > 0 && (
                <Text type="danger" style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
                  ⚠ {invalidSelectedItems.length} sản phẩm không hợp lệ. Bỏ chọn hoặc xóa để tiếp tục.
                </Text>
              )}
              <Button
                type="primary"
                block
                size="large"
                className="cart-checkout-button"
                disabled={selectedItems.length === 0 || invalidSelectedItems.length > 0}
                onClick={handleCheckout}
              >
                Tiến hành thanh toán
              </Button>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: "pending",
      label: `Chờ xác nhận (${filterOrdersByStatus("PENDING").length})`,
      children: (
        <MyOrdersPage
          orders={filterOrdersByStatus("PENDING")}
          loading={loadingOrders}
          onUpdate={fetchOrders}
        />
      ),
    },
    {
      key: "confirmed",
      label: `Đã xác nhận (${filterOrdersByStatus("CONFIRMED").length})`,
      children: (
        <MyOrdersPage
          orders={filterOrdersByStatus("CONFIRMED")}
          loading={loadingOrders}
          onUpdate={fetchOrders}
        />
      ),
    },
    {
      key: "shipping",
      label: `Đang giao (${filterOrdersByStatus("SHIPPING").length})`,
      children: (
        <MyOrdersPage
          orders={filterOrdersByStatus("SHIPPING")}
          loading={loadingOrders}
          onUpdate={fetchOrders}
        />
      ),
    },
    {
      key: "completed",
      label: `Hoàn thành (${filterOrdersByStatus("COMPLETED").length})`,
      children: (
        <MyOrdersPage
          orders={filterOrdersByStatus("COMPLETED")}
          loading={loadingOrders}
          onUpdate={fetchOrders}
        />
      ),
    },
    {
      key: "cancelled",
      label: `Đã hủy (${filterOrdersByStatus("CANCELLED").length})`,
      children: (
        <MyOrdersPage
          orders={filterOrdersByStatus("CANCELLED")}
          loading={loadingOrders}
          onUpdate={fetchOrders}
        />
      ),
    },
  ];

  return (
    <div className="cart-page">
      <Title level={2} className="cart-page-title">
        Quản lý giỏ hàng & Đơn hàng
      </Title>
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={handleTabChange}
        className="cart-tabs"
      />
    </div>
  );
};

export default CartPage;
