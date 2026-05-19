import { Button, Col, Empty, Modal, Row, Space, Tag, Typography } from "antd";
import { GiftOutlined } from "@ant-design/icons";
import type { CSSProperties } from "react";

const { Text, Title } = Typography;

export type VoucherOption = {
  id?: number;
  code: string;
  name?: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  remainingUses?: number | null;
  remainingCount?: number | null;
  remainingUsage?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  estimatedDiscountAmount: number;
  finalTotalAfterDiscount?: number;
  eligible: boolean;
  ineligibleReason?: string;
  isBest?: boolean;
  raw?: any;
};

type VoucherSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  subtotal: number;
  shippingFee?: number;
  finalTotal?: number;
  vouchers: VoucherOption[];
  selectedVoucherCode?: string | null;
  selectedCouponId?: number | null;
  loading?: boolean;
  onApply: (voucher: VoucherOption) => void;
  onRemove?: () => void;
};

const money = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))} ₫`;

const normalizeType = (value?: string | null) =>
  String(value || "").trim().toUpperCase();

const isPercentType = (value?: string | null) => {
  const type = normalizeType(value);
  return type === "PERCENT" || type === "PERCENTAGE";
};

const getRemainingUses = (voucher: any) => {
  const explicitRemaining =
    voucher.remainingUses ?? voucher.remainingCount ?? voucher.remainingUsage;
  if (explicitRemaining != null) {
    return Number(explicitRemaining);
  }

  if (voucher.usageLimit != null) {
    return Math.max(Number(voucher.usageLimit) - Number(voucher.usedCount ?? 0), 0);
  }

  if (voucher.issuedQuantity != null) {
    return Math.max(Number(voucher.issuedQuantity) - Number(voucher.usedCount ?? 0), 0);
  }

  return null;
};

const getTimeValue = (value?: string | null) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};

const getDiscountText = (voucher: VoucherOption) => {
  if (isPercentType(voucher.discountType)) {
    return `Giảm ${Number(voucher.discountValue || 0)}%${
      voucher.maxDiscountAmount
        ? `, tối đa ${money(voucher.maxDiscountAmount)}`
        : ""
    }`;
  }

  return `Giảm ${money(voucher.discountValue)}`;
};

export const calculateVoucherDiscount = (voucher: any, subtotal: number) => {
  const safeSubtotal = Math.max(Number(subtotal || 0), 0);
  const discountValue = Number(voucher.discountValue || 0);

  if (safeSubtotal <= 0 || discountValue <= 0) {
    return 0;
  }

  let discount = 0;
  if (isPercentType(voucher.discountType)) {
    discount = (safeSubtotal * discountValue) / 100;
    if (voucher.maxDiscountAmount != null) {
      discount = Math.min(discount, Number(voucher.maxDiscountAmount || 0));
    }
  } else {
    discount = discountValue;
  }

  return Math.max(Math.min(discount, safeSubtotal), 0);
};

export const buildVoucherOptions = (
  vouchers: any[],
  subtotal: number,
): VoucherOption[] => {
  const now = Date.now();
  const safeSubtotal = Math.max(Number(subtotal || 0), 0);
  const mapped = (vouchers || []).map((voucher) => {
    const code = String(voucher.code || voucher.name || "").trim();
    const discountValue = Number(voucher.discountValue || 0);
    const minOrderValue = Number(voucher.minOrderValue || 0);
    const remainingUses = getRemainingUses(voucher);
    const startTime = voucher.startDate ? new Date(voucher.startDate).getTime() : null;
    const endTime = voucher.endDate ? new Date(voucher.endDate).getTime() : null;
    let eligible = true;
    let ineligibleReason = "";

    if (!code) {
      eligible = false;
      ineligibleReason = "Mã giảm giá không hợp lệ";
    } else if (voucher.isActive === false) {
      eligible = false;
      ineligibleReason = "Mã đang bị tắt";
    } else if (startTime && Number.isFinite(startTime) && now < startTime) {
      eligible = false;
      ineligibleReason = "Mã chưa đến ngày áp dụng";
    } else if (endTime && Number.isFinite(endTime) && now > endTime) {
      eligible = false;
      ineligibleReason = "Mã đã hết hạn";
    } else if (
      (voucher.usageLimit != null || voucher.issuedQuantity != null) &&
      remainingUses != null &&
      Number(remainingUses) <= 0
    ) {
      eligible = false;
      ineligibleReason = "Mã đã hết lượt sử dụng";
    } else if (safeSubtotal < minOrderValue) {
      eligible = false;
      ineligibleReason = "Đơn hàng chưa đạt giá trị tối thiểu";
    } else if (discountValue <= 0) {
      eligible = false;
      ineligibleReason = "Giá trị giảm không hợp lệ";
    } else if (isPercentType(voucher.discountType) && discountValue > 100) {
      eligible = false;
      ineligibleReason = "Giá trị giảm phần trăm không hợp lệ";
    }

    const estimatedDiscountAmount = calculateVoucherDiscount(voucher, safeSubtotal);

    return {
      id: voucher.id,
      code,
      name: voucher.name || voucher.description || code,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue,
      minOrderValue: voucher.minOrderValue,
      maxDiscountAmount: voucher.maxDiscountAmount,
      usageLimit: voucher.usageLimit ?? voucher.issuedQuantity ?? null,
      usedCount: voucher.usedCount ?? null,
      remainingUses,
      remainingCount: voucher.remainingCount,
      remainingUsage: voucher.remainingUsage,
      startDate: voucher.startDate,
      endDate: voucher.endDate,
      isActive: voucher.isActive,
      estimatedDiscountAmount: eligible ? estimatedDiscountAmount : 0,
      finalTotalAfterDiscount: Math.max(safeSubtotal - estimatedDiscountAmount, 0),
      eligible,
      ineligibleReason,
      raw: voucher,
    } as VoucherOption;
  });

  const sorted = mapped.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (b.estimatedDiscountAmount !== a.estimatedDiscountAmount) {
      return b.estimatedDiscountAmount - a.estimatedDiscountAmount;
    }
    const minA = Number(a.minOrderValue || 0);
    const minB = Number(b.minOrderValue || 0);
    if (minA !== minB) return minA - minB;
    const endDiff = getTimeValue(a.endDate) - getTimeValue(b.endDate);
    if (endDiff !== 0) return endDiff;
    return a.code.localeCompare(b.code, "vi");
  });

  let markedBest = false;
  return sorted.map((voucher) => {
    if (!markedBest && voucher.eligible) {
      markedBest = true;
      return { ...voucher, isBest: true };
    }
    return { ...voucher, isBest: false };
  });
};

export const getBestVoucher = (vouchers: VoucherOption[]) =>
  vouchers.find((voucher) => voucher.eligible) || null;

const summaryCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "12px 14px",
  background: "#fff",
  height: "100%",
};

const listStyle: CSSProperties = {
  maxHeight: 420,
  overflowY: "auto",
  paddingRight: 4,
};

export default function VoucherSelectorModal({
  open,
  onClose,
  subtotal,
  shippingFee = 0,
  finalTotal,
  vouchers,
  selectedVoucherCode,
  selectedCouponId,
  loading,
  onApply,
  onRemove,
}: VoucherSelectorModalProps) {
  const selectedDiscount =
    vouchers.find(
      (voucher) =>
        (selectedCouponId != null && voucher.id === selectedCouponId) ||
        (!!selectedVoucherCode &&
          voucher.code.toLowerCase() === selectedVoucherCode.toLowerCase()),
    )?.estimatedDiscountAmount || 0;
  const payable =
    finalTotal ?? Math.max(Number(subtotal || 0) - selectedDiscount + Number(shippingFee || 0), 0);
  const eligibleCount = vouchers.filter((voucher) => voucher.eligible).length;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={880}
      title={
        <Space align="start">
          <GiftOutlined style={{ color: "#1677ff", marginTop: 4 }} />
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
              Chọn mã giảm giá
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Hệ thống tự sắp xếp mã có lợi nhất cho hóa đơn này
            </Text>
          </Space>
        </Space>
      }
      footer={
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Text type="secondary">
              {eligibleCount > 0
                ? `Có ${eligibleCount} mã giảm giá khả dụng`
                : "Không có mã giảm giá phù hợp"}
            </Text>
          </Col>
          <Col>
            <Space>
              {onRemove && (
                <Button danger onClick={onRemove}>
                  Bỏ áp dụng
                </Button>
              )}
              <Button onClick={onClose}>Đóng</Button>
            </Space>
          </Col>
        </Row>
      }
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <div style={summaryCardStyle}>
              <Text type="secondary">Tạm tính</Text>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{money(subtotal)}</div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={summaryCardStyle}>
              <Text type="secondary">Giảm giá</Text>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#16a34a" }}>
                -{money(selectedDiscount)}
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={summaryCardStyle}>
              <Text type="secondary">Cần thanh toán</Text>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#dc2626" }}>
                {money(payable)}
              </div>
            </div>
          </Col>
        </Row>

        <div style={listStyle}>
          {vouchers.length === 0 ? (
            <Empty description="Không có mã giảm giá phù hợp" />
          ) : (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {vouchers.map((voucher) => {
                const selected =
                  (selectedCouponId != null && voucher.id === selectedCouponId) ||
                  (!!selectedVoucherCode &&
                    voucher.code.toLowerCase() === selectedVoucherCode.toLowerCase());
                const disabled = !voucher.eligible;
                const usedCount = Number(voucher.usedCount ?? 0);
                const totalLimit = voucher.usageLimit ?? null;
                const remainingUses = voucher.remainingUses ?? null;

                return (
                  <div
                    key={`${voucher.id ?? voucher.code}-${voucher.code}`}
                    style={{
                      border: selected ? "1px solid #1677ff" : "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 14,
                      background: disabled ? "#f9fafb" : selected ? "#f0f7ff" : "#fff",
                      opacity: disabled ? 0.68 : 1,
                    }}
                  >
                    <Row gutter={[16, 12]} align="middle">
                      <Col xs={24} md={17}>
                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                          <Space wrap>
                            <Text strong style={{ fontSize: 16 }}>
                              {voucher.code}
                            </Text>
                            {voucher.isBest && <Tag color="green">Tốt nhất</Tag>}
                            {selected && <Tag color="blue">Đang áp dụng</Tag>}
                          </Space>

                          <Text>{voucher.name || voucher.description || voucher.code}</Text>

                          <Text type="secondary">{getDiscountText(voucher)}</Text>

                          <Space wrap size={[12, 4]}>
                            {voucher.minOrderValue ? (
                              <Text type="secondary">
                                Đơn tối thiểu: {money(voucher.minOrderValue)}
                              </Text>
                            ) : null}
                            {totalLimit != null ? (
                              <Text type="secondary">
                                Đã sử dụng: {usedCount.toLocaleString("vi-VN")} /{" "}
                                {Number(totalLimit).toLocaleString("vi-VN")}
                              </Text>
                            ) : null}
                            {remainingUses != null ? (
                              <Text type="secondary">
                                Còn lại: {Number(remainingUses).toLocaleString("vi-VN")}
                              </Text>
                            ) : null}
                          </Space>

                          {disabled && voucher.ineligibleReason ? (
                            <Text type="danger">{voucher.ineligibleReason}</Text>
                          ) : null}
                        </Space>
                      </Col>

                      <Col xs={24} md={7}>
                        <Space direction="vertical" size={8} style={{ width: "100%" }} align="end">
                          <Text type="secondary">Giảm dự kiến</Text>
                          <Text strong style={{ color: "#16a34a", fontSize: 16 }}>
                            -{money(voucher.estimatedDiscountAmount)}
                          </Text>
                          <Button
                            type={selected ? "default" : "primary"}
                            disabled={disabled || selected}
                            loading={loading && selected}
                            onClick={() => onApply(voucher)}
                          >
                            {selected ? "Đang áp dụng" : "Áp dụng"}
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </div>
                );
              })}
            </Space>
          )}
        </div>
      </Space>
    </Modal>
  );
}
