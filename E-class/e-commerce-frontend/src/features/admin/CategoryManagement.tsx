import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { axiosClient } from "@/services/axiosClient";


type Category = {
  id: number;
  name: string;
  sizeChartUrl?: string | null;
  isActive: boolean;
};

export default function CategoryManagementPage() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ name: string; sizeChartUrl?: string }>();

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/v1/categories"); 
      setData(res.data);
    } catch (e: any) {
      message.error("Không tải được danh sách danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const onEdit = (row: Category) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      sizeChartUrl: row.sizeChartUrl ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await axiosClient.put(`/v1/categories/${editing.id}`, {
          name: values.name,
          sizeChartUrl: values.sizeChartUrl || null,
        });
      } else {
        await axiosClient.post("/v1/categories", {
          name: values.name,
          sizeChartUrl: values.sizeChartUrl || null,
        });
      }
      message.success("Lưu thành công");
      setOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Tên danh mục", dataIndex: "name" },
    {
      title: "Bảng kích cỡ",
      dataIndex: "sizeChartUrl",
      render: (v: string) =>
        v ? (
          <a href={v} target="_blank" rel="noreferrer">
            Xem
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: "Kích hoạt",
      dataIndex: "isActive",
      width: 120,
      render: (_: any, row: Category) => (
        <Switch
          checked={!!row.isActive}
          onChange={async (checked) => {
            try {
              await axiosClient.put(`/v1/categories/${row.id}`, { isActive: checked });
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
      render: (_: any, row: Category) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onEdit(row)}>
            Sửa
          </Button>

          <Popconfirm
            title="Xoá danh mục này?"
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={async () => {
              try {
                await axiosClient.delete(`/v1/categories/${row.id}`);
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          Thêm danh mục
        </Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={data} columns={columns as any} />

      <Modal
        open={open}
        title={editing ? "Cập nhật danh mục" : "Thêm danh mục"}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText="Lưu"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
          >
            <Input placeholder="Ví dụ: Giày Sneaker" />
          </Form.Item>

          <Form.Item name="sizeChartUrl" label="URL bảng kích cỡ (tuỳ chọn)">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
