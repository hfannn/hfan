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
import { originService, type Origin, type OriginRequest } from "@/services/origin.service";

const { Content } = Layout;
const { Title } = Typography;

type Mode = "create" | "edit";

const OriginManagement = () => {
  const [data, setData] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<Origin | null>(null);

  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form] = Form.useForm<OriginRequest>();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await originService.getAll();
      setData(res.data ?? []);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Không tải được danh sách xuất xứ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (record: Origin) => {
    setMode("edit");
    setEditing(record);
    form.setFieldsValue({ name: record.name ?? "" });
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
      const payload: OriginRequest = { name: (values.name ?? "").trim() };

      if (!payload.name) {
        message.error("Tên xuất xứ không được để trống");
        return;
      }

      if (mode === "create") {
        await originService.create(payload);
      } else {
        if (!editing) return;
        await originService.update(editing.id, payload);
      }

      await fetchAll();
      message.success(mode === "create" ? "Thêm xuất xứ thành công" : "Cập nhật xuất xứ thành công");
      closeModal();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Có lỗi xảy ra");
    }
  };

  const onDisable = async (id: number) => {
    try {
      await originService.remove(id);
      message.success("Đã ngưng sử dụng xuất xứ");
      fetchAll();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Thao tác thất bại");
    }
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return data;
    return data.filter((x) => (x.name ?? "").toLowerCase().includes(k));
  }, [data, keyword]);

  const columns: ColumnsType<Origin> = useMemo(
    () => [
      { title: "STT", key: "stt", width: 80, render: (_: any, __: any, index: number) => (currentPage - 1) * 10 + index + 1 },
      { title: "Tên xuất xứ", dataIndex: "name" },
      {
        title: "Hành động",
        key: "actions",
        width: 160,
        render: (_, record) => (
          <Space>
            <Tooltip title="Sửa">
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
            <Popconfirm
              title="Ngưng sử dụng xuất xứ này?"
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
    [currentPage],
  );

  return (
    <Content style={{ padding: 16 }}>
      <Title level={4} style={{ marginTop: 0 }}>
        Xuất xứ
      </Title>

      <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm xuất xứ
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchAll}>
            Tải lại
          </Button>
        </Space>
        <Input
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          placeholder="Tìm xuất xứ..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setCurrentPage(1); }}
          allowClear
        />
      </Space>

      <Table<Origin>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 10, current: currentPage, onChange: (p) => setCurrentPage(p) }}
        locale={{ emptyText: "Chưa có xuất xứ nào" }}
      />

      <Modal
        open={open}
        onCancel={closeModal}
        onOk={onSubmit}
        okText={mode === "create" ? "Thêm" : "Cập nhật"}
        cancelText="Huỷ"
        title={mode === "create" ? "Thêm xuất xứ" : "Cập nhật xuất xứ"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên xuất xứ"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên xuất xứ" },
              { whitespace: true, message: "Tên không được chỉ là khoảng trắng" },
              { max: 255, message: "Tối đa 255 ký tự" },
            ]}
          >
            <Input placeholder="Ví dụ: Việt Nam, Trung Quốc..." />
          </Form.Item>
        </Form>
      </Modal>
    </Content>
  );
};

export default OriginManagement;
