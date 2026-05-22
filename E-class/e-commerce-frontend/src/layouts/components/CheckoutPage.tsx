import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CloseOutlined,
  CreditCardOutlined,
  EditOutlined,
  TagsOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { orderService } from "@/services/order.service";
import { useAuth } from "@/services/AuthContext";
import { checkoutService, CheckoutQuoteResponse, CheckoutValidationResponse } from "@/services/checkout.service";
import { userService } from "@/services/userService";
import { couponService } from "@/services/coupon.service";
import {
  GhnDistrict,
  GhnProvince,
  GhnWard,
  getDistricts,
  getProvinces,
  getWards,
} from "@/services/ghnShippingService";
import { resolveImageUrl } from "@/utils/utils";
import { formatKnownVariantAttributes } from "@/utils/productAttributeLabel";
import VoucherSelectorModal, {
  buildVoucherOptions,
  getBestVoucher,
  VoucherOption,
} from "@/components/VoucherSelectorModal";

const { Title, Text } = Typography;

interface Address {
  fullName: string;
  phone: string;
  provinceId?: number;
  districtId?: number;
  wardCode?: string;
  provinceName?: string;
  districtName?: string;
  wardName?: string;
  province?: string;
  district?: string;
  ward?: string;
  address: string;
  note?: string;
}

const VIETNAM_PHONE_REGEX = /^(0)(3|5|7|8|9)[0-9]{8}$/;
const DANGEROUS_TEXT_REGEX = /[<>{}\[\]]|script/i;

const trimText = (value?: string) => String(value || "").trim();

const isValidPersonName = (value?: string) => {
  const text = trimText(value);
  return (
    text.length >= 2 &&
    text.length <= 100 &&
    !/^\d+$/.test(text) &&
    !DANGEROUS_TEXT_REGEX.test(text)
  );
};

const isValidAddressDetail = (value?: string) => {
  const text = trimText(value);
  return (
    text.length >= 5 &&
    text.length <= 255 &&
    !/^\d+$/.test(text) &&
    !DANGEROUS_TEXT_REGEX.test(text)
  );
};

