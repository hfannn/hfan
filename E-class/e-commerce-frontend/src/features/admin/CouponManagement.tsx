import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, message, Popconfirm, Tooltip } from "antd";
import type { FormInstance, RuleObject } from "antd/es/form";
import { useState, useRef } from "react";
import type { ProColumns, ActionType } from "@ant-design/pro-table";
import ProTable from "@ant-design/pro-table";
import type { ProFormInstance } from "@ant-design/pro-form";
import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
  ProFormSwitch,
  ProFormDateTimePicker,
  ProFormDependency,
} from "@ant-design/pro-form";
import dayjs from "dayjs";
import { couponService, CouponRequest } from "@/services/coupon.service";

interface Coupon {
  id: number;
  code: string;
  name?: string;
  discountType: "PERCENTAGE" | "PERCENT" | "FIXED_AMOUNT" | "FIXED";
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit: number | null;
  usedCount?: number | null;
  remainingUses?: number | null;
  remainingUsage?: number | null;
  remainingCount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
}

const formatMoney = (value?: number | string | null) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const normalizeDateValue = (value: any) => {
  if (!value) {
    return undefined;
  }
  return typeof value?.toISOString === "function"
    ? value.toISOString()
    : new Date(value).toISOString();
};

const normalizeDiscountType = (value?: string) =>
  String(value || "").trim().toUpperCase();

const isPercentType = (value?: string) => {
  const type = normalizeDiscountType(value);
  return type === "PERCENTAGE" || type === "PERCENT";
};

const normalizeCouponCode = (value: string) =>
  String(value || "")
    .trim()
    .toUpperCase();

type CouponFormRuleFactory = (form: FormInstance) => RuleObject;

