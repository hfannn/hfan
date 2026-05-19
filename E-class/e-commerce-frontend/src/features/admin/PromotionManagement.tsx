import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { productService } from "@/services/product.service";
import {
  Promotion,
  PromotionRequest,
  promotionService,
} from "@/services/promotion.service";
import { ProductList } from "@/features/product/product.model";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const getStatus = (record: Promotion) => {
  const now = dayjs();
  if (!record.status) return { label: "Đã tắt", color: "default" };
  if (dayjs(record.endDate).isBefore(now)) return { label: "Hết hạn", color: "red" };
  if (dayjs(record.startDate).isAfter(now)) return { label: "Sắp diễn ra", color: "blue" };
  return { label: "Đang hoạt động", color: "green" };
};

const PromotionManagementPage = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<ProductList[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [keyword, setKeyword] = useState("");
  const [form] = Form.useForm();

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await promotionService.getAll({ page: 0, size: 100 });
      setPromotions(res.data.content || []);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Không thể tải danh sách khuyến mãi");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const res = await productService.getProducts({ page: 0, size: 500 });
    setProducts(res.data.content || []);
  };

  useEffect(() => {
    fetchPromotions();
    fetchProducts().catch(() => message.error("Không thể tải danh sách sản phẩm"));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setSelectedProductIds([]);
    setKeyword("");
    form.resetFields();
    form.setFieldsValue({ status: true, discountPercent: 10 });
    setModalOpen(true);
  };

  const openEdit = async (record: Promotion) => {
    setEditing(record);
    setKeyword("");
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      discountPercent: Number(record.discountPercent),
      status: record.status,
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
    });
    try {
      const res = await promotionService.getAppliedIds(record.id);
      setSelectedProductIds(res.data.productIds || []);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Không thể tải sản phẩm đã áp dụng");
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload: PromotionRequest = {
      name: values.name,
      description: values.description,
      discountPercent: values.discountPercent,
      startDate: values.dateRange[0].toISOString(),
      endDate: values.dateRange[1].toISOString(),
      status: values.status ?? true,
      productIds: selectedProductIds,
    };

    try {
      if (editing) {
        await promotionService.update(editing.id, payload);
        message.success("Cập nhật đợt giảm giá thành công");
      } else {
        await promotionService.create(payload);
        message.success("Tạo đợt giảm giá thành công");
      }
      setModalOpen(false);
      fetchPromotions();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Không thể lưu đợt giảm giá");
    }
  };

  const handleDisable = async (id: number) => {
    try {
      await promotionService.delete(id);
      message.success("Đã tắt đợt giảm giá");
      fetchPromotions();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Không thể tắt đợt giảm giá");
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await promotionService.toggle(id);
      message.success("Đã đổi trạng thái đợt giảm giá");
      fetchPromotions();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Không thể đổi trạng thái");
    }
  };

  const filteredProducts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (item) =>
        item.name?.toLowerCase().includes(normalized) ||
        item.code?.toLowerCase().includes(normalized),
    );
  }, [keyword, products]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space style={{ justifyContent: "space-between", width: "100%" }}>
        <Title level={3} style={{ margin: 0 }}>
          Khuyến mãi sản phẩm
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPromotions}>
            Tải lại
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm đợt giảm giá
          </Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={promotions}
        columns={[
          { title: "STT", width: 70, render: (_: unknown, __: Promotion, index: number) => index + 1 },
          { title: "Tên chương trình", dataIndex: "name" },
          {
            title: "Số sản phẩm áp dụng",
            dataIndex: "productCount",
            width: 170,
            align: "center",
          },
          {
            title: "% giảm",
            dataIndex: "discountPercent",
            width: 110,
            align: "center",
            render: (value: number) => <Tag color="red">-{Number(value).toFixed(0)}%</Tag>,
          },
          {
            title: "Thời gian",
            width: 240,
            render: (_: unknown, record: Promotion) => (
              <Space direction="vertical" size={0}>
                <Text>{dayjs(record.startDate).format("DD/MM/YYYY HH:mm")}</Text>
                <Text type="secondary">{dayjs(record.endDate).format("DD/MM/YYYY HH:mm")}</Text>
              </Space>
            ),
          },
          {
            title: "Trạng thái",
            width: 150,
            render: (_: unknown, record: Promotion) => {
              const status = getStatus(record);
              return <Tag color={status.color}>{status.label}</Tag>;
            },
          },
          {
            title: "Thao tác",
            width: 190,
            render: (_: unknown, record: Promotion) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
                <Button onClick={() => handleToggle(record.id)}>
                  {record.status ? "Tắt" : "Bật"}
                </Button>
                <Popconfirm
                  title="Tắt đợt giảm giá?"
                  okText="Tắt"
                  cancelText="Hủy"
                  onConfirm={() => handleDisable(record.id)}
                >
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "Sửa đợt giảm giá" : "Thêm đợt giảm giá"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={820}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ status: true }}>
          <Form.Item name="name" label="Tên chương trình" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="large" align="start" wrap>
            <Form.Item
              name="discountPercent"
              label="Phần trăm giảm"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={100} addonAfter="%" />
            </Form.Item>
            <Form.Item
              name="dateRange"
              label="Thời gian bắt đầu/kết thúc"
              rules={[{ required: true }]}
            >
              <RangePicker showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item name="status" valuePropName="checked" label="Kích hoạt">
              <Checkbox />
            </Form.Item>
          </Space>

          <Space direction="vertical" style={{ width: "100%" }}>
            <Input.Search
              allowClear
              placeholder="Tìm sản phẩm theo tên hoặc mã"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid #edf1f7", borderRadius: 8, padding: 12 }}>
              <Checkbox.Group
                value={selectedProductIds}
                onChange={(values) => setSelectedProductIds(values as number[])}
                style={{ width: "100%" }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  {filteredProducts.map((product) => (
                    <Checkbox key={product.id} value={product.id}>
                      <Text strong>{product.name}</Text>{" "}
                      <Text type="secondary">({product.code})</Text>
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </div>
            <Text type="secondary">
              Đã chọn {selectedProductIds.length} sản phẩm. Áp dụng vào các biến thể đang bán của từng sản phẩm.
            </Text>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};

export default PromotionManagementPage;