const isValidOptionalNote = (value?: string) => {
  const text = trimText(value);
  return text.length <= 255 && !DANGEROUS_TEXT_REGEX.test(text);
};

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { isAuthenticated, user } = useAuth();

  const { items = [] } = location.state || {};
  const totalQuantity = useMemo(
    () =>
      items.reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0,
      ),
    [items],
  );

  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [appliedVoucherInfo, setAppliedVoucherInfo] = useState<any>(null);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherSnapshot, setVoucherSnapshot] = useState<{
    discountAmount: number;
    finalTotal: number;
  } | null>(null);
  const [voucherPickerOpen, setVoucherPickerOpen] = useState(false);
  const [manualVoucherSelection, setManualVoucherSelection] = useState(false);
  const [userRemovedVoucher, setUserRemovedVoucher] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  const [shippingError, setShippingError] = useState("");
  const [checkoutValidationResult, setCheckoutValidationResult] = useState<CheckoutValidationResponse | null>(null);
  const [checkoutValidationModalOpen, setCheckoutValidationModalOpen] = useState(false);
  const [checkoutValidating, setCheckoutValidating] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [selectingAddressIndex, setSelectingAddressIndex] = useState<number | null>(null);
  const [defaultAddressKey, setDefaultAddressKey] = useState<string>("");
  const hasAppliedDefaultAddressRef = useRef(false);
  const latestQuoteRequestRef = useRef(0);
  const latestVoucherRequestRef = useRef(0);
  const lastAutoApplyContextRef = useRef("");

  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const selectedProvinceId = Form.useWatch("provinceId", form);
  const selectedDistrictId = Form.useWatch("districtId", form);
  const selectedWardCode = Form.useWatch("wardCode", form);
  const selectedAddress = Form.useWatch("address", form);
  const selectedProvinceName = Form.useWatch("provinceName", form);
  const selectedDistrictName = Form.useWatch("districtName", form);
  const selectedWardName = Form.useWatch("wardName", form);

  const fallbackItems = useMemo(
    () =>
      items.map((item: any) => {
        const quantity = Number(item.quantity ?? item.qty ?? 1);
        const unitPrice = Number(
          item.saleUnitPrice ??
            item.salePrice ??
            item.discountedPrice ??
            item.finalPrice ??
            item.unitPrice ??
            item.price ??
            0,
        );

        return {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName || item.name,
          variantCode: item.variantCode,
          size: item.size,
          color: item.color,
          material: item.materialName ?? item.material ?? null,
          imageUrl: item.image || item.imageUrl,
          quantity,
          originalPrice: Number(
            item.originalUnitPrice ??
              item.originalPrice ??
              item.basePrice ??
              item.priceBeforeDiscount ??
              item.price ??
              item.unitPrice ??
              0,
          ),
          unitPrice,
          discountPercent: Number(item.discountPercent ?? 0),
          promotionId: item.promotionId,
          lineTotal: Number(
            item.lineTotal ??
              item.totalPrice ??
              item.itemTotal ??
              item.amount ??
              item.subTotal ??
              item.total ??
              unitPrice * quantity,
          ),
        };
      }),
    [items],
  );
  const displayItems = quote?.items?.length ? quote.items : fallbackItems;
  const fallbackSubtotal = fallbackItems.reduce(
    (sum: number, item: any) => sum + Number(item.lineTotal || 0),
    0,
  );
  const fallbackOriginalSubtotal = fallbackItems.reduce(
    (sum: number, item: any) =>
      sum +
      Number(item.originalPrice || item.unitPrice || 0) *
        Number(item.quantity || 0),
    0,
  );
  const subtotalBeforeVoucher = Number(
    quote?.subtotalBeforeVoucher ?? fallbackSubtotal,
  );
  const originalSubtotal = Number(
    quote?.originalSubtotal ?? fallbackOriginalSubtotal,
  );
  const productDiscountTotal = Number(
    quote?.productDiscountTotal ??
      Math.max(originalSubtotal - subtotalBeforeVoucher, 0),
  );
  const rawVoucherCode = String(quote?.voucherCode || appliedVoucher || "").trim();
  const discount = Math.abs(Number(quote?.voucherDiscountAmount || 0) || 0);
  const shouldShowVoucher = Boolean(rawVoucherCode) && discount > 0;
  const shippingFee = Number(quote?.shippingFee || 0);
  const total = Number(
    quote?.finalTotal ?? Math.max(subtotalBeforeVoucher - discount, 0) + shippingFee,
  );
  const isShippingLoading = quoteLoading;
  const defaultAddressStorageKey = useMemo(
    () => `checkout_default_address_${user?.userId || "guest"}`,
    [user?.userId],
  );

  const formatMoney = (value?: number | string) =>
    `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))} ₫`;

  const clearAppliedVoucher = async () => {
    const voucherRequestId = ++latestVoucherRequestRef.current;
    setManualVoucherSelection(true);
    setUserRemovedVoucher(true);
    setVoucherCode("");
    setAppliedVoucher(null);
    setAppliedVoucherInfo(null);
    setVoucherError("");
    try {
      setVoucherApplying(true);
      await fetchQuote(null, {
        silent: true,
        source: "voucher",
        clearVoucherOnError: false,
      });
    } catch (error: any) {
      if (voucherRequestId === latestVoucherRequestRef.current) {
        setVoucherError(
          error?.response?.data?.message ||
            "Không thể bỏ áp dụng mã giảm giá. Vui lòng thử lại.",
        );
      }
    } finally {
      if (voucherRequestId === latestVoucherRequestRef.current) {
        setVoucherApplying(false);
      }
    }
  };

  const getCheckoutItemPrice = (item: any) => {
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    const unitPrice = Number(
      item.saleUnitPrice ??
        item.salePrice ??
        item.discountedPrice ??
        item.finalPrice ??
        item.unitPrice ??
        item.price ??
        0,
    );
    const originalPrice = Number(
      item.originalUnitPrice ??
        item.originalPrice ??
        item.basePrice ??
        item.priceBeforeDiscount ??
        item.price ??
        item.unitPrice ??
        0,
    );
    const lineTotal = Number(
      item.lineTotal ??
        item.totalPrice ??
        item.itemTotal ??
        item.amount ??
        item.subTotal ??
        item.total ??
        unitPrice * quantity,
    );

    return {
      quantity,
      unitPrice,
      originalPrice,
      lineTotal,
      hasProductDiscount: originalPrice > 0 && unitPrice > 0 && originalPrice > unitPrice,
    };
  };

  const buildVoucherLabel = (v: any) => {
    const discountText =
      v.discountType === "PERCENTAGE"
        ? `Giảm ${v.discountValue}%${
            v.maxDiscountAmount
              ? `, tối đa ${formatMoney(v.maxDiscountAmount)}`
              : ""
          }`
        : `Giảm ${formatMoney(v.discountValue)}`;

    const minOrderText =
      v.minOrderValue != null
        ? `, đơn tối thiểu ${formatMoney(v.minOrderValue)}`
        : "";

    const remainingText =
      v.remainingUsage != null
        ? `, còn ${v.remainingUsage} lượt`
        : v.usageLimit != null
          ? `, tổng ${v.usageLimit} lượt`
          : "";

    return `${v.code || v.name} - ${discountText}${minOrderText}${remainingText}`;
  };

  const getVoucherInputValue = (voucher: any) =>
    String(voucher?.code || voucher?.name || "").trim();

  const hasCompleteShippingInfo = Boolean(
    selectedAddress && selectedDistrictId && selectedWardCode,
  );

  const autoApplyContext = useMemo(
    () =>
      [
        totalQuantity,
        subtotalBeforeVoucher,
        selectedProvinceId || "",
        selectedDistrictId || "",
        selectedWardCode || "",
        selectedAddress || "",
        selectedProvinceName || "",
        selectedDistrictName || "",
        selectedWardName || "",
      ].join("|"),
    [
      totalQuantity,
      subtotalBeforeVoucher,
      selectedProvinceId,
      selectedDistrictId,
      selectedWardCode,
      selectedAddress,
      selectedProvinceName,
      selectedDistrictName,
      selectedWardName,
    ],
  );

  const voucherOptions = useMemo(
    () =>
      buildVoucherOptions(
        availableVouchers.map((voucher) => ({
          ...voucher,
          remainingUses:
            voucher.remainingUses ?? voucher.remainingCount ?? voucher.remainingUsage,
        })),
        subtotalBeforeVoucher,
      ),
    [availableVouchers, subtotalBeforeVoucher],
  );

  const isVoucherRelatedError = (value?: string) => {
    const text = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (
      text.includes("voucher") ||
      text.includes("ma giam") ||
      text.includes("khuyen mai") ||
      text.includes("coupon")
    );
  };

  const isStockRelatedError = (value?: string) => {
    const text = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return text.includes("khong du ton") || text.includes("het hang");
  };

  const isItemAvailabilityError = (value?: string) => {
    const text = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (
      text.includes("ngung ban") ||
      text.includes("ngung hoat dong") ||
      text.includes("da bi xoa") ||
      text.includes("het hang") ||
      text.includes("khong con kha dung") ||
      text.includes("bien the san pham")
    );
  };

  const buildQuotePayload = (nextVoucherCode: string | null = appliedVoucher) => {
    const values = form.getFieldsValue([
      "customerName",
      "phone",
      "address",
      "province",
      "district",
      "ward",
      "provinceId",
      "districtId",
      "wardCode",
      "provinceName",
      "districtName",
      "wardName",
      "note",
    ]);

    const hasShippingInfo =
      values.address && values.districtId && values.wardCode;

    return {
      items: items.map((item: any) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      voucherCode: nextVoucherCode || undefined,
      shippingInfo: hasShippingInfo
        ? {
            customerName: values.customerName || "Khách hàng",
            phone: values.phone || "0000000000",
            address: values.address,
            province: values.provinceName,
            district: values.districtName,
            ward: values.wardName,
            provinceId: values.provinceId,
            districtId: values.districtId,
            wardCode: values.wardCode,
            provinceName: values.provinceName,
            districtName: values.districtName,
            wardName: values.wardName,
            note: values.note,
          }
        : undefined,
    };
  };

  const fetchQuote = async (
    nextVoucherCode: string | null = appliedVoucher,
    options: {
      silent?: boolean;
      source?: "checkout" | "shipping" | "voucher";
      clearVoucherOnError?: boolean;
    } = {},
  ) => {
    if (!items.length) {
      setQuote(null);
      setQuoteError("");
      setShippingError("");
      setVoucherError("");
      return null;
    }

    const requestId = ++latestQuoteRequestRef.current;

    try {
      setQuoteLoading(true);
      if (options.source === "voucher") {
        setVoucherError("");
      } else if (options.source === "shipping") {
        setShippingError("");
      } else {
        setQuoteError("");
      }
      const response = await checkoutService.quote(buildQuotePayload(nextVoucherCode));
      if (requestId !== latestQuoteRequestRef.current) {
        return null;
      }
      setQuote(response.data);
      setQuoteError("");
      setShippingError("");
      setVoucherError("");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        "Không thể tính lại tổng tiền đơn hàng.";

      if (requestId === latestQuoteRequestRef.current) {
        if (options.source === "voucher") {
          setVoucherError(errorMessage);
          if (options.clearVoucherOnError) {
            setAppliedVoucher(null);
            setAppliedVoucherInfo(null);
          }
        } else if (options.source === "shipping") {
          setShippingError(errorMessage);
        } else {
          setQuoteError(errorMessage);
        }

        if (!options.silent) {
          message.error(errorMessage);
        }
      }
      throw error;
    } finally {
      if (requestId === latestQuoteRequestRef.current) {
        setQuoteLoading(false);
      }
    }
  };

  const normalizeLocationName = (value?: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0111/g, "d")
      .replace(/\u0110/g, "D")
      .toLowerCase()
      .replace(/\b(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|thi tran)\b/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const namesMatch = (source?: string, target?: string) => {
    const left = normalizeLocationName(source);
    const right = normalizeLocationName(target);

    return Boolean(
      left && right && (left === right || left.includes(right) || right.includes(left)),
    );
  };

  const getAddressKey = (address: Address) =>
    [
      address.fullName,
      address.phone,
      address.address,
      address.provinceName || address.province,
      address.districtName || address.district,
      address.wardName || address.ward,
    ]
      .map((value) => normalizeLocationName(value))
      .join("|");

  const handleSetDefaultAddress = async (address: Address, index: number) => {
    const key = getAddressKey(address);
    localStorage.setItem(defaultAddressStorageKey, key);
    setDefaultAddressKey(key);

    await handleAddressSelect(address, { index });
    message.success("Đã đặt địa chỉ mặc định.");
  };

  const validateSavedAddress = (address: Address) => {
    if (!trimText(address.fullName)) {
      throw new Error("Vui lòng nhập họ tên.");
    }

    if (!isValidPersonName(address.fullName)) {
      throw new Error(
        trimText(address.fullName).length < 2
          ? "Họ tên phải có ít nhất 2 ký tự."
          : "Họ tên không hợp lệ.",
      );
    }

    if (!VIETNAM_PHONE_REGEX.test(trimText(address.phone).replace(/\s+/g, ""))) {
      throw new Error("Số điện thoại không hợp lệ.");
    }

    if (!isValidAddressDetail(address.address)) {
      throw new Error(
        trimText(address.address).length < 5
          ? "Địa chỉ chi tiết phải có ít nhất 5 ký tự."
          : "Địa chỉ chi tiết không hợp lệ.",
      );
    }

    if (!trimText(address.provinceName || address.province)) {
      throw new Error("Vui lòng chọn Tỉnh/Thành phố.");
    }

    if (!trimText(address.districtName || address.district)) {
      throw new Error("Vui lòng chọn Quận/Huyện.");
    }

    if (!trimText(address.wardName || address.ward)) {
      throw new Error("Vui lòng chọn Phường/Xã.");
    }

    if (!isValidOptionalNote(address.note)) {
      throw new Error("Ghi chú giao hàng không hợp lệ.");
    }
  };

  const resolveSavedAddress = async (address: Address) => {
    validateSavedAddress(address);

    const provinceName = address.provinceName || address.province;
    const districtName = address.districtName || address.district;
    const wardName = address.wardName || address.ward;

    const provinceOptions = provinces.length > 0 ? provinces : await getProvinces();
    if (provinces.length === 0) {
      setProvinces(provinceOptions);
    }

    const province =
      provinceOptions.find((item) => item.ProvinceID === address.provinceId) ||
      provinceOptions.find((item) => namesMatch(item.ProvinceName, provinceName));

    const provinceId = address.provinceId || province?.ProvinceID;
    if (!provinceId) {
      throw new Error("Không tìm thấy tỉnh/thành phố GHN cho địa chỉ đã lưu.");
    }

    const districtOptions = await getDistricts(Number(provinceId));
    setDistricts(districtOptions);

    const district =
      districtOptions.find((item) => item.DistrictID === address.districtId) ||
      districtOptions.find((item) => namesMatch(item.DistrictName, districtName));

    const districtId = address.districtId || district?.DistrictID;
    if (!districtId) {
      throw new Error("Không tìm thấy quận/huyện GHN cho địa chỉ đã lưu.");
    }

    const wardOptions = await getWards(Number(districtId));
    setWards(wardOptions);

    const ward =
      wardOptions.find((item) => item.WardCode === address.wardCode) ||
      wardOptions.find((item) => namesMatch(item.WardName, wardName));

    const wardCode = address.wardCode || ward?.WardCode;
    if (!wardCode) {
      throw new Error("Không tìm thấy phường/xã GHN cho địa chỉ đã lưu.");
    }

    return {
      provinceId,
      districtId,
      wardCode,
      provinceName: province?.ProvinceName || provinceName,
      districtName: district?.DistrictName || districtName,
      wardName: ward?.WardName || wardName,
    };
  };

  const loadUserAddresses = async () => {
    if (!isAuthenticated || addresses.length > 0) return;

    try {
      const response = await orderService.getUserShippingAddresses();
      const savedAddresses = response.data || [];
      setAddresses(savedAddresses);

      if (
        savedAddresses.length > 0 &&
        !hasAppliedDefaultAddressRef.current &&
        !form.getFieldValue("address")
      ) {
        const savedDefaultKey =
          localStorage.getItem(defaultAddressStorageKey) || defaultAddressKey;
        const defaultAddress =
          savedAddresses.find(
            (address: Address) => getAddressKey(address) === savedDefaultKey,
          ) || savedAddresses[0];

        if (savedDefaultKey) {
          setDefaultAddressKey(savedDefaultKey);
        }

        hasAppliedDefaultAddressRef.current = true;
        await handleAddressSelect(defaultAddress, {
          closeModal: false,
          showError: false,
        });
      }
    } catch (error) {
      console.error("Không thể tải danh sách địa chỉ:", error);
    }
  };

  useEffect(() => {
    setDefaultAddressKey(localStorage.getItem(defaultAddressStorageKey) || "");
    hasAppliedDefaultAddressRef.current = false;
  }, [defaultAddressStorageKey]);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        let coupons: any[] = [];

        if (isAuthenticated) {
          const couponsRes = await couponService.getMyCoupons();
          coupons =
            couponsRes.data?.map((coupon: any) => ({
              ...coupon,
              type: "COUPON",
            })) || [];
        }

        setAvailableVouchers(coupons);
      } catch (error) {
        console.error("Không thể tải danh sách mã giảm giá:", error);
        setAvailableVouchers([]);
      }
    };

    fetchVouchers();
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        setLoadingProvinces(true);
        setProvinces(await getProvinces());
      } catch (error) {
        message.error("Không thể tải danh sách tỉnh/thành phố từ GHN.");
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  useEffect(() => {
    loadUserAddresses();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([]);
      return;
    }

    const fetchDistricts = async () => {
      try {
        setLoadingDistricts(true);
        setDistricts(await getDistricts(Number(selectedProvinceId)));
      } catch (error) {
        message.error("Không thể tải danh sách quận/huyện từ GHN.");
      } finally {
        setLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [selectedProvinceId]);

  useEffect(() => {
    if (!selectedDistrictId) {
      setWards([]);
      return;
    }

    const fetchWards = async () => {
      try {
        setLoadingWards(true);
        setWards(await getWards(Number(selectedDistrictId)));
      } catch (error) {
        message.error("Không thể tải danh sách phường/xã từ GHN.");
      } finally {
        setLoadingWards(false);
      }
    };

    fetchWards();
  }, [selectedDistrictId]);

  useEffect(() => {
    const calculateFeeFromQuote = async () => {
      if (items.length === 0) {
        setQuote(null);
        setShippingError("");
        setQuoteError("");
        setVoucherError("");
        return;
      }

      if (shippingError) {
        return;
      }

      try {
        const quoteData = await fetchQuote(appliedVoucher, {
          silent: true,
          source: "shipping",
          clearVoucherOnError: Boolean(appliedVoucher),
        });
        if (appliedVoucher && quoteData?.voucherValid === false) {
          setAppliedVoucher(null);
          setAppliedVoucherInfo(null);
          setVoucherError(
            quoteData.voucherMessage ||
              "Mã giảm giá không còn phù hợp với đơn hàng hiện tại.",
          );
          message.warning(
            "Mã giảm giá không còn phù hợp với đơn hàng hiện tại và đã được bỏ áp dụng.",
          );
        }
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          "Mã giảm giá không còn phù hợp với đơn hàng hiện tại.";
        if (appliedVoucher && isVoucherRelatedError(errorMessage)) {
          setAppliedVoucher(null);
          setAppliedVoucherInfo(null);
          setVoucherError(errorMessage);
          message.warning(
            "Mã giảm giá không còn phù hợp với đơn hàng hiện tại và đã được bỏ áp dụng.",
          );
        }
      }
    };

    calculateFeeFromQuote();
  }, [
    items.length,
    totalQuantity,
    appliedVoucher,
    selectedProvinceId,
    selectedDistrictId,
    selectedWardCode,
    selectedAddress,
    selectedProvinceName,
    selectedDistrictName,
    selectedWardName,
    shippingError,
  ]);

  useEffect(() => {
    if (lastAutoApplyContextRef.current && lastAutoApplyContextRef.current !== autoApplyContext) {
      setUserRemovedVoucher(false);
    }
    lastAutoApplyContextRef.current = autoApplyContext;
  }, [autoApplyContext]);

  useEffect(() => {
    if (
      !items.length ||
      !hasCompleteShippingInfo ||
      subtotalBeforeVoucher <= 0 ||
      quoteLoading ||
      voucherApplying ||
      userRemovedVoucher ||
      Boolean(shippingError)
    ) {
      return;
    }

    const current = appliedVoucher
      ? voucherOptions.find(
          (voucher) =>
            voucher.code.toLowerCase() === appliedVoucher.toLowerCase(),
        )
      : null;

    if (manualVoucherSelection && current?.eligible) {
      return;
    }

    const best = getBestVoucher(voucherOptions);
    if (!best || appliedVoucher?.toLowerCase() === best.code.toLowerCase()) {
      return;
    }

    applyVoucherFromOption(best, false);
  }, [
    items.length,
    hasCompleteShippingInfo,
    subtotalBeforeVoucher,
    quoteLoading,
    voucherApplying,
    userRemovedVoucher,
    appliedVoucher,
    manualVoucherSelection,
    voucherOptions,
    shippingError,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      userService
        .getProfile()
        .then((response) => {
          const profile = response.data;
          if (profile) {
            form.setFieldsValue({
              customerName: form.getFieldValue("customerName") || profile.fullName,
              phone: form.getFieldValue("phone") || profile.phone,
            });
          }
        })
        .catch((error) =>
          console.error("Không thể tải thông tin người dùng:", error),
        );
    }
  }, [isAuthenticated, form]);

  useEffect(() => {
    if (
      quote?.voucherValid === true &&
      appliedVoucher != null &&
      quote.voucherDiscountAmount != null
    ) {
      setVoucherSnapshot({
        discountAmount: Number(quote.voucherDiscountAmount),
        finalTotal: Number(quote.finalTotal ?? 0),
      });
    } else if (appliedVoucher == null) {
      setVoucherSnapshot(null);
    }
  }, [quote, appliedVoucher]);

  const handleAddressSelect = async (
    address: Address,
    options: { closeModal?: boolean; showError?: boolean; index?: number } = {},
  ) => {
    const { closeModal = true, showError = true, index = null } = options;

    try {
      setSelectingAddressIndex(index);
      const resolvedAddress = await resolveSavedAddress(address);

      form.setFieldsValue({
        customerName: trimText(address.fullName),
        phone: trimText(address.phone).replace(/\s+/g, ""),
        provinceId: resolvedAddress.provinceId,
        districtId: resolvedAddress.districtId,
        wardCode: resolvedAddress.wardCode,
        provinceName: resolvedAddress.provinceName,
        districtName: resolvedAddress.districtName,
        wardName: resolvedAddress.wardName,
        address: trimText(address.address),
        note: trimText(address.note),
      });

      setShippingError("");
      setQuoteError("");

      if (closeModal) {
        setIsAddressModalVisible(false);
      }
    } catch (error: any) {
      console.error("Không thể chọn địa chỉ đã lưu:", error);
      if (showError) {
        message.error(
          error?.message ||
            "Không thể dùng địa chỉ đã lưu này. Vui lòng chọn lại tỉnh/huyện/xã.",
        );
      }
    } finally {
      setSelectingAddressIndex(null);
    }
  };

  const handleProvinceChange = (_value: number, option: any) => {
    form.setFieldsValue({
      provinceName: option?.label,
      districtId: undefined,
      districtName: undefined,
      wardCode: undefined,
      wardName: undefined,
    });
    setShippingError("");
    setQuoteError("");
  };

  const handleDistrictChange = (_value: number, option: any) => {
    form.setFieldsValue({
      districtName: option?.label,
      wardCode: undefined,
      wardName: undefined,
    });
    setShippingError("");
    setQuoteError("");
  };

  const handleWardChange = (_value: string, option: any) => {
    form.setFieldsValue({
      wardName: option?.label,
    });
  };

  const handleApplyVoucher = async (event?: {
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (voucherApplying) {
      return;
    }

    if (!voucherCode) {
      message.warning("Vui lòng nhập mã giảm giá.");
      return;
    }

    const normalizedVoucherCode = voucherCode.trim();
    const voucherMeta = availableVouchers.find(
      (voucher) =>
        String(voucher.code || voucher.name || "").toLowerCase() ===
        normalizedVoucherCode.toLowerCase(),
    );
    const voucherRequestId = ++latestVoucherRequestRef.current;

    try {
      setVoucherApplying(true);
      setVoucherError("");
      const quoteData = await fetchQuote(normalizedVoucherCode, {
        silent: true,
        source: "voucher",
        clearVoucherOnError: true,
      });
      if (voucherRequestId !== latestVoucherRequestRef.current || !quoteData) {
        return;
      }
      if (quoteData.voucherValid === false) {
        const errorMessage =
          quoteData.voucherMessage ||
          "Mã giảm giá không hợp lệ hoặc không đủ điều kiện áp dụng.";
        setAppliedVoucher(null);
        setAppliedVoucherInfo(null);
        setVoucherError(errorMessage);
        message.error(errorMessage);
        return;
      }
      setAppliedVoucher(normalizedVoucherCode);
      setUserRemovedVoucher(false);
      setAppliedVoucherInfo(
        voucherMeta ||
          quoteData,
      );
      const successMessage = null;

      message.success(
        successMessage || `Áp dụng mã "${normalizedVoucherCode}" thành công!`,
      );
    } catch (error: any) {
      if (voucherRequestId === latestVoucherRequestRef.current) {
        const errorMessage =
          error.response?.data?.message ||
          "Mã giảm giá không hợp lệ hoặc đã xảy ra lỗi.";
        setVoucherError(errorMessage);
        setAppliedVoucher(null);
        setAppliedVoucherInfo(null);
        message.error(errorMessage);
      }
    } finally {
      if (voucherRequestId === latestVoucherRequestRef.current) {
        setVoucherApplying(false);
      }
    }
  };

  const applyVoucherFromOption = async (
    voucher: VoucherOption,
    markManual = true,
  ) => {
    const normalizedVoucherCode = String(voucher.code || "").trim();
    if (!normalizedVoucherCode || voucherApplying) {
      return;
    }

    if (markManual) {
      setManualVoucherSelection(true);
      setUserRemovedVoucher(false);
    }

    const voucherRequestId = ++latestVoucherRequestRef.current;
    try {
      setVoucherApplying(true);
      setVoucherError("");
      setVoucherCode(normalizedVoucherCode);
      const quoteData = await fetchQuote(normalizedVoucherCode, {
        silent: true,
        source: "voucher",
        clearVoucherOnError: true,
      });
      if (voucherRequestId !== latestVoucherRequestRef.current || !quoteData) {
        return;
      }
      if (quoteData.voucherValid === false) {
        const errorMessage =
          quoteData.voucherMessage ||
          "Mã giảm giá không hợp lệ hoặc không đủ điều kiện áp dụng.";
        setAppliedVoucher(null);
        setAppliedVoucherInfo(null);
        setVoucherError(errorMessage);
        if (markManual) {
          message.error(errorMessage);
        }
        return;
      }
      setAppliedVoucher(normalizedVoucherCode);
      setUserRemovedVoucher(false);
      setAppliedVoucherInfo(voucher.raw || voucher || quoteData);
      if (markManual) {
        message.success(`Áp dụng mã "${normalizedVoucherCode}" thành công!`);
      }
      setVoucherPickerOpen(false);
    } catch (error: any) {
      if (voucherRequestId === latestVoucherRequestRef.current) {
        const errorMessage =
          error.response?.data?.message ||
          "Mã giảm giá không hợp lệ hoặc đã xảy ra lỗi.";
        setVoucherError(errorMessage);
        setAppliedVoucher(null);
        setAppliedVoucherInfo(null);
        if (markManual) {
          message.error(errorMessage);
        }
      }
    } finally {
      if (voucherRequestId === latestVoucherRequestRef.current) {
        setVoucherApplying(false);
      }
    }
  };

  const isVoucherChangeConflict = (error: any) =>
    error?.response?.status === 409 &&
    error?.response?.data?.errorCode === "NEED_CONFIRM_VOUCHER_CHANGED";

  const showVoucherChangeConfirm = (data: any, onOk: () => void) => {
    const code = data.voucherCode || appliedVoucher || "";
    Modal.confirm({
      title: "Voucher đã thay đổi",
      content: (
        <div>
          <p>
            Voucher <strong>{code}</strong> đã được cập nhật sau khi bạn áp
            dụng.
          </p>
          <p>
            Giảm giá:{" "}
            <strong>{formatMoney(data.oldDiscountAmount)}</strong> →{" "}
            <strong>{formatMoney(data.newDiscountAmount)}</strong>
          </p>
          <p>
            Tổng tiền:{" "}
            <strong>{formatMoney(data.oldFinalTotal)}</strong> →{" "}
            <strong>{formatMoney(data.newFinalTotal)}</strong>
          </p>
          <p>Bạn có muốn tiếp tục thanh toán với giá mới không?</p>
        </div>
      ),
      okText: "Tiếp tục",
      cancelText: "Hủy",
      onOk,
    });
  };

  const handlePlaceOrder = async (values: any) => {
    const normalizedValues = {
      ...values,
      customerName: trimText(values.customerName),
      phone: trimText(values.phone).replace(/\s+/g, ""),
      address: trimText(values.address),
      note: trimText(values.note),
    };

    if (!quote) {
      message.warning("Vui lòng đợi hệ thống tính lại tổng tiền đơn hàng.");
      return;
    }

    if (shippingFee < 0 || shippingError || isShippingLoading) {
      message.warning("Vui lòng chọn đủ địa chỉ để tính phí vận chuyển.");
      return;
    }

    if (total <= 0) {
      message.warning("Tổng tiền đơn hàng không hợp lệ.");
      return;
    }

    const orderData = {
      shippingInfo: {
        customerName: normalizedValues.customerName,
        phone: normalizedValues.phone,
        address: normalizedValues.address,
        province: normalizedValues.provinceName,
        district: normalizedValues.districtName,
        ward: normalizedValues.wardName,
        provinceId: normalizedValues.provinceId,
        districtId: normalizedValues.districtId,
        wardCode: normalizedValues.wardCode,
        provinceName: normalizedValues.provinceName,
        districtName: normalizedValues.districtName,
        wardName: normalizedValues.wardName,
        note: normalizedValues.note,
      },
      shouldUpdateProfile: normalizedValues.saveAddress,
      paymentMethodCode: normalizedValues.paymentMethod,
      items: (quote?.items || []).map((item: any) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      voucherCode: appliedVoucher || undefined,
      previewDiscountAmount:
        appliedVoucher && voucherSnapshot != null
          ? voucherSnapshot.discountAmount
          : undefined,
    };

    setCheckoutValidating(true);
    try {
      const validationRes = await checkoutService.validate({
        items: items.map((item: any) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        voucherCode: appliedVoucher || undefined,
        shippingInfo: orderData.shippingInfo,
        oldItems: (quote?.items || []).map((item: any) => ({
          variantId: item.variantId,
          unitPrice: item.unitPrice,
          promotionId: item.promotionId ?? null,
        })),
        oldSubtotal: quote?.subtotalBeforeVoucher,
        oldDiscount: quote?.voucherDiscountAmount,
        oldShippingFee: quote?.shippingFee,
        oldTotal: quote?.finalTotal,
      });
      const vResult = validationRes.data;

      if (vResult.status === "OK") {
        if (normalizedValues.paymentMethod === "VNPAY") {
          await submitOrderAndRedirectVnpay({ ...orderData, confirmCheckoutChanged: true });
        } else {
          await submitOrder({ ...orderData, confirmCheckoutChanged: true });
        }
        return;
      }

      setCheckoutValidationResult(vResult);
      setPendingOrderData(orderData);
      setCheckoutValidationModalOpen(true);
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.message ||
        "Không thể kiểm tra đơn hàng. Vui lòng thử lại.";
      message.error(errMsg);
    } finally {
      setCheckoutValidating(false);
    }
  };

  const submitOrder = async (orderData: any) => {
    setLoading(true);
    try {
      await orderService.placeOrder(orderData);

      setAppliedVoucher(null);
      setAppliedVoucherInfo(null);
      setVoucherCode("");
      setVoucherSnapshot(null);
      setQuote(null);

      message.success("Đặt hàng thành công!");
      navigate("/cart?tab=pending");
    } catch (error: any) {
      if (isVoucherChangeConflict(error) && !orderData.confirmVoucherChanged) {
        showVoucherChangeConfirm(error.response.data, () =>
          submitOrder({ ...orderData, confirmVoucherChanged: true }),
        );
        return;
      }
      const errorMessage =
        error.response?.data?.message || "Đặt hàng thất bại. Vui lòng thử lại.";
      if (isStockRelatedError(errorMessage)) {
        message.error("Sản phẩm không đủ tồn kho, vui lòng kiểm tra lại giỏ hàng.");
      } else if (appliedVoucher && isVoucherRelatedError(errorMessage)) {
        setAppliedVoucher(null);
        setAppliedVoucherInfo(null);
        setVoucherError(errorMessage);
        message.error(`${errorMessage} Vui lòng đặt hàng lại không dùng mã giảm giá.`);
      } else {
        message.error(errorMessage);
      }
      console.error("Failed to place order:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitOrderAndRedirectVnpay = async (orderData: any) => {
    setLoading(true);
    try {
      const placeOrderResponse = await orderService.placeOrder(orderData);
      const createdOrder = placeOrderResponse.data;

      const vnpayResponse = await orderService.createOnlineVnpayPayment(
        createdOrder.id,
      );

      const paymentUrl = vnpayResponse.data.paymentUrl;
      if (!paymentUrl) {
        throw new Error("Không tạo được link thanh toán VNPAY");
      }

      window.location.href = paymentUrl;
    } catch (error: any) {
      if (isVoucherChangeConflict(error) && !orderData.confirmVoucherChanged) {
        showVoucherChangeConfirm(error.response.data, () =>
          submitOrderAndRedirectVnpay({ ...orderData, confirmVoucherChanged: true }),
        );
        return;
      }
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Không thể khởi tạo thanh toán VNPAY.";
      if (isStockRelatedError(errorMessage)) {
        message.error("Sản phẩm không đủ tồn kho, vui lòng kiểm tra lại giỏ hàng.");
      } else if (appliedVoucher && isVoucherRelatedError(errorMessage)) {
        setAppliedVoucher(null);
        setAppliedVoucherInfo(null);
        setVoucherError(errorMessage);
        message.error(`${errorMessage} Vui lòng đặt hàng lại không dùng mã giảm giá.`);
      } else {
        message.error(errorMessage);
      }
      console.error("Failed to create VNPAY payment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmValidation = async () => {
    if (!pendingOrderData) return;
    setCheckoutValidationModalOpen(false);
    const confirmData = { ...pendingOrderData, confirmCheckoutChanged: true };
    if (confirmData.paymentMethodCode === "VNPAY") {
      await submitOrderAndRedirectVnpay(confirmData);
    } else {
      await submitOrder(confirmData);
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PRODUCT_PRICE_CHANGED: "Giá sản phẩm thay đổi",
      PROMOTION_CHANGED: "Khuyến mãi thay đổi",
      VOUCHER_CHANGED: "Voucher thay đổi",
      VOUCHER_INVALID: "Voucher không hợp lệ",
      OUT_OF_STOCK: "Hết hàng",
      PRODUCT_INACTIVE: "Sản phẩm ngừng bán",
      VARIANT_INACTIVE: "Biến thể ngừng bán",
    };
    return labels[type] || type;
  };

  return (
    <div
      style={{
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        padding: 24,
      }}
    >
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/cart")}
        style={{ marginBottom: 24 }}
      >
        Quay lại giỏ hàng
      </Button>

      <Title level={2} style={{ marginBottom: 24 }}>
        Thanh toán
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handlePlaceOrder}
        scrollToFirstError
        onFinishFailed={() => {
          message.warning("Vui lòng kiểm tra lại thông tin giao hàng.");
        }}
      >
        <Row gutter={[32, 32]}>
          <Col xs={24} lg={14}>
            <Card
              title="1. Thông tin giao hàng"
              bordered={false}
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              extra={isShippingLoading && <Spin size="small" />}
            >
              <Form.Item
                name="customerName"
                label="Họ và tên người nhận"
                normalize={(value) => trimText(value)}
                rules={[
                  { required: true, message: "Vui lòng nhập họ tên." },
                  {
                    validator: (_, value) => {
                      const text = trimText(value);
                      if (!text) {
                        return Promise.resolve();
                      }
                      if (text.length < 2) {
                        return Promise.reject(new Error("Họ tên phải có ít nhất 2 ký tự."));
                      }
                      if (!isValidPersonName(text)) {
                        return Promise.reject(new Error("Họ tên không hợp lệ."));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Số điện thoại"
                normalize={(value) => trimText(value).replace(/\s+/g, "")}
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại." },
                  {
                    pattern: VIETNAM_PHONE_REGEX,
                    message: "Số điện thoại không hợp lệ.",
                  },
                ]}
              >
                <Input placeholder="Ví dụ: 0123456789" />
              </Form.Item>


              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="provinceId"
                    label="Tỉnh/Thành phố"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng chọn Tỉnh/Thành phố.",
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      loading={loadingProvinces}
                      placeholder="Chọn tỉnh/thành phố"
                      optionFilterProp="label"
                      options={provinces.map((province) => ({
                        value: province.ProvinceID,
                        label: province.ProvinceName,
                      }))}
                      onChange={handleProvinceChange}
                    />
                  </Form.Item>
                  <Form.Item name="provinceName" hidden>
                    <Input />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="districtId"
                    label="Quận/Huyện"
                    rules={[
                      { required: true, message: "Vui lòng chọn Quận/Huyện." },
                    ]}
                  >
                    <Select
                      showSearch
                      loading={loadingDistricts}
                      disabled={!selectedProvinceId}
                      placeholder="Chọn quận/huyện"
                      optionFilterProp="label"
                      options={districts.map((district) => ({
                        value: district.DistrictID,
                        label: district.DistrictName,
                      }))}
                      onChange={handleDistrictChange}
                    />
                  </Form.Item>
                  <Form.Item name="districtName" hidden>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="wardCode"
                    label="Phường/Xã"
                    rules={[
                      { required: true, message: "Vui lòng chọn Phường/Xã." },
                    ]}
                  >
                    <Select
                      showSearch
                      loading={loadingWards}
                      disabled={!selectedDistrictId}
                      placeholder="Chọn phường/xã"
                      optionFilterProp="label"
                      options={wards.map((ward) => ({
                        value: ward.WardCode,
                        label: ward.WardName,
                      }))}
                      onChange={handleWardChange}
                    />
                  </Form.Item>
                  <Form.Item name="wardName" hidden>
                    <Input />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="address"
                    label="Địa chỉ chi tiết"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập địa chỉ chi tiết.",
                      },
                      {
                        validator: (_, value) => {
                          const text = trimText(value);
                          if (!text) {
                            return Promise.resolve();
                          }
                          if (text.length < 5) {
                            return Promise.reject(
                              new Error("Địa chỉ chi tiết phải có ít nhất 5 ký tự."),
                            );
                          }
                          if (!isValidAddressDetail(text)) {
                            return Promise.reject(
                              new Error("Địa chỉ chi tiết không hợp lệ."),
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input placeholder="Số nhà, tên đường" />
                  </Form.Item>
                </Col>
              </Row>

              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => {
                  loadUserAddresses();
                  setIsAddressModalVisible(true);
                }}
                style={{ padding: 0, marginBottom: 16 }}
              >
                Chọn địa chỉ đã lưu
              </Button>

              <Form.Item
                name="note"
                label="Ghi chú cho đơn hàng"
                normalize={(value) => trimText(value)}
                rules={[
                  {
                    validator: (_, value) =>
                      isValidOptionalNote(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Ghi chú giao hàng không hợp lệ.")),
                  },
                ]}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Ghi chú thêm cho người bán hoặc shipper"
                />
              </Form.Item>

              <Form.Item name="saveAddress" valuePropName="checked">
                <Checkbox>Lưu thông tin này cho lần mua sắm tiếp theo</Checkbox>
              </Form.Item>
            </Card>

            <Card
              title="Địa chỉ giao hàng"
              bordered={false}
              style={{
                marginTop: 24,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {(() => {
                const values = form.getFieldsValue([
                  "customerName",
                  "phone",
                  "provinceName",
                  "districtName",
                  "wardName",
                  "address",
                ]);

                const hasCompleteAddress =
                  values.customerName &&
                  values.phone &&
                  values.provinceName &&
                  values.districtName &&
                  values.wardName &&
                  values.address;

                if (!hasCompleteAddress) {
                  return (
                    <Text type="secondary">
                      Vui lòng nhập đầy đủ thông tin giao hàng.
                    </Text>
                  );
                }

                return (
                  <div style={{ lineHeight: 1.8 }}>
                    <div>
                      <Text strong>Người nhận: </Text>
                      <Text>{values.customerName}</Text>
                    </div>
                    <div>
                      <Text strong>Số điện thoại: </Text>
                      <Text>{values.phone}</Text>
                    </div>
                    <div>
                      <Text strong>Địa chỉ: </Text>
                      <Text>
                        {values.address}, {values.wardName},{" "}
                        {values.districtName}, {values.provinceName}
                      </Text>
                    </div>
                  </div>
                );
              })()}
            </Card>

            <Card
              title="2. Phương thức thanh toán"
              bordered={false}
              style={{
                marginTop: 24,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Form.Item
                name="paymentMethod"
                initialValue="CASH"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng chọn phương thức thanh toán!",
                  },
                ]}
              >
                <Radio.Group style={{ width: "100%" }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Radio
                      value="CASH"
                      style={{
                        border: "1px solid #d9d9d9",
                        borderRadius: 8,
                        padding: 16,
                        width: "100%",
                      }}
                    >
                      <TruckOutlined style={{ marginRight: 8 }} />
                      Thanh toán khi nhận hàng (COD)
                    </Radio>

                    <Radio
                      value="VNPAY"
                      style={{
                        border: "1px solid #d9d9d9",
                        borderRadius: 8,
                        padding: 16,
                        width: "100%",
                      }}
                    >
                      <CreditCardOutlined style={{ marginRight: 8 }} />
                      Thanh toán online qua VNPAY
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                boxShadow: "0 12px 32px rgba(15,23,42,0.10)",
                position: "sticky",
                top: 24,
              }}
              styles={{ body: { padding: 24 } }}
            >
              <Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>
                Đơn hàng của bạn ({displayItems.length || items.length})
              </Title>

              <Spin spinning={loading || quoteLoading}>
                {quoteError && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="danger">{quoteError}</Text>
                  </div>
                )}

                <List
                  itemLayout="horizontal"
                  dataSource={displayItems}
                  split={false}
                  renderItem={(item: any) => {
                    const price = getCheckoutItemPrice(item);
                    const variantText = formatKnownVariantAttributes({
                      color: item.color,
                      size: item.size,
                      material: item.material,
                    });

                    return (
                      <List.Item style={{ padding: "0 0 18px" }}>
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              shape="square"
                              size={72}
                              src={resolveImageUrl(item.imageUrl)}
                              style={{ borderRadius: 12 }}
                            />
                          }
                          title={
                            <Text strong style={{ color: "#111827" }}>
                              {item.productName}
                              {item.variantCode ? ` - ${item.variantCode}` : ""}
                            </Text>
                          }
                          description={
                            <Row justify="space-between" gutter={[16, 8]}>
                              <Col flex="auto" style={{ minWidth: 0 }}>
                                <Space direction="vertical" size={4}>
                                  {variantText && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      {variantText}
                                    </Text>
                                  )}
                                  {price.hasProductDiscount && (
                                    <Text delete type="secondary" style={{ fontSize: 12 }}>
                                      Giá gốc: {formatMoney(price.originalPrice)}
                                    </Text>
                                  )}
                                  <Text style={{ color: "#374151", fontSize: 13 }}>
                                    {price.hasProductDiscount
                                      ? "Đơn giá sau giảm"
                                      : "Đơn giá"}
                                    : {formatMoney(price.unitPrice)}
                                  </Text>
                                  <Text style={{ color: "#374151", fontSize: 13 }}>
                                    Số lượng: <Text strong>{price.quantity}</Text>
                                  </Text>
                                </Space>
                              </Col>
                              <Col>
                                <Space direction="vertical" size={3} align="end">
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Thành tiền
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatMoney(price.unitPrice)} x {price.quantity}
                                  </Text>
                                  <Text
                                    strong
                                    style={{ color: "#dc2626", fontSize: 15 }}
                                  >
                                    = {formatMoney(price.lineTotal)}
                                  </Text>
                                </Space>
                              </Col>
                            </Row>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />

                <Divider style={{ margin: "4px 0 18px" }} />

                <div style={{ marginBottom: 18 }}>
                  <Text strong>{"M\u00e3 gi\u1ea3m gi\u00e1"}</Text>

                  <div
                    style={{
                      border: shouldShowVoucher
                        ? "1px solid #bbf7d0"
                        : "1px dashed #93c5fd",
                      background: shouldShowVoucher ? "#f0fdf4" : "#eff6ff",
                      borderRadius: 14,
                      marginTop: 12,
                      padding: 12,
                    }}
                  >
                    <Row align="middle" justify="space-between" gutter={[12, 12]}>
                      <Col flex="auto" style={{ minWidth: 0 }}>
                        <Space align="start">
                          <TagsOutlined
                            style={{
                              color: shouldShowVoucher ? "#16a34a" : "#1677ff",
                              fontSize: 20,
                              marginTop: 2,
                            }}
                          />
                          <Space direction="vertical" size={2}>
                            <Text strong>
                              {shouldShowVoucher
                                ? rawVoucherCode
                                : hasCompleteShippingInfo
                                  ? "M\u00e3 gi\u1ea3m gi\u00e1"
                                  : "Ch\u1ecdn \u0111\u1ecba ch\u1ec9 \u0111\u1ec3 h\u1ec7 th\u1ed1ng g\u1ee3i \u00fd m\u00e3 gi\u1ea3m gi\u00e1 t\u1ed1t nh\u1ea5t"}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {shouldShowVoucher
                                ? `\u0110\u00e3 gi\u1ea3m ${formatMoney(discount)}`
                                : "H\u1ec7 th\u1ed1ng t\u1ef1 s\u1eafp x\u1ebfp m\u00e3 c\u00f3 l\u1ee3i nh\u1ea5t cho \u0111\u01a1n h\u00e0ng n\u00e0y"}
                            </Text>
                          </Space>
                        </Space>
                      </Col>
                      <Col>
                        <Space>
                          {shouldShowVoucher && (
                            <Button
                              type="text"
                              size="small"
                              icon={<CloseOutlined />}
                              onClick={clearAppliedVoucher}
                            />
                          )}
                          <Button
                            type="primary"
                            onClick={() => setVoucherPickerOpen(true)}
                            disabled={!isAuthenticated || !hasCompleteShippingInfo}
                            loading={voucherApplying}
                          >
                            {shouldShowVoucher ? "\u0110\u1ed5i m\u00e3" : "Ch\u1ecdn m\u00e3 gi\u1ea3m gi\u00e1"}
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </div>

                  {voucherError && (
                    <div style={{ marginTop: 10 }}>
                      <Text type="danger">{voucherError}</Text>
                    </div>
                  )}
                </div>

                <Divider style={{ margin: "0 0 18px" }} />

                {productDiscountTotal > 0 ? (
                  <>
                    <Row justify="space-between" style={{ marginBottom: 12 }}>
                      <Text>Tạm tính giá gốc</Text>
                      <Text strong>{formatMoney(originalSubtotal)}</Text>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 12 }}>
                      <Text type="success">Giảm khuyến mãi sản phẩm</Text>
                      <Text strong type="success">
                        - {formatMoney(productDiscountTotal)}
                      </Text>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 12 }}>
                      <Text>Tạm tính sau khuyến mãi</Text>
                      <Text strong>{formatMoney(subtotalBeforeVoucher)}</Text>
                    </Row>
                  </>
                ) : (
                  <Row justify="space-between" style={{ marginBottom: 12 }}>
                    <Text>Tạm tính hàng hóa</Text>
                    <Text strong>{formatMoney(subtotalBeforeVoucher)}</Text>
                  </Row>
                )}

                <Row justify="space-between" style={{ marginBottom: 12 }}>
                  <Text>Phí vận chuyển</Text>
                  <Text strong>
                    {isShippingLoading
                      ? "Đang tính phí vận chuyển..."
                      : shippingError || formatMoney(shippingFee)}
                  </Text>
                </Row>

                {shouldShowVoucher && (
                  <Row justify="space-between" style={{ marginBottom: 12 }}>
                    <Text type="success">Giảm mã giảm giá ({rawVoucherCode})</Text>
                    <Text strong type="success">
                      - {formatMoney(discount)}
                    </Text>
                  </Row>
                )}

                <Divider />

                <Row align="middle" justify="space-between">
                  <Title level={4} style={{ margin: 0 }}>
                    Tổng cộng
                  </Title>
                  <Title level={4} style={{ color: "#dc2626", margin: 0 }}>
                    {formatMoney(total)}
                  </Title>
                </Row>

                {shippingError && isItemAvailabilityError(shippingError) && (
                  <Alert
                    type="error"
                    showIcon
                    message="Một số sản phẩm không còn khả dụng. Vui lòng quay lại giỏ hàng để cập nhật."
                    style={{ marginBottom: 12, marginTop: 8 }}
                  />
                )}

                <Popconfirm
                  title="Xác nhận đặt hàng?"
                  description="Vui lòng kiểm tra lại thông tin giao hàng và sản phẩm trước khi xác nhận."
                  onConfirm={() => form.submit()}
                  okText="Xác nhận"
                  cancelText="Xem lại"
                >
                  <Button
                    type="primary"
                    danger
                    block
                    size="large"
                    htmlType="button"
                    loading={loading || checkoutValidating}
                    disabled={isShippingLoading || !!shippingError || total <= 0 || checkoutValidating}
                    style={{
                      borderRadius: 12,
                      fontWeight: 700,
                      height: 52,
                      marginTop: 24,
                    }}
                  >
                    {loading || checkoutValidating ? "Đang xử lý..." : "HOÀN TẤT ĐẶT HÀNG"}
                  </Button>
                </Popconfirm>
              </Spin>
            </Card>
          </Col>
        </Row>
      </Form>

      <Modal
        open={checkoutValidationModalOpen}
        title={
          checkoutValidationResult?.status === "BLOCKING"
            ? "Không thể đặt hàng"
            : "Có thay đổi trước khi đặt hàng"
        }
        onCancel={() => setCheckoutValidationModalOpen(false)}
        footer={
          checkoutValidationResult?.status === "BLOCKING"
            ? [
                <Button key="close" onClick={() => setCheckoutValidationModalOpen(false)}>
                  Đóng
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setCheckoutValidationModalOpen(false)}>
                  Hủy
                </Button>,
                <Button
                  key="confirm"
                  type="primary"
                  danger
                  loading={loading}
                  onClick={handleConfirmValidation}
                >
                  Xác nhận & Thanh toán
                </Button>,
              ]
        }
        width={560}
      >
        {checkoutValidationResult && (
          <div>
            {checkoutValidationResult.status === "BLOCKING" ? (
              <p style={{ color: "#dc2626", marginBottom: 12 }}>
                Đơn hàng không thể tiếp tục do các vấn đề nghiêm trọng sau:
              </p>
            ) : (
              <p style={{ marginBottom: 12 }}>
                Một số thông tin đã thay đổi. Vui lòng xem lại trước khi xác nhận:
              </p>
            )}

            <List
              size="small"
              dataSource={checkoutValidationResult.issues}
              renderItem={(issue) => (
                <List.Item style={{ padding: "6px 0" }}>
                  <Space align="start">
                    <Tag color={issue.severity === "BLOCKING" ? "error" : "warning"}>
                      {getIssueTypeLabel(issue.type)}
                    </Tag>
                    <span style={{ fontSize: 13 }}>{issue.message}</span>
                  </Space>
                </List.Item>
              )}
            />

            {checkoutValidationResult.status === "REQUIRES_CONFIRMATION" && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#fafafa",
                  borderRadius: 8,
                  border: "1px solid #f0f0f0",
                }}
              >
                <Row justify="space-between" style={{ marginBottom: 6 }}>
                  <Text type="secondary">Tạm tính (cũ → mới)</Text>
                  <Text>
                    {formatMoney(checkoutValidationResult.oldSubtotal)} →{" "}
                    <strong>{formatMoney(checkoutValidationResult.newSubtotal)}</strong>
                  </Text>
                </Row>
                {(checkoutValidationResult.oldDiscount > 0 ||
                  checkoutValidationResult.newDiscount > 0) && (
                  <Row justify="space-between" style={{ marginBottom: 6 }}>
                    <Text type="secondary">Giảm voucher (cũ → mới)</Text>
                    <Text>
                      -{formatMoney(checkoutValidationResult.oldDiscount)} →{" "}
                      <strong>-{formatMoney(checkoutValidationResult.newDiscount)}</strong>
                    </Text>
                  </Row>
                )}
                <Row justify="space-between" style={{ marginBottom: 6 }}>
                  <Text type="secondary">Phí vận chuyển (cũ → mới)</Text>
                  <Text>
                    {formatMoney(checkoutValidationResult.oldShippingFee)} →{" "}
                    <strong>{formatMoney(checkoutValidationResult.newShippingFee)}</strong>
                  </Text>
                </Row>
                <Divider style={{ margin: "8px 0" }} />
                <Row justify="space-between">
                  <Text strong>Tổng cộng (cũ → mới)</Text>
                  <Text strong style={{ color: "#dc2626" }}>
                    {formatMoney(checkoutValidationResult.oldTotal)} →{" "}
                    {formatMoney(checkoutValidationResult.newTotal)}
                  </Text>
                </Row>
              </div>
            )}
          </div>
        )}
      </Modal>

      <VoucherSelectorModal
        open={voucherPickerOpen}
        onClose={() => setVoucherPickerOpen(false)}
        subtotal={subtotalBeforeVoucher}
        shippingFee={shippingFee}
        finalTotal={total}
        vouchers={voucherOptions}
        selectedVoucherCode={appliedVoucher}
        loading={voucherApplying || quoteLoading}
        onApply={(voucher) => applyVoucherFromOption(voucher, true)}
        onRemove={appliedVoucher ? clearAppliedVoucher : undefined}
      />

      <Modal
        title="Chọn địa chỉ giao hàng"
        open={isAddressModalVisible}
        onCancel={() => setIsAddressModalVisible(false)}
        footer={null}
        width={640}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={() => {
              form.setFieldsValue({
                provinceId: undefined,
                provinceName: undefined,
                districtId: undefined,
                districtName: undefined,
                wardCode: undefined,
                wardName: undefined,
                address: undefined,
                note: undefined,
              });
              setDistricts([]);
              setWards([]);
              setShippingError("");
              setQuoteError("");
              setIsAddressModalVisible(false);
            }}
          >
            Nhập địa chỉ mới
          </Button>
        </div>

        {addresses.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            <Text type="secondary">Không có địa chỉ đã lưu</Text>
          </div>
        ) : (
          <List
            dataSource={addresses}
            renderItem={(address, index) => (
              <List.Item
                actions={[
                  getAddressKey(address) === defaultAddressKey ? (
                    <Tag key="default" color="blue">
                      Mặc định
                    </Tag>
                  ) : (
                    <Button
                      key="set-default"
                      type="link"
                      loading={selectingAddressIndex === index}
                      onClick={() => handleSetDefaultAddress(address, index)}
                    >
                      Đặt mặc định
                    </Button>
                  ),
                  <Button
                    key="select"
                    type="link"
                    loading={selectingAddressIndex === index}
                    onClick={() => handleAddressSelect(address, { index })}
                  >
                    Chọn
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={`${address.fullName} - ${address.phone}`}
                  description={`${address.address}, ${
                    address.wardName || address.ward || ""
                  }, ${address.districtName || address.district || ""}, ${
                    address.provinceName || address.province || ""
                  }`}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default CheckoutPage;