const CouponManagementPage = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const actionRef = useRef<ActionType>(null);
  const formRef = useRef<ProFormInstance>();

  const handleAdd = () => {
    setEditingCoupon(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Coupon) => {
    setEditingCoupon({
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : undefined,
      endDate: record.endDate ? dayjs(record.endDate) : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await couponService.delete(id);
      message.success("Vô hiệu hóa mã giảm giá thành công");
      actionRef.current?.reload();
    } catch (error) {
      message.error("Vô hiệu hóa thất bại");
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const discountType = normalizeDiscountType(values.discountType);
      const startDate = normalizeDateValue(values.startDate);
      const endDate = normalizeDateValue(values.endDate);

      if (startDate && endDate && dayjs(endDate).isBefore(dayjs(startDate))) {
        message.error("Thời gian kết thúc phải lớn hơn thời gian bắt đầu");
        return false;
      }

      if (values.isActive && endDate && dayjs(endDate).isBefore(dayjs())) {
        message.error("Không thể kích hoạt mã giảm giá đã hết hạn");
        return false;
      }

      const payload: CouponRequest = {
        ...values,
        code: normalizeCouponCode(values.code),
        discountType: discountType as CouponRequest["discountType"],
        minOrderValue: Number(values.minOrderValue || 0),
        maxDiscountAmount: isPercentType(discountType)
          ? Number(values.maxDiscountAmount || 0)
          : null,
        usageLimit: values.usageLimit ? Number(values.usageLimit) : undefined,
        startDate,
        endDate,
      };

      if (editingCoupon?.id) {
        await couponService.update(editingCoupon.id, payload);
        message.success("Cập nhật thành công");
      } else {
        await couponService.create(payload);
        message.success("Thêm mới thành công");
      }

      setModalVisible(false);
      setEditingCoupon(null);
      actionRef.current?.reload();
      return true;
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Đã có lỗi xảy ra");
      return false;
    }
  };

  const columns: ProColumns<Coupon>[] = [
    { title: "ID", dataIndex: "id", width: 64, search: false },
    { title: "Mã giảm giá", dataIndex: "code", copyable: true },
    {
      title: "Loại giảm",
      dataIndex: "discountType",
      align: "center",
      valueType: "select",
      valueEnum: {
        PERCENTAGE: { text: "Phần trăm (%)" },
        PERCENT: { text: "Phần trăm (%)" },
        FIXED_AMOUNT: { text: "Số tiền cố định" },
        FIXED: { text: "Số tiền cố định" },
      },
    },
    {
      title: "Giá trị giảm",
      dataIndex: "discountValue",
      search: false,
      align: "right",
      render: (_, record) =>
        isPercentType(record.discountType)
          ? `${record.discountValue}%`
          : formatMoney(record.discountValue),
    },
    {
      title: "Đơn tối thiểu",
      dataIndex: "minOrderValue",
      search: false,
      align: "right",
      render: (_, record) => formatMoney(record.minOrderValue),
    },
    {
      title: "Giảm tối đa",
      dataIndex: "maxDiscountAmount",
      search: false,
      align: "right",
      render: (_, record) =>
        record.maxDiscountAmount ? formatMoney(record.maxDiscountAmount) : "-",
    },
    {
      title: "Tổng lượt sử dụng",
      dataIndex: "usageLimit",
      align: "center",
      search: false,
      render: (_, record) => record.usageLimit ?? "Không giới hạn",
    },
    {
      title: "Đã sử dụng",
      dataIndex: "usedCount",
      align: "center",
      search: false,
      render: (_, record) => record.usedCount ?? 0,
    },
    {
      title: "Còn lại",
      dataIndex: "remainingCount",
      align: "center",
      search: false,
      render: (_, record) =>
        record.remainingUses ??
        record.remainingCount ??
        record.remainingUsage ??
        (record.usageLimit == null ? "Không giới hạn" : "-"),
    },
    {
      title: "Thời gian hiệu lực",
      search: false,
      render: (_, record) => {
        const start = record.startDate
          ? dayjs(record.startDate).format("DD/MM/YYYY HH:mm")
          : "Không giới hạn";
        const end = record.endDate
          ? dayjs(record.endDate).format("DD/MM/YYYY HH:mm")
          : "Không giới hạn";
        return `${start} - ${end}`;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      valueType: "select",
      valueEnum: {
        true: { text: "Hoạt động", status: "Success" },
        false: { text: "Không hoạt động", status: "Default" },
      },
    },
    {
      title: "Thao tác",
      valueType: "option",
      align: "center",
      render: (_, record) => [
        <Tooltip title="Sửa" key="edit">
          <Button
            icon={<EditOutlined />}
            shape="circle"
            onClick={() => handleEdit(record)}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="Vô hiệu hóa mã này?"
          onConfirm={() => handleDelete(record.id)}
          okText="Đồng ý"
          cancelText="Hủy"
        >
          <Tooltip title="Vô hiệu hóa">
            <Button icon={<DeleteOutlined />} shape="circle" danger />
          </Tooltip>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<Coupon>
        columns={columns}
        actionRef={actionRef}
        request={async (params) => {
          const response = await couponService.getAll({
            page: params.current ? params.current - 1 : 0,
            size: params.pageSize || 10,
            ...params,
          });
          return {
            data: response.data.content || [],
            success: true,
            total: response.data.totalElements || 0,
          };
        }}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        headerTitle="Quản lý mã giảm giá"
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Thêm mã giảm giá
          </Button>,
        ]}
      />
      <ModalForm
        formRef={formRef}
        title={editingCoupon ? "Cập nhật mã giảm giá" : "Thêm mã giảm giá mới"}
        width="620px"
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        initialValues={
          editingCoupon || {
            isActive: true,
            discountType: "FIXED_AMOUNT",
            minOrderValue: 0,
          }
        }
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setEditingCoupon(null),
        }}
      >
        <ProFormText
          name="code"
          label="Mã giảm giá"
          placeholder="Ví dụ: SALE10"
          fieldProps={{
            onChange: (event) => {
              formRef.current?.setFieldValue("code", normalizeCouponCode(event.target.value));
            },
          }}
          rules={[
            { required: true, message: "Vui lòng nhập mã giảm giá" },
            { min: 3, message: "Mã phải có ít nhất 3 ký tự" },
            {
              pattern: /^[A-Z0-9_-]+$/,
              message: "Mã chỉ gồm A-Z, 0-9, dấu gạch ngang hoặc gạch dưới",
            },
          ]}
        />
        <ProFormSelect
          name="discountType"
          label="Loại giảm giá"
          rules={[{ required: true, message: "Vui lòng chọn loại giảm giá" }]}
          options={[
            { label: "Số tiền cố định", value: "FIXED_AMOUNT" },
            { label: "Phần trăm (%)", value: "PERCENTAGE" },
          ]}
        />
        <ProFormDigit
          name="discountValue"
          label="Giá trị giảm"
          min={1}
          fieldProps={{ precision: 0 }}
          rules={[
            { required: true, message: "Vui lòng nhập giá trị giảm" },
            (({ getFieldValue }) => ({
              validator(_: RuleObject, value: number | undefined) {
                if (!value || Number(value) <= 0) {
                  return Promise.reject(new Error("Giá trị giảm phải lớn hơn 0"));
                }
                if (isPercentType(getFieldValue("discountType")) && Number(value) > 100) {
                  return Promise.reject(
                    new Error("Giảm theo phần trăm không được lớn hơn 100"),
                  );
                }
                return Promise.resolve();
              },
            })) as CouponFormRuleFactory,
          ]}
        />
        <ProFormDigit
          name="minOrderValue"
          label="Đơn tối thiểu"
          min={0}
          fieldProps={{ precision: 0 }}
          rules={[
            {
              validator(_: RuleObject, value: number | undefined) {
                if (value != null && Number(value) < 0) {
                  return Promise.reject(new Error("Đơn tối thiểu không được âm"));
                }
                return Promise.resolve();
              },
            },
          ]}
        />
        <ProFormDependency name={["discountType"]}>
          {({ discountType }) =>
            isPercentType(discountType) ? (
              <ProFormDigit
                name="maxDiscountAmount"
                label="Giảm tối đa"
                min={1}
                fieldProps={{ precision: 0 }}
                rules={[
                  { required: true, message: "Vui lòng nhập mức giảm tối đa" },
                  {
                    validator(_: RuleObject, value: number | undefined) {
                      if (!value || Number(value) <= 0) {
                        return Promise.reject(new Error("Mức giảm tối đa phải lớn hơn 0"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              />
            ) : null
          }
        </ProFormDependency>
        <ProFormDigit
          name="usageLimit"
          label="Tổng lượt sử dụng"
          tooltip="Tổng số lượt mã được sử dụng trên toàn hệ thống. Một khách hàng có thể dùng lại mã này nhiều lần nếu mã còn lượt."
          min={1}
          placeholder="Bỏ trống nếu không giới hạn"
          fieldProps={{ precision: 0 }}
          rules={[
            {
              validator(_: RuleObject, value: number | undefined) {
                if (value != null && Number(value) <= 0) {
                  return Promise.reject(new Error("Tổng lượt sử dụng phải lớn hơn 0"));
                }
                return Promise.resolve();
              },
            },
          ]}
        />
        <ProFormDateTimePicker
          name="startDate"
          label="Thời gian bắt đầu"
        />
        <ProFormDateTimePicker
          name="endDate"
          label="Thời gian kết thúc"
          rules={[
            (({ getFieldValue }) => ({
              validator(_: RuleObject, value: any) {
                const startDate = getFieldValue("startDate");
                if (startDate && value && dayjs(value).isBefore(dayjs(startDate))) {
                  return Promise.reject(
                    new Error("Thời gian kết thúc phải lớn hơn thời gian bắt đầu"),
                  );
                }
                if (getFieldValue("isActive") && value && dayjs(value).isBefore(dayjs())) {
                  return Promise.reject(
                    new Error("Không thể kích hoạt mã giảm giá đã hết hạn"),
                  );
                }
                return Promise.resolve();
              },
            })) as CouponFormRuleFactory,
          ]}
        />
        <ProFormSwitch name="isActive" label="Kích hoạt" />
      </ModalForm>
    </>
  );
};

export default CouponManagementPage;
