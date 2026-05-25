import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  GiftOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";

import {
  PosAvailableDiscountResponse,
  PosCheckoutValidationResponse,
  PosOrderItemResponse,
  PosOrderResponse,
  PosProductSearchResponse,
  posService,
} from "@/services/pos.services";

import {
  PaymentMethodResponse,
  paymentMethodService,
} from "@/services/paymentMethod.service";
import VoucherSelectorModal, {
  buildVoucherOptions,
  getBestVoucher,
  VoucherOption,
} from "@/components/VoucherSelectorModal";
import { handleImageError, resolveImageUrl } from "@/utils/utils";
import { formatKnownVariantAttributes } from "@/utils/productAttributeLabel";

const { Title, Text } = Typography;

const DEFAULT_STORE_ID = 1;

const MAX_DRAFT_POS_ORDERS = 5;

const POS_PAYMENT_CODES = ["CASH", "VNPAY"];

const currency = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN").format(value ?? 0);

const formatUsageNumber = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "Không giới hạn";
  }

  return value.toLocaleString("vi-VN");
};

const formatUsagePercent = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${Number(value).toFixed(1)}%`;
};

const VIETNAM_PHONE_REGEX = /^(0)(3|5|7|8|9)[0-9]{8}$/;
const DANGEROUS_TEXT_REGEX = /[<>{}[\]]|script/i;

const normalizeTextInput = (value?: string) => String(value || "").trim();

const isValidPersonName = (value?: string) => {
  const text = normalizeTextInput(value);
  return (
    text.length >= 2 &&
    text.length <= 100 &&
    !/^\d+$/.test(text) &&
    !DANGEROUS_TEXT_REGEX.test(text)
  );
};

const isValidOptionalAddress = (value?: string) => {
  const text = normalizeTextInput(value);
  if (!text) {
    return true;
  }

  return (
    text.length >= 5 &&
    text.length <= 255 &&
    !/^\d+$/.test(text) &&
    !DANGEROUS_TEXT_REGEX.test(text)
  );
};

const buildVariantText = (
  color?: string | null,
  size?: string | null,
  material?: string | null,
  variantCode?: string | null,
  barcode?: string | null,
) => {
  const variantInfo = formatKnownVariantAttributes({ color, size, material });

  if (variantInfo && barcode) {
    return `${variantInfo} • Barcode: ${barcode}`;
  }

  if (variantInfo && variantCode) {
    return `${variantInfo} • Mã: ${variantCode}`;
  }

  if (variantInfo) {
    return variantInfo;
  }

  if (barcode) {
    return `Barcode: ${barcode}`;
  }

  if (variantCode) {
    return `Mã: ${variantCode}`;
  }

  return "-";
};

const getStockTextStyle = (stockQuantity?: number | null): CSSProperties => {
  if ((stockQuantity ?? 0) <= 0) {
    return { color: "#ff4d4f", fontWeight: 600 };
  }

  if ((stockQuantity ?? 0) <= 5) {
    return { color: "#fa8c16", fontWeight: 600 };
  }

  return {};
};

const getPosFinalPrice = (product: PosProductSearchResponse) =>
  product.finalPrice ?? product.salePrice ?? product.sellingPrice ?? 0;

const hasPosDiscount = (product: PosProductSearchResponse) => {
  const originalPrice = product.originalPrice ?? product.sellingPrice ?? 0;
  const finalPrice = getPosFinalPrice(product);

  return originalPrice > finalPrice;
};

const isPosProductInStock = (product: PosProductSearchResponse) =>
  product.inStock ?? ((product.stockQuantity ?? 0) > 0);

const renderPosProductPrice = (product: PosProductSearchResponse) => {
  const originalPrice = product.originalPrice ?? product.sellingPrice ?? 0;
  const finalPrice = getPosFinalPrice(product);
  const discountPercent = product.discountPercent ?? 0;

  if (!hasPosDiscount(product)) {
    return <Text>{currency(originalPrice)} đ</Text>;
  }

  return (
    <Space direction="vertical" size={2}>
      <Text delete type="secondary" style={{ fontSize: 12 }}>
        {currency(originalPrice)} đ
      </Text>
      <Space size={6} wrap>
        <Text strong style={{ color: "#cf1322" }}>
          {currency(finalPrice)} đ
        </Text>
        <Tag color="red" style={{ marginInlineEnd: 0 }}>
          -
          {discountPercent > 0
            ? `${Number(discountPercent).toFixed(0)}%`
            : currency(product.discountAmount)}
        </Tag>
      </Space>
    </Space>
  );
};

const panelCardStyle: CSSProperties = {
  borderRadius: 16,
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  border: "1px solid #f0f0f0",
};

const voucherCardBaseStyle: CSSProperties = {
  borderRadius: 12,
};

const softPanelStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid #f0f0f0",
  background: "#fafafa",
  boxShadow: "none",
};

const summaryBoxStyle: CSSProperties = {
  borderRadius: 14,
  padding: 14,
  border: "1px solid #eef2f6",
  background: "linear-gradient(180deg, #ffffff 0%, #fafcff 100%)",
  minHeight: 96,
};

const infoLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#8c8c8c",
  display: "block",
  marginBottom: 6,
};

const infoValueStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#1f1f1f",
};

const getDraftOrderStyle = (active: boolean): CSSProperties => ({
  cursor: "pointer",
  borderRadius: 12,
  padding: 14,
  marginBottom: 10,
  border: active ? "1px solid #91caff" : "1px solid #f0f0f0",
  background: active ? "#f0f7ff" : "#fff",
  transition: "all 0.2s ease",
  boxShadow: active ? "0 8px 18px rgba(22, 119, 255, 0.10)" : "none",
});

const PosManagement = () => {
  const [draftOrders, setDraftOrders] = useState<PosOrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PosOrderResponse | null>(
    null,
  );

  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<PosProductSearchResponse[]>([]);
  const [searching, setSearching] = useState(false);

  const [creating, setCreating] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [quickCustomerData, setQuickCustomerData] = useState({
    fullName: "",
    phone: "",
    address: "",
  });

  const [availableDiscounts, setAvailableDiscounts] = useState<
    PosAvailableDiscountResponse[]
  >([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [selectedDiscount, setSelectedDiscount] =
    useState<PosAvailableDiscountResponse | null>(null);
  const [manualDiscountSelection, setManualDiscountSelection] = useState(false);
  const [userRemovedDiscount, setUserRemovedDiscount] = useState(false);
  const lastOrderIdRef = useRef<number | null>(null);

  const [voucherPickerOpen, setVoucherPickerOpen] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>(
    [],
  );

  const [checkoutData, setCheckoutData] = useState({
    paymentMethodId: 0,
    customerPaid: 0,
    note: "",
  });

  const [validationResult, setValidationResult] =
    useState<PosCheckoutValidationResponse | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const [pendingCheckoutPayload, setPendingCheckoutPayload] = useState<{
    paymentMethodId: number;
    customerPaid: number;
    couponId?: number | null;
    note?: string;
    isVnpay: boolean;
  } | null>(null);

  const loadDraftOrders = async () => {
    try {
      const data = await posService.getDraftOrders();
      setDraftOrders(data);

      if (data.length > 0) {
        const stillExists = data.some((o) => o.orderId === selectedOrderId);
        const nextId = stillExists ? selectedOrderId : data[0].orderId;
        setSelectedOrderId(nextId ?? null);
      } else {
        setSelectedOrderId(null);
        setSelectedOrder(null);
        setSelectedDiscount(null);
        setManualDiscountSelection(false);
        setUserRemovedDiscount(false);
        setAvailableDiscounts([]);
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || "Không tải được hóa đơn nháp",
      );
    }
  };

  const loadOrderDetail = async (orderId: number) => {
    try {
      setLoadingOrder(true);
      const data = await posService.getOrderDetail(orderId);

      setSelectedOrder(data);
      setCheckoutData((prev) => ({
        ...prev,
        customerPaid: data.finalAmount ?? 0,
        note: data.note || "",
      }));

      await loadAvailableDiscounts(orderId, data);
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || "Không tải được chi tiết hóa đơn",
      );
    } finally {
      setLoadingOrder(false);
    }
  };

  const loadAvailableDiscounts = async (
    orderId: number,
    orderSnapshot: PosOrderResponse | null = selectedOrder,
  ) => {
    if (!orderSnapshot?.customerId) {
      setAvailableDiscounts([]);
      setSelectedDiscount(null);
      setManualDiscountSelection(false);
      setUserRemovedDiscount(false);
      return;
    }

    try {
      setLoadingDiscounts(true);
      const data = await posService.getAvailableDiscounts(orderId);
      const coupons = (data || []).filter((item) => item.voucherType === "COUPON");

      setAvailableDiscounts(coupons);

      if (selectedDiscount) {
        const stillExists = coupons.find(
          (item) =>
            item.voucherType === selectedDiscount.voucherType &&
            item.id === selectedDiscount.id,
        );

        if (!stillExists) {
          setSelectedDiscount(null);
          setManualDiscountSelection(false);
        } else {
          setSelectedDiscount(stillExists);
        }
      }
    } catch (error: any) {
      setAvailableDiscounts([]);
      setSelectedDiscount(null);
      setManualDiscountSelection(false);
      message.error(
        error?.response?.data?.message || "Không tải được danh sách mã giảm giá",
      );
    } finally {
      setLoadingDiscounts(false);
    }
  };

  useEffect(() => {
    loadDraftOrders();
    handleSearchProducts();
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      if (lastOrderIdRef.current !== selectedOrderId) {
        setManualDiscountSelection(false);
        setUserRemovedDiscount(false);
        lastOrderIdRef.current = selectedOrderId;
      }
      loadOrderDetail(selectedOrderId);
    }
  }, [selectedOrderId]);

  const handleCreateOrder = async () => {
    if (draftOrders.length >= MAX_DRAFT_POS_ORDERS) {
      message.warning(
        `Chỉ được tạo tối đa ${MAX_DRAFT_POS_ORDERS} hóa đơn nháp. Vui lòng thanh toán hoặc hủy bớt hóa đơn trước khi tạo mới.`,
      );
      return;
    }

    try {
      setCreating(true);

      const data = await posService.createOrder({
        customerId: null,
        storeId: DEFAULT_STORE_ID,
        note: "Khách mua tại quầy",
      });

      message.success("Tạo hóa đơn nháp thành công");
      await loadDraftOrders();
      setSelectedOrderId(data.orderId);
      setSelectedOrder(data);
      setSelectedDiscount(null);
      setManualDiscountSelection(false);
      setUserRemovedDiscount(false);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Không tạo được hóa đơn");
    } finally {
      setCreating(false);
    }
  };

  const handleSearchProducts = async () => {
    try {
      setSearching(true);
      const data = await posService.searchProducts(keyword);
      setProducts(data);
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || "Không tìm được sản phẩm",
      );
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = async (product: PosProductSearchResponse) => {
    if (!selectedOrderId) {
      message.warning("Hãy tạo hoặc chọn hóa đơn trước");
      return;
    }

    if (!isPosProductInStock(product)) {
      message.warning("Sản phẩm đang hết hàng");
      return;
    }

    try {
      const data = await posService.addItem(selectedOrderId, {
        productVariantId: product.productVariantId,
        quantity: 1,
      });

      setSelectedOrder(data);
      await loadDraftOrders();
      await loadAvailableDiscounts(selectedOrderId, data);
      await handleSearchProducts();
      message.success("Đã thêm sản phẩm vào hóa đơn");
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Thêm sản phẩm thất bại");
    }
  };

  const handleUpdateQuantity = async (
    item: PosOrderItemResponse,
    quantity: number | null,
  ) => {
    if (!selectedOrderId || !quantity || quantity < 1) {
      return;
    }

    try {
      const data = await posService.updateItem(selectedOrderId, item.itemId, {
        quantity,
      });

      setSelectedOrder(data);
      await loadDraftOrders();
      await loadAvailableDiscounts(selectedOrderId, data);
      await handleSearchProducts();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || "Cập nhật số lượng thất bại",
      );
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!selectedOrderId) {
      return;
    }

    try {
      const data = await posService.removeItem(selectedOrderId, itemId);

      setSelectedOrder(data);
      await loadDraftOrders();
      await loadAvailableDiscounts(selectedOrderId, data);
      await handleSearchProducts();
      message.success("Đã xóa sản phẩm");
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const resetQuickCustomerForm = () => {
    setQuickCustomerData({
      fullName: "",
      phone: "",
      address: "",
    });
  };

  const handleOpenQuickCustomerModal = () => {
    resetQuickCustomerForm();
    setQuickCustomerOpen(true);
  };

  const handleQuickCreateCustomer = async () => {
    if (!selectedOrderId) {
      message.warning("Chưa chọn hóa đơn");
      return;
    }

    const fullName = normalizeTextInput(quickCustomerData.fullName);
    const phone = normalizeTextInput(quickCustomerData.phone).replace(/\s+/g, "");
    const address = normalizeTextInput(quickCustomerData.address);

    if (!fullName) {
      message.warning("Vui lòng nhập họ tên.");
      return;
    }

    if (!isValidPersonName(fullName)) {
      message.warning(
        fullName.length < 2
          ? "Họ tên phải có ít nhất 2 ký tự."
          : "Họ tên không hợp lệ.",
      );
      return;
    }

    if (!phone || !VIETNAM_PHONE_REGEX.test(phone)) {
      message.warning(phone ? "Số điện thoại không hợp lệ." : "Vui lòng nhập số điện thoại.");
      return;
    }

    if (!isValidOptionalAddress(address)) {
      message.warning(
        address.length < 5
          ? "Địa chỉ chi tiết phải có ít nhất 5 ký tự."
          : "Địa chỉ chi tiết không hợp lệ.",
      );
      return;
    }

    try {
      setCreatingCustomer(true);

      const data = await posService.quickCreateCustomerAndAssign(
        selectedOrderId,
        {
          fullName,
          phone,
          address,
        },
      );

      setSelectedOrder(data);
      setQuickCustomerOpen(false);
      resetQuickCustomerForm();
      setSelectedDiscount(null);
      setManualDiscountSelection(false);
      setUserRemovedDiscount(false);

      await loadDraftOrders();
      await loadAvailableDiscounts(selectedOrderId, data);

      message.success("Đã tạo và gắn khách hàng vào hóa đơn");
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || "Tạo khách hàng thất bại",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleClearCustomer = async () => {
    if (!selectedOrderId) {
      return;
    }

    try {
      const data = await posService.assignCustomer(selectedOrderId, {
        customerId: null,
      });

      setSelectedOrder(data);
      setSelectedDiscount(null);
      setManualDiscountSelection(false);
      setUserRemovedDiscount(false);

      await loadDraftOrders();
      await loadAvailableDiscounts(selectedOrderId, data);

      message.success("Đã bỏ khách khỏi hóa đơn");
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Bỏ khách thất bại");
    }
  };

  const handleSelectDiscount = (discount: PosAvailableDiscountResponse) => {
    setManualDiscountSelection(true);
    setUserRemovedDiscount(false);
    setSelectedDiscount(discount);
    setCheckoutData((prev) => ({
      ...prev,
      customerPaid: Math.max(
        (selectedOrder?.totalAmount ?? 0) -
        (discount.estimatedDiscountAmount ?? 0),
        0,
      ),
    }));

    setVoucherPickerOpen(false);
    message.success(`Đã chọn mã giảm giá ${discount.code}`);
  };

  const handleApplyVoucherOption = (voucher: VoucherOption) => {
    if (!voucher.raw) {
      return;
    }
    if (!voucher.eligible) {
      message.error(voucher.ineligibleReason || "Mã giảm giá không đủ điều kiện áp dụng.");
      return;
    }
    handleSelectDiscount({
      ...(voucher.raw as PosAvailableDiscountResponse),
      estimatedDiscountAmount: voucher.estimatedDiscountAmount,
    });
  };

  const handleClearDiscount = () => {
    setManualDiscountSelection(false);
    setUserRemovedDiscount(true);
    setSelectedDiscount(null);
    setCheckoutData((prev) => ({
      ...prev,
      customerPaid: selectedOrder?.totalAmount ?? 0,
    }));

    message.success("Đã bỏ áp dụng mã giảm giá");
  };

  const loadPaymentMethods = async () => {
    try {
      const data = await paymentMethodService.getAll();
      setPaymentMethods(data);
      const cashMethod = data.find(
        (m) => m.code === "CASH" && m.isActive && POS_PAYMENT_CODES.includes(m.code),
      );
      if (cashMethod) {
        setCheckoutData((prev) => ({ ...prev, paymentMethodId: cashMethod.id }));
      }
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          "Không tải được phương thức thanh toán",
      );
    }
  };

  const handleCheckout = async () => {
    if (!selectedOrderId) {
      message.warning("Chưa chọn hóa đơn");
      return;
    }

    if (!checkoutData.paymentMethodId) {
      message.warning("Chưa chọn phương thức thanh toán");
      return;
    }

    const couponId =
      selectedDiscount?.voucherType === "COUPON"
        ? selectedDiscount?.id ?? null
        : null;

    const payload = {
      paymentMethodId: checkoutData.paymentMethodId,
      customerPaid: isCashPayment ? checkoutData.customerPaid : 0,
      couponId,
      note: checkoutData.note,
      isVnpay: isVnpayPayment,
    };

    try {
      setValidating(true);
      const result = await posService.validateCheckout(selectedOrderId, couponId);
      setValidationResult(result);
      setPendingCheckoutPayload(payload);

      const estimatedDiscount = selectedDiscount?.estimatedDiscountAmount ?? 0;
      const couponDiscountChanged =
        couponId !== null && result.couponDiscount !== estimatedDiscount;

      if (!result.valid || result.hasChanges || result.issues.length > 0 || couponDiscountChanged) {
        setValidationModalOpen(true);
        return;
      }

      await executeCheckout(payload);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Không thể kiểm tra hóa đơn");
    } finally {
      setValidating(false);
    }
  };

  const executeCheckout = async (payload: {
    paymentMethodId: number;
    customerPaid: number;
    couponId?: number | null;
    note?: string;
    isVnpay: boolean;
  }) => {
    const checkoutPayload = {
      paymentMethodId: payload.paymentMethodId,
      customerPaid: payload.customerPaid,
      couponId: payload.couponId,
      note: payload.note,
    };

    try {
      if (payload.isVnpay) {
        const vnpay = await posService.createVnpayPayment(
          selectedOrderId!,
          checkoutPayload,
        );
        window.location.href = vnpay.paymentUrl;
        return;
      }

      const data = await posService.checkout(selectedOrderId!, checkoutPayload);

      message.success("Thanh toán tiền mặt thành công");
      setCheckoutOpen(false);
      setValidationModalOpen(false);
      setSelectedDiscount(null);
      setAvailableDiscounts([]);
      setSelectedOrder(data);

      await loadDraftOrders();
      await handleSearchProducts();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Thanh toán thất bại");
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrderId) {
      return;
    }

    try {
      await posService.cancelOrder(selectedOrderId);
      message.success("Hủy hóa đơn thành công");
      await loadDraftOrders();
      await handleSearchProducts();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Hủy hóa đơn thất bại");
    }
  };

  const orderColumns = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (_: any, record: PosOrderItemResponse) => (
        <Space align="start">
          <img
            src={resolveImageUrl(record.imageUrl)}
            alt={record.productName}
            onError={handleImageError}
            style={{
              width: 56,
              height: 56,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid #f0f0f0",
            }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>{record.productName}</div>

            <div style={{ fontSize: 12, color: "#595959", marginTop: 2 }}>
              {buildVariantText(
                record.color,
                record.size,
                record.material,
                record.variantCode,
                record.barcode,
              )}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "price",
      key: "price",
      width: 130,
      render: (value: number) => `${currency(value)} đ`,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (_: any, record: PosOrderItemResponse) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => handleUpdateQuantity(record, value)}
        />
      ),
    },
    {
      title: "Tồn",
      dataIndex: "stockQuantity",
      key: "stockQuantity",
      width: 80,
      render: (value: number) => (
        <span style={getStockTextStyle(value)}>{value}</span>
      ),
    },
    {
      title: "Thành tiền",
      dataIndex: "lineTotal",
      key: "lineTotal",
      width: 150,
      render: (value: number) => `${currency(value)} đ`,
    },
    {
      title: "",
      key: "action",
      width: 70,
      render: (_: any, record: PosOrderItemResponse) => (
        <Popconfirm
          title="Xóa sản phẩm này?"
          onConfirm={() => handleRemoveItem(record.itemId)}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const productColumns = [
    {
      title: "Ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      render: (value: string) => (
        <img
          src={resolveImageUrl(value)}
          alt="sp"
          onError={handleImageError}
          style={{
            width: 56,
            height: 56,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #f0f0f0",
          }}
        />
      ),
    },
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (_: any, record: PosProductSearchResponse) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.productName}</div>

          <div style={{ fontSize: 12, color: "#595959", marginTop: 2 }}>
            {buildVariantText(
              record.color,
              record.size,
              record.material,
              record.variantCode,
              record.barcode,
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Tồn",
      dataIndex: "stockQuantity",
      key: "stockQuantity",
      width: 80,
      render: (value: number) => (
        <Space direction="vertical" size={2}>
          <span style={getStockTextStyle(value)}>{value}</span>
          {(value ?? 0) <= 0 && <Tag color="red">Hết hàng</Tag>}
        </Space>
      ),
    },
    {
      title: "Giá",
      dataIndex: "sellingPrice",
      key: "sellingPrice",
      width: 170,
      render: (_: number, record: PosProductSearchResponse) =>
        renderPosProductPrice(record),
    },
    {
      title: "",
      key: "action",
      width: 110,
      render: (_: any, record: PosProductSearchResponse) => (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAddProduct(record)}
          disabled={!isPosProductInStock(record)}
        >
          {!isPosProductInStock(record)
            ? "Hết hàng"
            : "Thêm"}
        </Button>
      ),
    },
  ];

  const voucherOptions = useMemo(
    () =>
      buildVoucherOptions(
        availableDiscounts.map((discount) => ({
          ...discount,
          remainingUses:
            discount.remainingUses ?? discount.remainingCount ?? null,
        })),
        selectedOrder?.totalAmount || 0,
      ),
    [availableDiscounts, selectedOrder?.totalAmount],
  );

  const canUseDiscount = Boolean(selectedOrder?.customerId);

  useEffect(() => {
    const hasItems = Boolean(selectedOrder?.items?.length);
    const subtotal = selectedOrder?.totalAmount ?? 0;

    if (!hasItems) {
      if (selectedDiscount) {
        setSelectedDiscount(null);
      }
      setManualDiscountSelection(false);
      setUserRemovedDiscount(false);
      setCheckoutData((prev) => ({
        ...prev,
        customerPaid: 0,
      }));
      return;
    }

    const current = selectedDiscount
      ? voucherOptions.find((voucher) => voucher.id === selectedDiscount.id)
      : null;

    if (selectedDiscount) {
      if (current?.eligible && current.raw) {
        if (
          selectedDiscount.estimatedDiscountAmount !== current.estimatedDiscountAmount
        ) {
          setSelectedDiscount({
            ...(current.raw as PosAvailableDiscountResponse),
            estimatedDiscountAmount: current.estimatedDiscountAmount,
          });
          setCheckoutData((prev) => ({
            ...prev,
            customerPaid: Math.max(subtotal - current.estimatedDiscountAmount, 0),
          }));
        }

        if (manualDiscountSelection || userRemovedDiscount) {
          return;
        }
      } else {
        setSelectedDiscount(null);
        setCheckoutData((prev) => ({
          ...prev,
          customerPaid: subtotal,
        }));

        if (manualDiscountSelection) {
          message.warning("Mã giảm giá hiện tại không còn đủ điều kiện.");
          return;
        }
      }
    }

    if (manualDiscountSelection || userRemovedDiscount) {
      return;
    }

    const best = getBestVoucher(voucherOptions);
    if (!best?.raw) {
      if (selectedDiscount) {
        setSelectedDiscount(null);
      }
      return;
    }

    if (
      selectedDiscount?.id !== best.id ||
      selectedDiscount?.estimatedDiscountAmount !== best.estimatedDiscountAmount
    ) {
      setSelectedDiscount({
        ...(best.raw as PosAvailableDiscountResponse),
        estimatedDiscountAmount: best.estimatedDiscountAmount,
      });
      setCheckoutData((prev) => ({
        ...prev,
        customerPaid: Math.max(
          (selectedOrder?.totalAmount ?? 0) - best.estimatedDiscountAmount,
          0,
        ),
      }));
    }
  }, [
    selectedOrder?.items?.length,
    selectedOrder?.totalAmount,
    selectedDiscount,
    manualDiscountSelection,
    userRemovedDiscount,
    voucherOptions,
  ]);

  const summary = useMemo(() => {
    const total = selectedOrder?.totalAmount || 0;
    const discount = selectedDiscount?.estimatedDiscountAmount || 0;
    const final = Math.max(total - discount, 0);

    return {
      total,
      discount,
      final,
    };
  }, [selectedOrder, selectedDiscount]);

  const paymentOptions = useMemo(
    () =>
      paymentMethods
        .filter(
          (item) => item.isActive && POS_PAYMENT_CODES.includes(item.code),
        )
        .map((item) => ({
          label: item.name,
          value: item.id,
        })),
    [paymentMethods],
  );

  const selectedPaymentMethod = useMemo(
    () =>
      paymentMethods.find((item) => item.id === checkoutData.paymentMethodId) ??
      null,
    [paymentMethods, checkoutData.paymentMethodId],
  );

  const isCashPayment = selectedPaymentMethod?.code === "CASH";
  const isVnpayPayment = selectedPaymentMethod?.code === "VNPAY";

  const selectedItemCount = useMemo(
    () =>
      (selectedOrder?.items || []).reduce(
        (total, item) => total + (item.quantity || 0),
        0,
      ),
    [selectedOrder],
  );
  //
  return (
    <div
      style={{
        padding: 20,
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card style={{ ...panelCardStyle, borderRadius: 20 }}>
          <Row gutter={[16, 16]} justify="space-between" align="middle">
            <Col>
              <Space direction="vertical" size={4}>
                <Title level={3} style={{ margin: 0 }}>
                  Bán hàng tại quầy (POS)
                </Title>
                <Text type="secondary">
                
                  
                </Text>
              </Space>
            </Col>

            <Col>
              <Space wrap>
                <Tag
                  color={
                    draftOrders.length >= MAX_DRAFT_POS_ORDERS ? "red" : "blue"
                  }
                >
                  Hóa đơn nháp: {draftOrders.length}/{MAX_DRAFT_POS_ORDERS}
                </Tag>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={creating}
                  onClick={handleCreateOrder}
                >
                  Tạo hóa đơn
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]} align="top">
          <Col xs={24} xl={6}>
            <Card
              title="Danh sách hóa đơn nháp"
              style={{ ...panelCardStyle, height: "100%" }}
            >
              {draftOrders.length === 0 ? (
                <Empty description="Chưa có hóa đơn nháp" />
              ) : (
                <List
                  dataSource={draftOrders}
                  renderItem={(item) => {
                    const active = selectedOrderId === item.orderId;

                    return (
                      <List.Item
                        onClick={() => setSelectedOrderId(item.orderId)}
                        style={getDraftOrderStyle(active)}
                      >
                        <div style={{ width: "100%" }}>
                          <Row justify="space-between" align="middle">
                            <Text strong>{item.orderCode}</Text>
                            <Tag color={active ? "processing" : "default"}>
                              {item.status}
                            </Tag>
                          </Row>

                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary">
                              Khách: {item.customerName || "Khách lẻ"}
                            </Text>
                          </div>

                          <div style={{ marginTop: 4 }}>
                            <Text strong style={{ color: "#cf1322" }}>
                              {currency(item.finalAmount)} đ
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </Col>

          <Col xs={24} xl={18}>
            <Card
              loading={loadingOrder}
              style={panelCardStyle}
              title={
                <Space>
                  <ShoppingCartOutlined />
                  <span>Hóa đơn đang chọn</span>
                </Space>
              }
            >
              {!selectedOrder ? (
                <Empty description="Chưa chọn hóa đơn" />
              ) : (
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} lg={6}>
                      <div style={summaryBoxStyle}>
                        <span style={infoLabelStyle}>Mã hóa đơn</span>
                        <div style={infoValueStyle}>
                          {selectedOrder.orderCode}
                        </div>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                      <div style={summaryBoxStyle}>
                        <span style={infoLabelStyle}>Khách hàng</span>
                        <div style={{ ...infoValueStyle, fontSize: 16 }}>
                          {selectedOrder.customerName || "Khách lẻ"}
                        </div>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                      <div style={summaryBoxStyle}>
                        <span style={infoLabelStyle}>Tổng số món</span>
                        <div style={infoValueStyle}>{selectedItemCount}</div>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                      <div style={summaryBoxStyle}>
                        <span style={infoLabelStyle}>Cần thanh toán</span>
                        <div
                          style={{
                            ...infoValueStyle,
                            color: "#cf1322",
                          }}
                        >
                          {currency(summary.final)} đ
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <Card size="small" style={softPanelStyle}>
                    <Row
                      gutter={[12, 12]}
                      justify="space-between"
                      align="middle"
                    >
                      <Col xs={24} lg={14}>
                        <Space direction="vertical" size={4}>
                          <Text strong>Thông tin khách hàng</Text>
                          <Text>
                            {selectedOrder.customerName || "Khách lẻ"}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Tạo nhanh khách bằng tên và số điện thoại, hệ thống
                            sẽ tự gắn vào hóa đơn.
                          </Text>
                        </Space>
                      </Col>

                      <Col xs={24} lg={10}>
                        <Space wrap>
                          <Button
                            type="primary"
                            onClick={handleOpenQuickCustomerModal}
                          >
                            + Khách mới
                          </Button>

                          <Button
                            danger
                            onClick={handleClearCustomer}
                            disabled={!selectedOrder.customerId}
                          >
                            Bỏ khách
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </Card>

                  <Card
                    size="small"
                    style={softPanelStyle}
                    title="Chi tiết sản phẩm trong hóa đơn"
                  >
                    <Table
                      rowKey="itemId"
                      columns={orderColumns}
                      dataSource={selectedOrder.items || []}
                      pagination={false}
                      scroll={{ x: 900, y: 320 }}
                      locale={{ emptyText: "Chưa có sản phẩm" }}
                    />
                  </Card>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} xl={15}>
                      <Card
                        size="small"
                        title={
                          <Space>
                            <GiftOutlined />
                            <span>Mã giảm giá</span>
                          </Space>
                        }
                        style={softPanelStyle}
                      >
                        <div
                          onClick={() => {
                            if (!canUseDiscount) {
                              message.info("Vui lòng chọn khách hàng để áp dụng mã giảm giá.");
                              return;
                            }
                            setVoucherPickerOpen(true);
                          }}
                          style={{
                            border: "1px dashed #ff7a45",
                            background: "#fff7e6",
                            borderRadius: 12,
                            padding: 14,
                            cursor: canUseDiscount ? "pointer" : "not-allowed",
                            opacity: canUseDiscount ? 1 : 0.72,
                          }}
                        >
                          <Row
                            justify="space-between"
                            align="middle"
                            gutter={[12, 12]}
                          >
                            <Col xs={24} md={16}>
                              <Space direction="vertical" size={4}>
                                <Space>
                                  <GiftOutlined style={{ color: "#fa541c" }} />
                                  <Text strong>
                                    {selectedDiscount
                                      ? selectedDiscount.code
                                      : "Chọn mã giảm giá"}
                                  </Text>
                                </Space>

                                {selectedDiscount ? (
                                  <>
                                    <Text type="secondary">
                                      {selectedDiscount.name}
                                    </Text>

                                    <Text strong style={{ color: "#cf1322" }}>
                                      Giảm{" "}
                                      {currency(
                                        selectedDiscount.estimatedDiscountAmount,
                                      )}{" "}
                                      đ
                                    </Text>
                                  </>
                                ) : (
                                  <Text type="secondary">
                                    {canUseDiscount
                                      ? "Bấm để xem danh sách mã giảm giá khả dụng cho hóa đơn này"
                                      : "Vui lòng chọn khách hàng để áp dụng mã giảm giá."}
                                  </Text>
                                )}
                              </Space>
                            </Col>

                            <Col xs={24} md={8} style={{ textAlign: "right" }}>
                              <Space>
                                {selectedDiscount && (
                                  <Button
                                    danger
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleClearDiscount();
                                    }}
                                  >
                                    Bỏ áp dụng
                                  </Button>
                                )}

                                <Button type="primary" disabled={!canUseDiscount}>
                                  {selectedDiscount
                                    ? "Đổi mã"
                                    : "Chọn mã giảm giá"}
                                </Button>
                              </Space>
                            </Col>
                          </Row>
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} xl={9}>
                      <Card
                        size="small"
                        title="Tổng thanh toán"
                        style={softPanelStyle}
                      >
                        <Space
                          direction="vertical"
                          style={{ width: "100%" }}
                          size={10}
                        >
                          <Row justify="space-between">
                            <Text>Tạm tính</Text>
                            <Text>{currency(summary.total)} đ</Text>
                          </Row>

                          <Row justify="space-between">
                            <Text>Giảm giá</Text>
                            <Text style={{ color: "#cf1322", fontWeight: 500 }}>
                              - {currency(summary.discount)} đ
                            </Text>
                          </Row>

                          {selectedDiscount?.code && (
                            <Row justify="space-between">
                              <Text>Mã giảm giá</Text>
                              <Text strong>{selectedDiscount.code}</Text>
                            </Row>
                          )}

                          <Row justify="space-between" align="middle">
                            <Title level={5} style={{ margin: 0 }}>
                              Cần thanh toán
                            </Title>
                            <Title
                              level={4}
                              style={{ margin: 0, color: "#cf1322" }}
                            >
                              {currency(summary.final)} đ
                            </Title>
                          </Row>

                          <Space
                            direction="vertical"
                            style={{ width: "100%", marginTop: 8 }}
                            size={10}
                          >
                            <Popconfirm
                              title="Bạn chắc chắn muốn hủy hóa đơn?"
                              onConfirm={handleCancelOrder}
                            >
                              <Button danger block>
                                Hủy hóa đơn
                              </Button>
                            </Popconfirm>

                            <Button
                              type="primary"
                              block
                              onClick={() => {
                                const cashMethod = paymentMethods.find(
                                  (item) => item.code === "CASH",
                                );

                                setCheckoutData((prev) => ({
                                  ...prev,
                                  paymentMethodId:
                                    prev.paymentMethodId ??
                                    cashMethod?.id ??
                                    paymentOptions[0]?.value ??
                                    null,
                                  customerPaid: summary.final,
                                  note: selectedOrder?.note || "",
                                }));

                                setCheckoutOpen(true);
                              }}
                              disabled={!selectedOrder.items?.length}
                            >
                              Thanh toán
                            </Button>
                          </Space>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Space>
              )}
            </Card>
          </Col>
        </Row>

        <Card
          title="Danh sách sản phẩm"
          extra={
            <Space wrap>
              <Input
                placeholder="Tìm theo tên, mã, barcode..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={handleSearchProducts}
                style={{ width: 280 }}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={searching}
                onClick={handleSearchProducts}
              >
                Tìm
              </Button>
            </Space>
          }
          style={panelCardStyle}
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Text type="secondary">
              Chọn sản phẩm bên dưới để thêm nhanh vào hóa đơn đang chọn.
            </Text>

            <Table
              rowKey="productVariantId"
              columns={productColumns}
              dataSource={products}
              loading={searching}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 900 }}
            />
          </Space>
        </Card>

        <VoucherSelectorModal
          open={voucherPickerOpen}
          onClose={() => setVoucherPickerOpen(false)}
          subtotal={summary.total}
          finalTotal={summary.final}
          vouchers={voucherOptions}
          selectedCouponId={selectedDiscount?.id ?? null}
          loading={loadingDiscounts}
          onApply={handleApplyVoucherOption}
          onRemove={selectedDiscount ? handleClearDiscount : undefined}
        />

        <Modal
          title="Thêm khách hàng mới"
          open={quickCustomerOpen}
          onCancel={() => {
            setQuickCustomerOpen(false);
            resetQuickCustomerForm();
          }}
          onOk={handleQuickCreateCustomer}
          okText="Lưu và gắn vào hóa đơn"
          confirmLoading={creatingCustomer}
        >
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <div>
              <Text strong>Họ và tên</Text>
              <Input
                style={{ marginTop: 6 }}
                placeholder="Nhập tên khách hàng"
                value={quickCustomerData.fullName}
                onChange={(e) =>
                  setQuickCustomerData((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Text strong>Số điện thoại</Text>
              <Input
                style={{ marginTop: 6 }}
                placeholder="Nhập số điện thoại"
                value={quickCustomerData.phone}
                onChange={(e) =>
                  setQuickCustomerData((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Text strong>Địa chỉ</Text>
              <Input.TextArea
                rows={3}
                style={{ marginTop: 6 }}
                placeholder="Nhập địa chỉ (không bắt buộc)"
                value={quickCustomerData.address}
                onChange={(e) =>
                  setQuickCustomerData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </div>
          </Space>
        </Modal>

        <Modal
          title="Thanh toán hóa đơn"
          open={checkoutOpen}
          onCancel={() => setCheckoutOpen(false)}
          onOk={handleCheckout}
          okText="Kiểm tra & Thanh toán"
          confirmLoading={validating || confirmingCheckout}
        >
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <div>
              <Text strong>Tạm tính:</Text> {currency(summary.total)} đ
            </div>

            <div>
              <Text strong>Giảm giá áp dụng:</Text> {currency(summary.discount)}{" "}
              đ
            </div>

            {selectedDiscount?.code && (
              <div>
                <Text strong>Mã giảm giá đã chọn:</Text> {selectedDiscount.code}
              </div>
            )}

            <div>
              <Text strong>Cần thanh toán:</Text> {currency(summary.final)} đ
            </div>

            <div>
              <Text strong>Phương thức thanh toán</Text>
              <Select
                style={{ width: "100%", marginTop: 6 }}
                placeholder="Chọn phương thức thanh toán"
                options={paymentOptions}
                value={checkoutData.paymentMethodId || undefined}
                onChange={(value) =>
                  setCheckoutData((prev) => ({
                    ...prev,
                    paymentMethodId: value,
                  }))
                }
              />
            </div>

            {isCashPayment && (
              <>
                <div>
                  <Text strong>Tiền khách đưa</Text>
                  <InputNumber
                    style={{ width: "100%", marginTop: 6 }}
                    min={0}
                    value={checkoutData.customerPaid}
                    onChange={(value) =>
                      setCheckoutData((prev) => ({
                        ...prev,
                        customerPaid: Number(value || 0),
                      }))
                    }
                  />
                </div>

                <div>
                  <Text strong>Tiền thừa:</Text>{" "}
                  {currency(
                    Math.max(
                      (checkoutData.customerPaid || 0) - summary.final,
                      0,
                    ),
                  )}{" "}
                  đ
                </div>
              </>
            )}

            {isVnpayPayment && (
              <div>
                <Text type="secondary">
                  Khi bấm xác nhận, hệ thống sẽ tạo đúng link thanh toán VNPAY
                  theo số tiền sau giảm giá hiện tại.
                </Text>
              </div>
            )}

            <div>
              <Text strong>Ghi chú</Text>
              <Input.TextArea
                rows={3}
                value={checkoutData.note}
                onChange={(e) =>
                  setCheckoutData((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
              />
            </div>
          </Space>
        </Modal>

        <Modal
          title="Kiểm tra hóa đơn trước thanh toán"
          open={validationModalOpen}
          onCancel={() => {
            setValidationModalOpen(false);
            setPendingCheckoutPayload(null);
            setValidationResult(null);
          }}
          footer={
            validationResult?.valid
              ? [
                  <Button
                    key="cancel"
                    disabled={confirmingCheckout}
                    onClick={() => {
                      setValidationModalOpen(false);
                      setPendingCheckoutPayload(null);
                      setValidationResult(null);
                    }}
                  >
                    Đóng
                  </Button>,
                  <Button
                    key="confirm"
                    type="primary"
                    loading={confirmingCheckout}
                    disabled={confirmingCheckout}
                    onClick={async () => {
                      if (!pendingCheckoutPayload || !validationResult || confirmingCheckout) return;
                      const newFinal = validationResult.finalTotal;
                      const newCustomerPaid = pendingCheckoutPayload.isVnpay ? 0 : newFinal;
                      if (!pendingCheckoutPayload.isVnpay) {
                        setCheckoutData((prev) => ({ ...prev, customerPaid: newFinal }));
                      }
                      const updatedPayload = { ...pendingCheckoutPayload, customerPaid: newCustomerPaid };
                      setValidationModalOpen(false);
                      setConfirmingCheckout(true);
                      try {
                        await executeCheckout(updatedPayload);
                      } finally {
                        setConfirmingCheckout(false);
                        setPendingCheckoutPayload(null);
                        setValidationResult(null);
                      }
                    }}
                  >
                    Xác nhận & Thanh toán
                  </Button>,
                ]
              : [
                  <Button
                    key="close"
                    onClick={() => {
                      setValidationModalOpen(false);
                      setPendingCheckoutPayload(null);
                      setValidationResult(null);
                    }}
                  >
                    Đóng
                  </Button>,
                ]
          }
        >
          {validationResult && (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Text>{validationResult.message}</Text>
              {validationResult.issues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: issue.severity === "BLOCKING" ? "#fff1f0" : "#fffbe6",
                    border: `1px solid ${issue.severity === "BLOCKING" ? "#ffa39e" : "#ffe58f"}`,
                  }}
                >
                  <Tag color={issue.severity === "BLOCKING" ? "red" : "warning"}>
                    {issue.severity === "BLOCKING" ? "Chặn thanh toán" : "Cần xác nhận"}
                  </Tag>
                  <Text>{issue.message}</Text>
                  {issue.oldPrice != null && issue.newPrice != null && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Giá cũ: {currency(issue.oldPrice)} đ → Giá mới:{" "}
                        <Text strong style={{ color: "#cf1322", fontSize: 12 }}>
                          {currency(issue.newPrice)} đ
                        </Text>
                      </Text>
                    </div>
                  )}
                </div>
              ))}
              {validationResult.valid && (
                <div style={{ marginTop: 8, borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                  <div>
                    <Text strong>Tổng tiền hàng: </Text>
                    <Text>{currency(validationResult.newSubtotal)} đ</Text>
                  </div>
                  {validationResult.couponDiscount > 0 && (
                    <div>
                      <Text strong>Giảm giá: </Text>
                      <Text type="danger">-{currency(validationResult.couponDiscount)} đ</Text>
                    </div>
                  )}
                  <div>
                    <Text strong>Cần thanh toán: </Text>
                    <Text strong style={{ color: "#1677ff" }}>
                      {currency(validationResult.finalTotal)} đ
                    </Text>
                  </div>
                </div>
              )}
            </Space>
          )}
        </Modal>
      </Space>
    </div>
  );
};

export default PosManagement;
