import { message } from "antd";
import {
  formatKnownVariantAttributes,
  normalizeProductAttributeText,
} from "@/utils/productAttributeLabel";

type MoneyValue = number | string | null | undefined;

export interface InvoiceOrderItem {
  productName?: string | null;
  variantInfo?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  price?: MoneyValue;
  unitPrice?: MoneyValue;
  salePrice?: MoneyValue;
  priceAfterDiscount?: MoneyValue;
  discountedPrice?: MoneyValue;
  quantity?: number | string | null;
  amount?: MoneyValue;
  subtotal?: MoneyValue;
  totalPrice?: MoneyValue;
  lineTotal?: MoneyValue;
}

export interface InvoiceOrderDetail {
  id?: number;
  code?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  phone?: string | null;
  address?: string | null;
  fullAddress?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  orderType?: string | null;
  employeeName?: string | null;
  paymentMethodName?: string | null;
  paymentStatus?: string | null;
  subtotalAmount?: MoneyValue;
  originalSubtotal?: MoneyValue;
  productDiscountTotal?: MoneyValue;
  totalAmount?: MoneyValue;
  finalTotal?: MoneyValue;
  shippingFee?: MoneyValue;
  voucherCode?: string | null;
  couponCode?: string | null;
  discountCode?: string | null;
  voucherDiscountAmount?: MoneyValue;
  couponDiscountAmount?: MoneyValue;
  discountAmount?: MoneyValue;
  items?: InvoiceOrderItem[];
}

const SHOP_INFO = {
  name: "S-SHOP",
  phone: "0838080268",
  address: "3 Tô Hiệu, Chiềng Lề, Sơn La",
};

const formatCurrency = (value?: MoneyValue) => {
  const number = Number(value || 0);
  return `${new Intl.NumberFormat("vi-VN").format(number)} đ`;
};

const normalizePositiveMoney = (value: unknown) => {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue) || Math.abs(numericValue) < 1) {
    return 0;
  }

  return Math.abs(numericValue);
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const padNumber = (value: number) => String(value).padStart(2, "0");

const formatPrintTime = (date = new Date()) =>
  `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(
    date.getSeconds(),
  )} ${padNumber(date.getDate())}/${padNumber(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;

const formatOrderCode = (code?: string | null) => {
  const normalizedCode = String(code || "").trim();

  if (!normalizedCode) {
    return "N/A";
  }

  return normalizedCode.startsWith("#") ? normalizedCode : `#${normalizedCode}`;
};

const formatOrderType = (type?: string | null) => {
  const normalized = String(type || "").trim().toUpperCase();

  if (["POS", "OFFLINE", "COUNTER", "IN_STORE", "AT_COUNTER"].includes(normalized)) {
    return "Tại quầy";
  }

  return "Online";
};

const formatPaymentStatus = (status?: string | null) => {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "PAID") return "Đã thanh toán";
  if (normalized === "UNPAID") return "Chưa thanh toán";
  if (normalized === "PENDING") return "Chờ thanh toán";
  if (normalized === "FAILED") return "Thanh toán thất bại";
  if (normalized === "REFUNDED") return "Đã hoàn tiền";

  return "N/A";
};

const getCustomerName = (order: InvoiceOrderDetail) =>
  order.customerName ||
  (formatOrderType(order.orderType) === "Tại quầy" ? "Khách lẻ" : "N/A");

const getCustomerAddress = (order: InvoiceOrderDetail) => {
  if (formatOrderType(order.orderType) === "Tại quầy") {
    return "Tại quầy";
  }

  return (
    order.fullAddress ||
    [order.address, order.ward, order.district, order.province]
      .filter(Boolean)
      .join(", ") ||
    "N/A"
  );
};

const getCashierName = (order: InvoiceOrderDetail) =>
  order.employeeName || "Admin";

