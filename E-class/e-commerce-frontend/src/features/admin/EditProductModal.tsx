import { Form, Input, Modal, Select, Spin, Switch } from "antd";
import { useEffect, useState } from "react";
import { productService, ProductUpdatePayload } from "@/services/product.service";

const { TextArea } = Input;

interface EditProductModalProps {
  open: boolean;
  productId: number | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSave: (productId: number, values: ProductUpdatePayload) => Promise<void> | void;
}

interface SelectOption {
  label: string;
  value: number;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  open,
  productId,
  confirmLoading = false,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [origins, setOrigins] = useState<SelectOption[]>([]);
  const [suppliers, setSuppliers] = useState<SelectOption[]>([]);
  const [materials, setMaterials] = useState<SelectOption[]>([]);

  const formatOptions = (raw: any): SelectOption[] => {
    let list: any[] = [];

    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw?.content && Array.isArray(raw.content)) {
      list = raw.content;
    } else if (raw?.data && Array.isArray(raw.data)) {
      list = raw.data;
    } else if (raw?.data?.content && Array.isArray(raw.data.content)) {
      list = raw.data.content;
    }

    return list.map((item: any) => ({
      label: item.name || item.value || item.label || item.code,
      value: item.id,
    }));
  };

  const findOptionByLabel = (options: SelectOption[], label?: string | null) => {
    if (!label) {
      return undefined;
    }

    return options.find((item) => item.label === label)?.value;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!open || !productId) {
        return;
      }

      setLoading(true);

      try {
        const [brandRes, categoryRes, originRes, supplierRes, materialRes, detailRes] =
          await Promise.all([
            productService.getBrands(),
            productService.getCategories(),
            productService.getOrigins(),
            productService.getSuppliers(),
            productService.getMaterials(),
            productService.getProductById(productId, true),
          ]);

        const brandOptions = formatOptions(brandRes.data);
        const categoryOptions = formatOptions(categoryRes.data);
        const originOptions = formatOptions(originRes.data);
        const supplierOptions = formatOptions(supplierRes.data);
        const materialOptions = formatOptions(materialRes.data);

        setBrands(brandOptions);
        setCategories(categoryOptions);
        setOrigins(originOptions);
        setSuppliers(supplierOptions);
        setMaterials(materialOptions);

        const product = detailRes.data;

        form.setFieldsValue({
          name: product.name || "",
          code: product.code || "",
          description: product.description || "",

          brandId:
            product.brandId ??
            findOptionByLabel(brandOptions, product.brandName),

          categoryId:
            product.categoryId ??
            findOptionByLabel(categoryOptions, product.categoryName),

          originId:
            product.originId ??
            findOptionByLabel(originOptions, product.originName),

          supplierId:
            product.supplierId ??
            findOptionByLabel(supplierOptions, product.supplierName),

          materialId: product.materialId ?? null,

          isActive: product.isActive !== false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, productId, form]);

  const handleSave = async () => {
    const values = await form.validateFields();

    if (!productId) {
      return;
    }

    await onSave(productId, {
      name: values.name,
      code: values.code || null,
      description: values.description || "",
      brandId: values.brandId,
      categoryId: values.categoryId,
      originId: values.originId,
      supplierId: values.supplierId,
      materialId: values.materialId ?? null,
      isActive: values.isActive,
    });
  };

  return (
    <Modal
      title="Chỉnh sửa sản phẩm"
      open={open}
      onCancel={onCancel}
      onOk={handleSave}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText="Lưu"
      cancelText="Hủy"
      width={720}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
          >
            <Input placeholder="Nhập tên sản phẩm" />
          </Form.Item>

          <Form.Item name="code" label="Mã sản phẩm">
            <Input placeholder="VD: NIKE-AF1" />
          </Form.Item>

          <Form.Item
            name="brandId"
            label="Thương hiệu"
            rules={[{ required: true, message: "Vui lòng chọn thương hiệu" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={brands}
              placeholder="Chọn thương hiệu"
            />
          </Form.Item>

          <Form.Item
            name="categoryId"
            label="Danh mục"
            rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={categories}
              placeholder="Chọn danh mục"
            />
          </Form.Item>

          <Form.Item
            name="originId"
            label="Xuất xứ"
            rules={[{ required: true, message: "Vui lòng chọn xuất xứ" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={origins}
              placeholder="Chọn xuất xứ"
            />
          </Form.Item>

          <Form.Item
            name="supplierId"
            label="Nhà cung cấp"
            rules={[{ required: true, message: "Vui lòng chọn nhà cung cấp" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={suppliers}
              placeholder="Chọn nhà cung cấp"
            />
          </Form.Item>

          <Form.Item name="materialId" label="Chất liệu">
            <Select
              showSearch
              optionFilterProp="label"
              options={materials}
              placeholder="Chọn chất liệu"
              allowClear
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={4} placeholder="Nhập mô tả sản phẩm" />
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng bán" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default EditProductModal;