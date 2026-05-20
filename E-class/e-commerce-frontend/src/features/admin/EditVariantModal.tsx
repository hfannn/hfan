import { Modal, Form, Input, InputNumber, Switch, Select, notification } from "antd";
import { useEffect } from "react";
import { ProductVariantUpdatePayload } from "@/services/product.service";

export interface Variant {
  id: number;
  code: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  isActive: boolean;
  attributes?: Record<string, string>;
}

interface AttributeOption {
  label: string;
  value: string;
  id: number;
}

interface EditVariantModalProps {
  open: boolean;
  variant: Variant | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSave: (variantId: number, values: ProductVariantUpdatePayload) => Promise<void> | void;
  colorOptions?: AttributeOption[];
  sizeOptions?: AttributeOption[];
  otherVariants?: Array<{ id: number; attributes?: Record<string, string> }>;
}

const EditVariantModal: React.FC<EditVariantModalProps> = ({
  open,
  variant,
  confirmLoading = false,
  onCancel,
  onSave,
  colorOptions = [],
  sizeOptions = [],
  otherVariants = [],
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open || !variant) {
      return;
    }

    form.setFieldsValue({
      color: variant.attributes?.COLOR,
      size: variant.attributes?.SIZE,
      code: variant.code,
      costPrice: variant.costPrice,
      sellingPrice: variant.sellingPrice,
      stockQuantity: variant.stockQuantity,
      isActive: variant.isActive,
    });
  }, [open, variant, form]);

  const handleSave = async () => {
    const values = await form.validateFields();

    if (!variant) {
      return;
    }

    const attributeValueIds: number[] = [];

    if (values.color && colorOptions.length > 0) {
      const colorOpt = colorOptions.find((o) => o.value === values.color);
      if (colorOpt) attributeValueIds.push(colorOpt.id);
    }

    if (values.size && sizeOptions.length > 0) {
      const sizeOpt = sizeOptions.find((o) => o.value === values.size);
      if (sizeOpt) attributeValueIds.push(sizeOpt.id);
    }

    if (otherVariants.length > 0 && values.color && values.size) {
      const duplicate = otherVariants.find(
        (v) =>
          v.id !== variant.id &&
          v.attributes?.COLOR === values.color &&
          v.attributes?.SIZE === values.size,
      );

      if (duplicate) {
        notification.error({
          message: "Biến thể bị trùng",
          description: `Đã tồn tại biến thể với màu ${values.color} và kích cỡ ${values.size}.`,
        });
        return;
      }
    }

    await onSave(variant.id, {
      code: values.code,
      costPrice: values.costPrice,
      sellingPrice: values.sellingPrice,
      stockQuantity: values.stockQuantity,
      isActive: values.isActive,
      attributeValueIds: attributeValueIds.length > 0 ? attributeValueIds : undefined,
    });

    form.resetFields();
  };

  return (
    <Modal
      title="Chỉnh sửa biến thể"
      open={open}
      onCancel={onCancel}
      onOk={handleSave}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText="Lưu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical">
        {colorOptions.length > 0 && (
          <Form.Item
            name="color"
            label="Màu sắc"
            rules={[{ required: true, message: "Vui lòng chọn màu sắc" }]}
          >
            <Select
              placeholder="Chọn màu sắc"
              options={colorOptions.map((o) => ({ label: o.label, value: o.value }))}
            />
          </Form.Item>
        )}

        {sizeOptions.length > 0 && (
          <Form.Item
            name="size"
            label="Kích cỡ"
            rules={[{ required: true, message: "Vui lòng chọn kích cỡ" }]}
          >
            <Select
              placeholder="Chọn kích cỡ"
              options={sizeOptions.map((o) => ({ label: o.label, value: o.value }))}
            />
          </Form.Item>
        )}

        <Form.Item
          name="code"
          label="SKU / Mã biến thể"
          rules={[{ required: true, message: "Vui lòng nhập mã biến thể" }]}
        >
          <Input placeholder="VD: NIKE-AF1-TRANG-42" />
        </Form.Item>

        <Form.Item
          name="costPrice"
          label="Giá nhập"
          rules={[{ required: true, message: "Vui lòng nhập giá nhập" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => Number((value || "").replace(/,/g, "")) as any}
          />
        </Form.Item>

        <Form.Item
          name="sellingPrice"
          label="Giá bán"
          rules={[{ required: true, message: "Vui lòng nhập giá bán" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => Number((value || "").replace(/,/g, "")) as any}
          />
        </Form.Item>

        <Form.Item
          name="stockQuantity"
          label="Tồn kho"
          rules={[{ required: true, message: "Vui lòng nhập tồn kho" }]}
        >
          <InputNumber style={{ width: "100%" }} min={0} precision={0} />
        </Form.Item>

        <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
          <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng bán" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditVariantModal;
