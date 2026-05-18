import {
  Modal,
  Card,
  Table,
  Space,
  Button,
  Tag,
  Spin,
  Descriptions,
  Typography,
  Divider,
  Form,
  Row,
  Col,
  Select,
  Input,
  InputNumber,
  notification,
  Segmented,
} from "antd";
import { useState, useEffect, useMemo } from "react";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { productService } from "@/services/product.service";

export interface ProductVariantAttributes {
  [key: string]: string;
}

export interface Variant {
  id: number;
  code: string;
  costPrice: number;
  sellingPrice: number;
  originalPrice?: number;
  unitPrice?: number;
  salePrice?: number;
  discountPercent?: number;
  isSale?: boolean;
  promotionId?: number | null;
  promotionName?: string | null;
  stockQuantity: number;
  isActive: boolean;
  attributes: ProductVariantAttributes;
  images?: string[];
}

export interface ProductDetail {
  id: number;
  code: string;
  name: string;
  description: string;

  brandId?: number;
  brandName: string;

  categoryId?: number;
  categoryName: string;

  originId?: number;
  originName: string;

  supplierId?: number;
  supplierName?: string;

  isActive: boolean;
  variants: Variant[];
  images: string[];
}

interface VariantDetailModalProps {
  open: boolean;
  productId: number | null;
  onCancel: () => void;
  onEdit: (record: Variant) => void;
  onDelete: (id: number) => void;
  onAddVariant: (data: { productId: number; variants: any[] }) => Promise<void>;
  refreshKey?: number;
}

interface AttributeOption {
  label: string;
  value: string;
  id: number;
}

const UNIQUE_ATTRIBUTE_CODES = ["COLOR", "SIZE", "MATERIAL"];

