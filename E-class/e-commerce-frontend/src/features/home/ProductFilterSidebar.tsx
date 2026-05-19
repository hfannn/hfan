import { Checkbox, Slider, Space, Typography, Divider, Spin } from 'antd';
import { useEffect, useState } from 'react';

const { Title } = Typography;

const ProductFilterSidebar = () => {
  const [brands, setBrands] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilterData = async () => {
      setLoading(true);
      try {

        await new Promise(resolve => setTimeout(resolve, 1000)); 
        const mockData = {
          brands: ['Nike', 'Adidas', 'Jordan', 'Yeezy', 'Thương hiệu khác'],
          colors: ['Đen', 'Trắng', 'Đỏ', 'Xanh dương', 'Xanh lá', 'Vàng', 'Cam'],
          sizes: ['38', '39', '40', '41', '42', '43', '44', '45'],
        };
        setBrands(mockData.brands);
        setColors(mockData.colors);
        setSizes(mockData.sizes);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu bộ lọc:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
  }, []); 

  return (
    <div style={{ padding: '0 16px' }}>
      <Title level={4}>Bộ lọc</Title>
      <Divider />

      {loading ? (
        <Spin size="small" style={{ display: 'block', margin: '20px auto' }} />
      ) : (
        <>
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>Thương hiệu</Title>
        <Checkbox.Group>
          <Space direction="vertical">
            {brands.map((brand) => (
              <Checkbox key={brand} value={brand}>
                {brand}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </div>
      <Divider />

      <div style={{ marginBottom: 24 }}>
        <Title level={5}>Màu sắc</Title>
        <Checkbox.Group>
          <Space direction="vertical">
            {colors.map((color) => (
              <Checkbox key={color} value={color}>
                {color}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </div>
      <Divider />

      <div style={{ marginBottom: 24 }}>
        <Title level={5}>Kích cỡ</Title>
        <Checkbox.Group>
          <Space direction="vertical">
            {sizes.map((size) => (
              <Checkbox key={size} value={size}>
                {size}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </div>
      <Divider />

      <div style={{ marginBottom: 24 }}>
        <Title level={5}>Khoảng giá</Title>
        <Slider range defaultValue={[1000000, 5000000]} max={10000000} step={100000} />
      </div>
        </>
      )}
    </div>
  );
};

export default ProductFilterSidebar;