const getQuantity = (item: InvoiceOrderItem) => {
  const quantity = Number(item.quantity ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const getUnitPrice = (item: InvoiceOrderItem) =>
  Number(
    item.priceAfterDiscount ??
      item.discountedPrice ??
      item.salePrice ??
      item.unitPrice ??
      item.price ??
      0,
  ) || 0;

const getLineTotal = (item: InvoiceOrderItem) => {
  const lineTotal = Number(
    item.totalPrice ?? item.lineTotal ?? item.amount ?? item.subtotal,
  );

  if (Number.isFinite(lineTotal) && lineTotal > 0) {
    return lineTotal;
  }

  return getUnitPrice(item) * getQuantity(item);
};

const getVariantText = (item: InvoiceOrderItem) => {
  const variantText = formatKnownVariantAttributes({
    color: item.color,
    size: item.size,
    material: item.material,
  });

  return variantText || normalizeProductAttributeText(item.variantInfo);
};

const buildItemRows = (items: InvoiceOrderItem[] = []) => {
  if (!items.length) {
    return '<div class="item-row"><div class="item-name">Sản phẩm</div><div class="qty">0</div><div class="money">0 đ</div></div>';
  }

  return items
    .map((item) => {
      const variantText = getVariantText(item);

      return `
        <div class="item-row">
          <div class="item-name">${escapeHtml(item.productName || "Sản phẩm")}</div>
          <div class="qty">${escapeHtml(getQuantity(item))}</div>
          <div class="money">${formatCurrency(getLineTotal(item))}</div>
          ${
            variantText
              ? `<div class="item-variant">${escapeHtml(variantText)}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
};

const buildDiscountLine = (order: InvoiceOrderDetail) => {
  const productDiscount = normalizePositiveMoney(order.productDiscountTotal);
  const rawVoucherCode =
    order.voucherCode ?? order.couponCode ?? order.discountCode ?? "";
  const voucherCode = String(rawVoucherCode).trim();
  const voucherDiscount = normalizePositiveMoney(
    order.voucherDiscountAmount ??
      order.couponDiscountAmount ??
      order.discountAmount ??
      0,
  );
  const lines: string[] = [];

  if (productDiscount > 0) {
    lines.push(`
      <div class="total-row">
        <span>Giảm sản phẩm:</span>
        <span>- ${formatCurrency(productDiscount)}</span>
      </div>
    `);
  }

  if (voucherDiscount > 0) {
    const label = voucherCode
      ? `Giảm giá (${escapeHtml(voucherCode)}):`
      : "Giảm giá:";

    lines.push(`
      <div class="total-row">
        <span>${label}</span>
        <span>- ${formatCurrency(voucherDiscount)}</span>
      </div>
    `);
  }

  return lines.join("");
};

const replaceAllPlaceholders = (
  template: string,
  values: Record<string, string>,
) =>
  Object.entries(values).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );

export const printThermalInvoice = async (
  orderDetailOrPromise: InvoiceOrderDetail | Promise<InvoiceOrderDetail>,
) => {
  const printWindow = window.open("", "_blank", "width=420,height=700");

  if (!printWindow) {
    message.error("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup.");
    return;
  }

  const [orderDetail, template] = await Promise.all([
    Promise.resolve(orderDetailOrPromise),
    fetch("/templates/invoice-template.html").then((res) => {
      if (!res.ok) {
        throw new Error("Cannot load invoice template");
      }

      return res.text();
    }),
  ]).catch((error) => {
    printWindow.close();
    throw error;
  });

  const subtotal = orderDetail.originalSubtotal ?? orderDetail.subtotalAmount ?? 0;
  const totalAmount = orderDetail.finalTotal ?? orderDetail.totalAmount ?? 0;

  const html = replaceAllPlaceholders(template, {
    SHOP_NAME: escapeHtml(SHOP_INFO.name),
    SHOP_PHONE: escapeHtml(SHOP_INFO.phone),
    SHOP_ADDRESS: escapeHtml(SHOP_INFO.address),
    ORDER_CODE: escapeHtml(formatOrderCode(orderDetail.code)),
    PRINT_TIME: escapeHtml(formatPrintTime()),
    CASHIER_NAME: escapeHtml(getCashierName(orderDetail)),
    CUSTOMER_NAME: escapeHtml(getCustomerName(orderDetail)),
    CUSTOMER_PHONE: escapeHtml(orderDetail.phone || "N/A"),
    CUSTOMER_ADDRESS: escapeHtml(getCustomerAddress(orderDetail)),
    ORDER_TYPE: escapeHtml(formatOrderType(orderDetail.orderType)),
    PAYMENT_METHOD: escapeHtml(orderDetail.paymentMethodName || "N/A"),
    PAYMENT_STATUS: escapeHtml(formatPaymentStatus(orderDetail.paymentStatus)),
    ITEM_ROWS: buildItemRows(orderDetail.items || []),
    SUBTOTAL: formatCurrency(subtotal),
    DISCOUNT_LINE: buildDiscountLine(orderDetail),
    SHIPPING_FEE: formatCurrency(orderDetail.shippingFee),
    TOTAL_AMOUNT: formatCurrency(totalAmount),
  });

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
};

export const printInvoice = printThermalInvoice;