const VariantDetailModal: React.FC<VariantDetailModalProps> = ({
  open,
  productId,
  onCancel,
  onEdit,
  onDelete,
  onAddVariant,
  refreshKey = 0,
}) => {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [addVariantForm] = Form.useForm();

  const [dynamicAttributes, setDynamicAttributes] = useState<any[]>([]);
  const [selectedBulkAttributes, setSelectedBulkAttributes] = useState<
    Record<string, string[]>
  >({});

  const [bulkCostPrice, setBulkCostPrice] = useState<number | null>(null);
  const [bulkSellingPrice, setBulkSellingPrice] = useState<number | null>(null);
  const [variantKeyword, setVariantKeyword] = useState("");
  const [variantStockStatus, setVariantStockStatus] = useState<
    "all" | "inStock" | "outOfStock"
  >("all");
  const [variantActiveStatus, setVariantActiveStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [duplicateRowIndexes, setDuplicateRowIndexes] = useState<number[]>([]);

  const fetchProductDetails = async () => {
    if (!productId) {
      return;
    }

    setLoading(true);

    try {
      const res = await productService.getProductById(productId, true);
      setProduct(res.data);
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể tải chi tiết sản phẩm.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributes = async () => {
    try {
      const res = await productService.getAttributes();
      const raw = Array.isArray(res.data) ? res.data : res.data?.content || [];
      setDynamicAttributes(raw);
    } catch (error) {
      console.error("Fetch attributes error:", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProductDetails();
      fetchAttributes();
    }
  }, [open, productId, refreshKey]);

  const generateSku = (attributes: Record<string, string>) => {
    const productCode = product?.code || "SP";

    const suffix = Object.values(attributes || {})
      .filter(Boolean)
      .map((v) =>
        String(v)
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ""),
      )
      .join("-");

    return `${productCode}-${suffix}`;
  };

  const buildAttributeValueIds = (attributes: Record<string, string>) => {
    const ids: number[] = [];

    Object.entries(attributes || {}).forEach(([attrCode, selectedValue]) => {
      const attr = dynamicAttributes.find((item: any) => item.code === attrCode);

      if (!attr) {
        return;
      }

      const foundValue = attr.values?.find(
        (v: any) => v.value === selectedValue || v.id === selectedValue,
      );

      if (foundValue?.id) {
        ids.push(foundValue.id);
      }
    });

    return ids;
  };

  const normalizeAttributeValue = (value: unknown) =>
    String(value ?? "").trim().toLowerCase();

  const findAttributeValueId = (attrCode: string, selectedValue: unknown) => {
    const attr = dynamicAttributes.find(
      (item: any) => String(item.code).toUpperCase() === attrCode,
    );

    const normalizedSelectedValue = normalizeAttributeValue(selectedValue);
    const foundValue = attr?.values?.find(
      (value: any) =>
        String(value.id) === String(selectedValue) ||
        normalizeAttributeValue(value.value) === normalizedSelectedValue ||
        normalizeAttributeValue(value.label) === normalizedSelectedValue,
    );

    return foundValue?.id ? String(foundValue.id) : normalizedSelectedValue;
  };

  const buildVariantKeyFromAttributes = (attributes?: Record<string, string>) => {
    const parts = UNIQUE_ATTRIBUTE_CODES.map((attrCode) =>
      findAttributeValueId(attrCode, attributes?.[attrCode]),
    );

    if (parts.some((part) => !part)) {
      return "";
    }

    return [productId, ...parts].join("-");
  };

  const formatVariantLabel = (attributes?: Record<string, string>) =>
    UNIQUE_ATTRIBUTE_CODES.map((attrCode) => attributes?.[attrCode])
      .filter(Boolean)
      .join(" / ");

  const existingVariantKeys = useMemo(() => {
    return new Set(
      (product?.variants || [])
        .map((variant) => buildVariantKeyFromAttributes(variant.attributes))
        .filter(Boolean),
    );
  }, [product?.variants, dynamicAttributes, productId]);

  const validateNewVariantRows = (rows: any[]) => {
    const seenNewKeys = new Set<string>();
    const duplicateIndexes: number[] = [];
    const existingDuplicates: string[] = [];
    const newDuplicates: string[] = [];

    rows.forEach((row, index) => {
      const key = buildVariantKeyFromAttributes(row?.attributes);

      if (!key) {
        return;
      }

      const label = formatVariantLabel(row?.attributes) || `Dòng ${index + 1}`;

      if (existingVariantKeys.has(key)) {
        duplicateIndexes.push(index);
        existingDuplicates.push(label);
        return;
      }

      if (seenNewKeys.has(key)) {
        duplicateIndexes.push(index);
        newDuplicates.push(`Dòng ${index + 1}: ${label}`);
        return;
      }

      seenNewKeys.add(key);
    });

    return {
      duplicateIndexes,
      existingDuplicates,
      newDuplicates,
    };
  };

  const handleGenerateVariants = () => {
    if (!dynamicAttributes.length) {
      return;
    }

    const entries = Object.entries(selectedBulkAttributes).filter(
      ([, values]) => values.length > 0,
    );

    if (entries.length === 0) {
      notification.warning({
        message: "Chưa chọn thuộc tính",
        description: "Vui lòng chọn ít nhất một thuộc tính để tạo biến thể.",
      });
      return;
    }

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
        [[]],
      );
    };

    const combinations = cartesian(entries.map(([, values]) => values));

    const currentRows = addVariantForm.getFieldValue("variants") || [];
    const currentKeys = new Set(
      currentRows
        .map((row: any) => buildVariantKeyFromAttributes(row?.attributes))
        .filter(Boolean),
    );
    let skippedExistingCount = 0;
    let skippedDuplicateCount = 0;

    const variants = combinations.flatMap((combination) => {
      const attributes: Record<string, string> = {};

      entries.forEach(([attrCode], index) => {
        attributes[attrCode] = combination[index];
      });

      const key = buildVariantKeyFromAttributes(attributes);

      if (key && existingVariantKeys.has(key)) {
        skippedExistingCount += 1;
        return [];
      }

      if (key && currentKeys.has(key)) {
        skippedDuplicateCount += 1;
        return [];
      }

      if (key) {
        currentKeys.add(key);
      }

      return [{
        sku: generateSku(attributes),
        attributes,
        costPrice: bulkCostPrice || 0,
        sellingPrice: bulkSellingPrice || 0,
        stockQuantity: 0,
      }];
    });

    addVariantForm.setFieldsValue({ variants: [...currentRows, ...variants] });
    setDuplicateRowIndexes([]);

    if (skippedExistingCount > 0) {
      notification.warning({
        message: "Đã bỏ qua biến thể trùng",
        description: `Đã bỏ qua ${skippedExistingCount} biến thể vì đã tồn tại.`,
      });
    }

    if (skippedDuplicateCount > 0) {
      notification.warning({
        message: "Đã bỏ qua dòng trùng",
        description: `Đã bỏ qua ${skippedDuplicateCount} biến thể vì trùng với danh sách thêm mới hiện tại.`,
      });
    }

    if (!variants.length) {
      notification.info({
        message: "Không có biến thể mới",
        description: "Các tổ hợp đã chọn đều đã tồn tại hoặc đang có trong danh sách thêm mới.",
      });
    }
  };

  const handleApplyBulkPrices = () => {
    const variants = addVariantForm.getFieldValue("variants") || [];

    const nextVariants = variants.map((item: any) => ({
      ...item,
      costPrice: bulkCostPrice ?? item.costPrice,
      sellingPrice: bulkSellingPrice ?? item.sellingPrice,
    }));

    addVariantForm.setFieldsValue({ variants: nextVariants });
  };

  const handleResetForm = () => {
    addVariantForm.resetFields();
    setSelectedBulkAttributes({});
    setBulkCostPrice(null);
    setBulkSellingPrice(null);
    setDuplicateRowIndexes([]);
  };

  const resetVariantFilters = () => {
    setVariantKeyword("");
    setVariantStockStatus("all");
    setVariantActiveStatus("all");
  };

  const filteredVariants = useMemo(() => {
    const keyword = variantKeyword.trim().toLowerCase();

    return (product?.variants || []).filter((variant) => {
      const attributeText = Object.entries(variant.attributes || {})
        .map(([key, value]) => `${key} ${value}`)
        .join(" ")
        .toLowerCase();

      const matchesKeyword =
        !keyword ||
        variant.code.toLowerCase().includes(keyword) ||
        attributeText.includes(keyword);

      const matchesStock =
        variantStockStatus === "all" ||
        (variantStockStatus === "inStock" && variant.stockQuantity > 0) ||
        (variantStockStatus === "outOfStock" && variant.stockQuantity <= 0);

      const matchesActive =
        variantActiveStatus === "all" ||
        (variantActiveStatus === "active" && variant.isActive) ||
        (variantActiveStatus === "inactive" && !variant.isActive);

      return matchesKeyword && matchesStock && matchesActive;
    });
  }, [product?.variants, variantKeyword, variantStockStatus, variantActiveStatus]);

  const handleAddVariantFinish = async (values: any) => {
    if (!productId) {
      return;
    }

    const rawVariants = values.variants || [];
    const duplicateResult = validateNewVariantRows(rawVariants);

    if (duplicateResult.duplicateIndexes.length > 0) {
      setDuplicateRowIndexes(duplicateResult.duplicateIndexes);

      if (duplicateResult.existingDuplicates.length === 1 && duplicateResult.newDuplicates.length === 0) {
        notification.error({
          message: "Biến thể đã tồn tại",
          description: `Biến thể ${duplicateResult.existingDuplicates[0]} đã tồn tại. Vui lòng sửa trực tiếp ở danh sách biến thể phía trên.`,
        });
        return;
      }

      notification.error({
        message: "Có biến thể bị trùng",
        description:
          duplicateResult.existingDuplicates.length > 0
            ? `Có ${duplicateResult.existingDuplicates.length} biến thể đã tồn tại, vui lòng kiểm tra lại trước khi lưu.`
            : "Có biến thể trùng trong danh sách thêm mới. Vui lòng kiểm tra lại.",
      });
      return;
    }

    setDuplicateRowIndexes([]);

    const variants = rawVariants.map((item: any) => ({
      code: item.sku,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      stockQuantity: item.stockQuantity || 0,
      attributeValueIds: buildAttributeValueIds(item.attributes),
    }));

    if (!variants.length) {
      notification.warning({
        message: "Chưa có biến thể",
        description: "Vui lòng thêm ít nhất một biến thể.",
      });
      return;
    }

    try {
      await onAddVariant({
        productId,
        variants,
      });

      handleResetForm();
      fetchProductDetails();
    } catch (error: any) {
      notification.error({
        message: "Không thể thêm biến thể",
        description:
          error?.response?.data?.message ||
          error?.response?.data ||
          "Vui lòng kiểm tra lại danh sách biến thể.",
      });
    }
  };

  const columns = [
    {
      title: "SKU",
      dataIndex: "code",
      key: "code",
      width: 180,
      fixed: "left" as const,
      render: (value: string) => (
        <Typography.Text strong copyable>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: "Thuộc tính",
      dataIndex: "attributes",
      key: "attributes",
      width: 260,
      render: (attrs: ProductVariantAttributes) => (
        <Space wrap size={[4, 4]}>
          {Object.entries(attrs || {}).map(([key, value]) => (
            <Tag key={key}>
              {key}: {value}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Giá nhập",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 130,
      align: "right" as const,
      render: (value: number) =>
        value != null ? `${Number(value).toLocaleString("vi-VN")} ₫` : "-",
    },
    {
      title: "Giá bán",
      dataIndex: "sellingPrice",
      key: "sellingPrice",
      width: 130,
      align: "right" as const,
      render: (value: number) =>
        value != null ? `${Number(value).toLocaleString("vi-VN")} ₫` : "-",
    },
    {
      title: "Tồn kho",
      dataIndex: "stockQuantity",
      key: "stockQuantity",
      width: 100,
      align: "center" as const,
      render: (value: number) => (
        <Tag color={value > 0 ? "green" : "red"}>{value || 0}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      align: "center" as const,
      render: (value: boolean) => (
        <Tag color={value ? "green" : "red"}>
          {value ? "Hoạt động" : "Ngừng bán"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 160,
      fixed: "right" as const,
      render: (_: any, record: Variant) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onEdit(record)}>
            Sửa
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record.id)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={`Chi tiết biến thể${product ? ` - ${product.name}` : ""}`}
      open={open}
      onCancel={onCancel}
      width={1200}
      footer={null}
      destroyOnHidden
      styles={{
        body: {
          maxHeight: "calc(100vh - 140px)",
          overflowY: "auto",
          paddingTop: 8,
        },
      }}
    >
      <Spin spinning={loading}>
        {product && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 1, md: 2 }}
              size="small"
              labelStyle={{ width: 150, color: "#667085" }}
            >
              <Descriptions.Item label="Mã sản phẩm">
                {product.code}
              </Descriptions.Item>

              <Descriptions.Item label="Thương hiệu">
                {product.brandName}
              </Descriptions.Item>

              <Descriptions.Item label="Danh mục">
                {product.categoryName}
              </Descriptions.Item>

              <Descriptions.Item label="Xuất xứ">
                {product.originName}
              </Descriptions.Item>

              <Descriptions.Item label="Nhà cung cấp">
                {product.supplierName || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái">
                <Tag color={product.isActive ? "green" : "red"}>
                  {product.isActive ? "Đang bán" : "Ngừng bán"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Mô tả" span={2}>
                {product.description || "-"}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginBottom: 0 }}>
              Các biến thể sản phẩm
            </Typography.Title>

            <Card size="small" style={{ borderRadius: 8 }}>
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} md={9}>
                  <Input.Search
                    allowClear
                    placeholder="Loc SKU, mau, size, chat lieu..."
                    value={variantKeyword}
                    onChange={(e) => setVariantKeyword(e.target.value)}
                    onSearch={(value) => setVariantKeyword(value)}
                  />
                </Col>

                <Col xs={24} md={6}>
                  <Segmented
                    block
                    value={variantStockStatus}
                    onChange={(value) =>
                      setVariantStockStatus(
                        value as "all" | "inStock" | "outOfStock",
                      )
                    }
                    options={[
                      { label: "Tat ca", value: "all" },
                      { label: "Con hang", value: "inStock" },
                      { label: "Het hang", value: "outOfStock" },
                    ]}
                  />
                </Col>

                <Col xs={24} md={6}>
                  <Segmented
                    block
                    value={variantActiveStatus}
                    onChange={(value) =>
                      setVariantActiveStatus(
                        value as "all" | "active" | "inactive",
                      )
                    }
                    options={[
                      { label: "Tat ca", value: "all" },
                      { label: "Dang ban", value: "active" },
                      { label: "Ngung", value: "inactive" },
                    ]}
                  />
                </Col>

                <Col xs={24} md={3}>
                  <Button block onClick={resetVariantFilters}>
                    Reset
                  </Button>
                </Col>
              </Row>
            </Card>

            <Table
              columns={columns}
              dataSource={filteredVariants}
              rowKey="id"
              bordered
              size="small"
              scroll={{ x: 1080 }}
              pagination={{
                pageSize: 8,
                showSizeChanger: false,
                showTotal: (total) => `Tong ${total} bien the`,
              }}
            />

            <Divider>Thêm biến thể mới</Divider>

            <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
              <Typography.Text>Tạo hàng loạt theo thuộc tính</Typography.Text>

              <Row gutter={[16, 16]} wrap>
                {dynamicAttributes.map((attr) => (
                  <Col flex="1 1 200px" key={attr.code}>
                    <Select
                      mode="multiple"
                      allowClear
                      style={{ width: "100%" }}
                      placeholder={`Chọn ${attr.name}`}
                      onChange={(values) =>
                        setSelectedBulkAttributes((prev) => ({
                          ...prev,
                          [attr.code]: values,
                        }))
                      }
                      options={(attr.values || []).map((v: AttributeOption) => ({
                        label: v.label || v.value,
                        value: v.value,
                      }))}
                    />
                  </Col>
                ))}

                <Col flex="1 1 160px">
                  <Button onClick={handleGenerateVariants} block>
                    Tạo hàng loạt
                  </Button>
                </Col>
              </Row>
            </Space>

            <Divider>Áp dụng hàng loạt cho các dòng bên dưới</Divider>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <InputNumber
                  placeholder="Giá nhập hàng loạt"
                  style={{ width: "100%" }}
                  min={0}
                  onChange={(value) =>
                    setBulkCostPrice(value === null ? null : Number(value))
                  }
                />
              </Col>

              <Col span={8}>
                <InputNumber
                  placeholder="Giá bán hàng loạt"
                  style={{ width: "100%" }}
                  min={0}
                  onChange={(value) =>
                    setBulkSellingPrice(value === null ? null : Number(value))
                  }
                />
              </Col>

              <Col span={8}>
                <Button onClick={handleApplyBulkPrices} block>
                  Áp dụng giá
                </Button>
              </Col>
            </Row>

            <Form
              form={addVariantForm}
              onFinish={handleAddVariantFinish}
              autoComplete="off"
              onValuesChange={(_, allValues) => {
                const variants = allValues.variants || [];
                setDuplicateRowIndexes([]);

                const nextVariants = variants.map((item: any) => {
                  if (!item?.attributes) {
                    return item;
                  }

                  return {
                    ...item,
                    sku: generateSku(item.attributes),
                  };
                });

                addVariantForm.setFieldsValue({ variants: nextVariants });
              }}
            >
              <Row gutter={8} style={{ marginBottom: 8, padding: "0 8px" }}>
                <Col span={4}>
                  <Typography.Text strong>SKU</Typography.Text>
                </Col>

                {dynamicAttributes.map((attr) => (
                  <Col span={3} key={attr.code}>
                    <Typography.Text strong>{attr.name}</Typography.Text>
                  </Col>
                ))}

                <Col span={3}>
                  <Typography.Text strong>Giá nhập</Typography.Text>
                </Col>

                <Col span={3}>
                  <Typography.Text strong>Giá bán</Typography.Text>
                </Col>

                <Col span={3}>
                  <Typography.Text strong>Tồn kho</Typography.Text>
                </Col>

                <Col span={2}>
                  <Typography.Text strong>Xóa</Typography.Text>
                </Col>
              </Row>

              <Form.List name="variants">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row
                        key={key}
                        gutter={8}
                        align="middle"
                        style={{
                          marginBottom: 8,
                          padding: duplicateRowIndexes.includes(name) ? 8 : 0,
                          border: duplicateRowIndexes.includes(name)
                            ? "1px solid #ff4d4f"
                            : "1px solid transparent",
                          background: duplicateRowIndexes.includes(name)
                            ? "#fff1f0"
                            : "transparent",
                          borderRadius: 6,
                        }}
                      >
                        <Col span={4}>
                          <Form.Item {...restField} name={[name, "sku"]} noStyle>
                            <Input placeholder="SKU" disabled />
                          </Form.Item>
                        </Col>

                        {dynamicAttributes.map((attr) => (
                          <Col span={3} key={attr.code}>
                            <Form.Item
                              {...restField}
                              name={[name, "attributes", attr.code]}
                              rules={[{ required: true, message: "Chọn" }]}
                              noStyle
                            >
                              <Select
                                placeholder={attr.name}
                                style={{ width: "100%" }}
                                options={(attr.values || []).map((v: any) => ({
                                  label: v.value,
                                  value: v.value,
                                }))}
                              />
                            </Form.Item>
                          </Col>
                        ))}

                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, "costPrice"]}
                            rules={[{ required: true, message: "Nhập" }]}
                            noStyle
                          >
                            <InputNumber
                              placeholder="Giá nhập"
                              style={{ width: "100%" }}
                              min={0}
                            />
                          </Form.Item>
                        </Col>

                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, "sellingPrice"]}
                            rules={[{ required: true, message: "Nhập" }]}
                            noStyle
                          >
                            <InputNumber
                              placeholder="Giá bán"
                              style={{ width: "100%" }}
                              min={0}
                            />
                          </Form.Item>
                        </Col>

                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, "stockQuantity"]}
                            rules={[{ required: true, message: "Nhập" }]}
                            noStyle
                          >
                            <InputNumber
                              placeholder="Tồn kho"
                              min={0}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                        </Col>

                        <Col span={2}>
                          <Button
                            icon={<DeleteOutlined />}
                            danger
                            onClick={() => remove(name)}
                          />
                        </Col>
                      </Row>
                    ))}

                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add({ stockQuantity: 0 })}
                        block
                        icon={<PlusOutlined />}
                      >
                        Thêm dòng biến thể thủ công
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    Lưu các biến thể
                  </Button>

                  <Button onClick={handleResetForm}>Làm mới</Button>
                </Space>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Spin>
    </Modal>
  );
};

export default VariantDetailModal;
