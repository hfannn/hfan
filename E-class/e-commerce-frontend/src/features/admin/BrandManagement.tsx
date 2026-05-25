import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { brandService } from "@/services/brand.service";
import { Brand } from "../brand/brand.model";

export default function BrandManagementPage() {
  const [data, setData] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ name: string }>();

  const load = async () => {
    setLoading(true);
    try {
      const res = await brandService.getAll();
      setData(res.data);
    } catch (e: any) {
      message.error(e?.message || "Không tải được danh sách thương hiệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (row: Brand) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await brandService.update(editing.id, { name: values.name });
      } else {
        await brandService.create({ name: values.name });
      }
      message.success("Lưu thành công");
      setOpen(false);
      load();
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || e?.message || "Lỗi lưu dữ liệu",
      );
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "STT", key: "stt", width: 80, render: (_: any, __: any, index: number) => index + 1 },
    { title: "Tên thương hiệu", dataIndex: "name" },
    {
      title: "Kích hoạt",
      dataIndex: "isActive",
      width: 120,
      render: (_: any, row: Brand) => (
        <Switch
          checked={!!row.isActive}
          onChange={async (checked) => {
            try {
              await brandService.update(row.id, { isActive: checked });
              message.success("Cập nhật trạng thái thành công");
              load();
            } catch {
              message.error("Không cập nhật được trạng thái");
            }
          }}
        />
      ),
    },
    {
      title: "Thao tác",
      width: 220,
      render: (_: any, row: Brand) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(row)}>
            Sửa
          </Button>

          <Popconfirm
            title="Xoá thương hiệu này?"
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={async () => {
              try {
                await brandService.remove(row.id);
                message.success("Đã xoá");
                load();
              } catch {
                message.error("Không xoá được");
              }
            }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Xoá
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <Button type="primary" onClick={openCreate}>
          Thêm thương hiệu
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns as any}
      />

      <Modal
        open={open}
        title={editing ? "Cập nhật thương hiệu" : "Thêm thương hiệu"}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="Lưu"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên thương hiệu"
            rules={[
              { required: true, message: "Vui lòng nhập tên thương hiệu" },
            ]}
          >
            <Input placeholder="Ví dụ: Nike" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
