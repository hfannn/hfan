import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, message, Popconfirm, Tooltip } from "antd";
import type { FormInstance, RuleObject } from "antd/es/form";
import { useState, useRef } from "react";
import type { ProColumns, ActionType } from "@ant-design/pro-table";
import ProTable from "@ant-design/pro-table";
import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
  ProFormSwitch,
  ProFormDateTimePicker,
} from "@ant-design/pro-form";
import dayjs from "dayjs";
import { couponService, CouponRequest } from "@/services/coupon.service";

interface Coupon {
  id: number;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit: number | null;
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

type CouponFormRuleFactory = (form: FormInstance) => RuleObject;

const CouponManagementPage = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const actionRef = useRef<ActionType>(null);

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
      const payload: CouponRequest = {
        ...values,
        code: values.code.trim().toUpperCase(),
        minOrderValue: Number(values.minOrderValue || 0),
        maxDiscountAmount: values.maxDiscountAmount ?? undefined,
        startDate: normalizeDateValue(values.startDate),
        endDate: normalizeDateValue(values.endDate),
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
        FIXED_AMOUNT: { text: "Số tiền cố định" },
      },
    },
    {
      title: "Giá trị giảm",
      dataIndex: "discountValue",
      search: false,
      align: "right",
      render: (_, record) =>
        record.discountType === "PERCENTAGE"
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
      title: "Lượt còn lại",
      dataIndex: "remainingCount",
      align: "center",
      search: false,
      render: (_, record) =>
        record.remainingCount ?? record.remainingUsage ?? record.usageLimit ?? "-",
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
        headerTitle="Quản lý mã giảm giá (Coupon)"
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
        title={editingCoupon ? "Cập nhật mã giảm giá" : "Thêm mã giảm giá mới"}
        width="620px"
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        initialValues={
          editingCoupon || {
            isActive: true,
            discountType: "FIXED_AMOUNT",
            usageLimit: 1,
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
          rules={[
            { required: true, message: "Vui lòng nhập mã giảm giá" },
            { min: 3, message: "Mã phải có ít nhất 3 ký tự" },
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
                if (
                  getFieldValue("discountType") === "PERCENTAGE" &&
                  Number(value) > 100
                ) {
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
        />
        <ProFormDigit
          name="maxDiscountAmount"
          label="Giảm tối đa"
          min={1}
          fieldProps={{ precision: 0 }}
          rules={[
            (({ getFieldValue }) => ({
              validator(_: RuleObject, value: number | undefined) {
                if (getFieldValue("discountType") === "PERCENTAGE" && !value) {
                  return Promise.reject(
                    new Error("Coupon phần trăm phải có mức giảm tối đa"),
                  );
                }
                return Promise.resolve();
              },
            })) as CouponFormRuleFactory,
          ]}
        />
        <ProFormDigit
          name="usageLimit"
          label="Giới hạn lượt sử dụng"
          min={1}
          fieldProps={{ precision: 0 }}
          rules={[
            { required: true, message: "Vui lòng nhập giới hạn sử dụng" },
          ]}
        />
        <ProFormDateTimePicker name="startDate" label="Thời gian bắt đầu" />
        <ProFormDateTimePicker name="endDate" label="Thời gian kết thúc" />
        <ProFormSwitch name="isActive" label="Kích hoạt" />
      </ModalForm>
    </>
  );
};

export default CouponManagementPage;
