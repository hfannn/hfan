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
import { supplierService, type Supplier, type SupplierRequest } from "@/services/supplier.service";

const { Content } = Layout;
const { Title } = Typography;

type Mode = "create" | "edit";

const SupplierManagement = () => {
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<Supplier | null>(null);

  const [keyword, setKeyword] = useState("");
  const [form] = Form.useForm<SupplierRequest>();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getAll();
      setData(res.data ?? []);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Không tải được danh sách nhà cung cấp");
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

  const openEdit = (record: Supplier) => {
    setMode("edit");
    setEditing(record);
    form.setFieldsValue({
      code: record.code ?? "",
      name: record.name ?? "",
      phone: record.phone ?? "",
    });
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
      const payload: SupplierRequest = {
        code: (values.code ?? "").trim(),
        name: (values.name ?? "").trim(),
        phone: (values.phone ?? "").trim() || undefined,
      };

      if (!payload.name) {
        message.error("Tên nhà cung cấp không được để trống");
        return;
      }

      if (mode === "create") {
        await supplierService.create(payload);
      } else {
        if (!editing) return;
        await supplierService.update(editing.id, payload);
      }

      await fetchAll();
      message.success(mode === "create" ? "Thêm nhà cung cấp thành công" : "Cập nhật nhà cung cấp thành công");
      closeModal();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Có lỗi xảy ra");
    }
  };

  const onDisable = async (id: number) => {
    try {
      await supplierService.remove(id);
      message.success("Đã ngưng sử dụng nhà cung cấp");
      fetchAll();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Thao tác thất bại");
    }
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return data;
    return data.filter(
      (x) =>
        (x.name ?? "").toLowerCase().includes(k) ||
        (x.code ?? "").toLowerCase().includes(k) ||
        (x.phone ?? "").toLowerCase().includes(k),
    );
  }, [data, keyword]);

  const columns: ColumnsType<Supplier> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 60 },
      { title: "Mã NCC", dataIndex: "code", width: 120 },
      { title: "Tên nhà cung cấp", dataIndex: "name" },
      { title: "Số điện thoại", dataIndex: "phone", width: 140, render: (v: string) => v || "—" },
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
              title="Ngưng sử dụng nhà cung cấp này?"
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
    [],
  );

  return (
    <Content style={{ padding: 16 }}>
      <Title level={4} style={{ marginTop: 0 }}>
        Nhà cung cấp
      </Title>

      <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm nhà cung cấp
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchAll}>
            Tải lại
          </Button>
        </Space>
        <Input
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên, mã, SĐT..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          allowClear
        />
      </Space>

      <Table<Supplier>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "Chưa có nhà cung cấp nào" }}
      />

      <Modal
        open={open}
        onCancel={closeModal}
        onOk={onSubmit}
        okText={mode === "create" ? "Thêm" : "Cập nhật"}
        cancelText="Huỷ"
        title={mode === "create" ? "Thêm nhà cung cấp" : "Cập nhật nhà cung cấp"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Mã nhà cung cấp"
            name="code"
            rules={[
              { required: true, message: "Vui lòng nhập mã nhà cung cấp" },
              { whitespace: true, message: "Mã không được chỉ là khoảng trắng" },
              { max: 50, message: "Tối đa 50 ký tự" },
            ]}
          >
            <Input placeholder="Ví dụ: NCC001" style={{ textTransform: "uppercase" }} />
          </Form.Item>

          <Form.Item
            label="Tên nhà cung cấp"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên nhà cung cấp" },
              { whitespace: true, message: "Tên không được chỉ là khoảng trắng" },
            ]}
          >
            <Input placeholder="Ví dụ: Công ty TNHH ABC" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { max: 20, message: "Tối đa 20 ký tự" },
              {
                pattern: /^[0-9+\-\s()]*$/,
                message: "Số điện thoại không hợp lệ",
              },
            ]}
          >
            <Input placeholder="Ví dụ: 0901234567" />
          </Form.Item>
        </Form>
      </Modal>
    </Content>
  );
};

export default SupplierManagement;
