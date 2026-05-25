import {
  Button,
  Form,
  Input,
  Layout,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import type {
  AttributeValue,
  AttributeValueRequest,
} from "@/features/attribute/attributeValue.model";
import { attributeValueService } from "@/services/attributeValue.service";

const { Content } = Layout;
const { Title } = Typography;

type Mode = "create" | "edit";

type Props = {
  code: string;
  title: string; 
};

const AttributeValueManagement = ({ code, title }: Props) => {
  const safeTitle = title ?? "";
  const titleLower = safeTitle.toLowerCase();

  const [data, setData] = useState<AttributeValue[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<AttributeValue | null>(null);

  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form] = Form.useForm<AttributeValueRequest>();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await attributeValueService.getByCode(code);
      setData(res ?? []);
    } catch (e: any) {
      message.error(
        e?.response?.data?.message ?? `Không tải được danh sách ${safeTitle}`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

  }, [code]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (record: AttributeValue) => {
    setMode("edit");
    setEditing(record);
    form.setFieldsValue({ value: record.value ?? "" });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    form.resetFields();
    setEditing(null);
    setMode("create");
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: AttributeValueRequest = {
        value: (values.value ?? "").trim(),
      };

      if (!payload.value) {
        message.error("Giá trị không được để trống");
        return;
      }

      if (mode === "create") {
        await attributeValueService.createByCode(code, payload);
      } else {
        if (!editing) return;
        await attributeValueService.update(editing.id, payload);
      }

      await fetchAll(); 
      message.success(
        mode === "create"
          ? `Thêm ${titleLower} thành công`
          : `Cập nhật ${titleLower} thành công`,
      );
      closeModal();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Có lỗi xảy ra");
    }
  };

  const onDisable = async (id: number) => {
    try {
      await attributeValueService.disable(id);
      message.success("Đã ngưng sử dụng");
      fetchAll();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Thao tác thất bại");
    }
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return data;
    return data.filter((x) => (x.value ?? "").toLowerCase().includes(k));
  }, [data, keyword]);

  const columns: ColumnsType<AttributeValue> = useMemo(
    () => [
      { title: "STT", key: "stt", width: 80, render: (_: any, __: any, index: number) => (currentPage - 1) * 10 + index + 1 },
      { title: safeTitle, dataIndex: "value" },
      {
        title: "Hành động",
        key: "actions",
        width: 160,
        render: (_, record) => (
          <Space>
            <Tooltip title="Sửa">
              <Button
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              />
            </Tooltip>

            <Popconfirm
              title="Ngưng sử dụng mục này?"
              okText="Ngưng"
              cancelText="Huỷ"
              onConfirm={() => onDisable(record.id)}
            >
              <Tooltip title="Ngưng sử dụng">
                <Button danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [safeTitle, currentPage],
  );

  return (
    <Content style={{ padding: 16 }}>
      <Title level={4} style={{ marginTop: 0 }}>
        {safeTitle}
      </Title>

      <Space
        style={{
          marginBottom: 12,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm {titleLower}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchAll}>
            Tải lại
          </Button>
        </Space>

        <Input
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          placeholder={`Tìm ${titleLower}...`}
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setCurrentPage(1); }}
          allowClear
        />
      </Space>

      <Table<AttributeValue>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 10, current: currentPage, onChange: (p) => setCurrentPage(p) }}
      />

      <Modal
        open={open}
        onCancel={closeModal}
        onOk={onSubmit}
        okText={mode === "create" ? "Thêm" : "Cập nhật"}
        cancelText="Huỷ"
        title={
          mode === "create" ? `Thêm ${titleLower}` : `Cập nhật ${titleLower}`
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={safeTitle}
            name="value"
            rules={[
              { required: true, message: "Vui lòng nhập giá trị" },
              { max: 255, message: "Tối đa 255 ký tự" },
            ]}
          >
            <Input placeholder={`Nhập ${titleLower}...`} />
          </Form.Item>
        </Form>
      </Modal>
    </Content>
  );
};

export default AttributeValueManagement;
