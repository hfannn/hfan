import { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Table, Row, Col, Spin } from 'antd';
import { productService } from '@/services/product.service';


interface ProductVariantAttributes {
  COLOR: string;
  SIZE: string;
  MATERIAL?: string;
}

interface ProductVariant {
  id: number;
  code: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  isActive: boolean;
  attributes: ProductVariantAttributes;
}

interface ProductDetail {
  id: number;
  code: string;
  name: string;
  description: string;
  brandName: string;
  categoryName: string;
  originName: string;
  isActive: boolean;
  deletedAt: string | null;
  variants: ProductVariant[];
  images: string[];
}


interface ProductBasicInfo {
  id: number;
  name: string;
}

const { TextArea } = Input;

interface CreateOrderModalProps {
  open: boolean;
  product: ProductBasicInfo | null; 
  onCancel: () => void;
  onSubmit: (values: any) => void;
}

const CreateOrderModal = ({ open, product, onCancel, onSubmit }: CreateOrderModalProps) => {
  const [form] = Form.useForm();
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product?.id) {
      setLoading(true);
      productService
        .getProductById(product.id) 
        .then(response => {
          const fetchedProduct: ProductDetail = response.data;
          if (fetchedProduct && fetchedProduct.variants) {
            const initialVariants = fetchedProduct.variants.map((variant: ProductVariant, index: number) => ({
              ...variant,
              key: variant.id || index, 
              order_quantity: 0, 
            }));
            setVariants(initialVariants);
            form.setFieldsValue({ variants: initialVariants });
          } else {
            setVariants([]);
          }
        })
        .catch(error => {
          console.error('Không thể tải chi tiết sản phẩm và biến thể:', error);
          setVariants([]);
        })
        .finally(() => setLoading(false));
    } else if (!open) {
      setVariants([]);
      form.resetFields();
    }
  }, [product?.id, open, form]);

  const handleApplyToAll = (value: number | null) => {
    if (value === null || value < 0) return;
    const updatedVariants = variants.map(v => ({ ...v, order_quantity: value }));
    setVariants(updatedVariants);
    form.setFieldsValue({ variants: updatedVariants });
  };

  const handleFormSubmit = () => {
    form.validateFields().then(values => {
      onSubmit({
        productId: product?.id,
        ...values
      });
      form.resetFields();
    }).catch(info => {
      console.error('Xác thực biểu mẫu thất bại:', info);
    });
  };

  const columns = [
    { title: 'SKU', dataIndex: 'code', key: 'code' }, 
    {
      title: 'Kích cỡ',
      dataIndex: ['attributes', 'SIZE'], 
      key: 'size',
      render: (text: string) => text, 
    },
    {
      title: 'Màu sắc',
      dataIndex: ['attributes', 'COLOR'], 
      key: 'color',
      render: (text: string) => text, 
    },
    {
      title: 'Chất liệu',
      dataIndex: ['attributes', 'MATERIAL'],
      key: 'material',
      render: (text: string) => text || '-',
    },
    {
      title: 'Tồn hiện tại',
      dataIndex: 'stockQuantity', 
      key: 'stockQuantity',
      align: 'center' as const
    },
    {
      title: 'Nhập số lượng',
      dataIndex: 'order_quantity',
      key: 'order_quantity',
      width: 150,
      render: (_: any, record: any, index: number) => (
        <Form.Item
          name={['variants', index, 'order_quantity']}
          style={{ margin: 0 }}
          rules={[{ type: 'number', min: 0, message: 'Số lượng không hợp lệ' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
  ];

  return (
    <Modal
      title={`Tạo phiếu kho cho sản phẩm: ${product?.name || ''}`}
      open={open}
      onCancel={onCancel}
      width={900} 
      destroyOnHidden 
      footer={[
        <Button key="back" onClick={onCancel}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" onClick={handleFormSubmit}>
          Gửi kho
        </Button>,
      ]}
    >
      <Spin spinning={loading}> 
        <Form form={form} layout="vertical">
          <Row gutter={16} align="bottom">
            <Col span={18}>
              <Form.Item name="notes" label="Ghi chú phiếu">
                <TextArea rows={1} placeholder="Thêm ghi chú cho phiếu nhập kho" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Áp dụng cho tất cả">
                <InputNumber min={0} placeholder="Số lượng" style={{ width: '100%' }} onChange={handleApplyToAll} />
              </Form.Item>
            </Col>
          </Row>
          <Table bordered dataSource={variants} columns={columns} pagination={false} rowKey="key" />
        </Form>
      </Spin>
    </Modal>
  );
};

export default CreateOrderModal;
