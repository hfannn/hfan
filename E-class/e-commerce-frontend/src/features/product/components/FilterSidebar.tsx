import { Button, Checkbox, Divider, InputNumber, Radio, Slider, Space, Typography } from "antd";
import { ClearOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

export interface ProductFilters {
  categoryId?: number | null;
  brandId?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  discountMin?: number | null;
  discountMax?: number | null;
}

interface Option {
  id?: number | string;
  value?: string;
  name?: string;
  label?: string;
}

interface FilterSidebarProps {
  filters: ProductFilters;
  categories: Option[];
  brands: Option[];
  sizes?: Option[];
  colors?: Option[];
  materials?: Option[];
  saleMode?: boolean;
  onChange: (patch: Partial<ProductFilters>) => void;
  onReset: () => void;
}

const getValue = (option: Option) => String(option.value ?? option.id ?? option.name ?? "");
const getLabel = (option: Option) => String(option.label ?? option.name ?? option.value ?? option.id ?? "");

const FilterSidebar = ({
  filters,
  categories,
  brands,
  sizes = [],
  colors = [],
  materials = [],
  saleMode = false,
  onChange,
  onReset,
}: FilterSidebarProps) => {
  const priceMin = Number(filters.minPrice ?? 100000);
  const priceMax = Number(filters.maxPrice ?? 2000000);

  return (
    <aside className="filter-sidebar">
      <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
        <Title level={5}>Bộ lọc</Title>
        <Button type="text" icon={<ClearOutlined />} onClick={onReset}>
          Xóa
        </Button>
      </Space>

      <Divider />
      <Title level={5}>Danh mục</Title>
      <Radio.Group
        value={filters.categoryId ?? "all"}
        onChange={(event) =>
          onChange({ categoryId: event.target.value === "all" ? null : Number(event.target.value) })
        }
      >
        <Space direction="vertical">
          <Radio value="all">Tất cả</Radio>
          {categories.map((item) => (
            <Radio key={String(item.id)} value={item.id}>
              {item.name}
            </Radio>
          ))}
        </Space>
      </Radio.Group>

      <Divider />
      <Title level={5}>Thương hiệu</Title>
      <Checkbox.Group
        value={filters.brandId ? [filters.brandId] : []}
        onChange={(values) => onChange({ brandId: values[0] ? Number(values[0]) : null })}
      >
        <Space direction="vertical">
          {brands.map((item) => (
            <Checkbox key={String(item.id)} value={item.id}>
              {item.name}
            </Checkbox>
          ))}
        </Space>
      </Checkbox.Group>

      {saleMode && (
        <>
          <Divider />
          <Title level={5}>Mức giảm</Title>
          <Checkbox.Group
            value={filters.discountMin != null ? [`${filters.discountMin}-${filters.discountMax ?? ""}`] : []}
            onChange={(values) => {
              const raw = String(values[values.length - 1] ?? "");
              const [min, max] = raw.split("-");
              onChange({
                discountMin: min ? Number(min) : null,
                discountMax: max ? Number(max) : null,
              });
            }}
          >
            <Space direction="vertical">
              <Checkbox value="10-20">10% - 20%</Checkbox>
              <Checkbox value="20-40">20% - 40%</Checkbox>
              <Checkbox value="40-50">40% - 50%</Checkbox>
              <Checkbox value="50-">Trên 50%</Checkbox>
            </Space>
          </Checkbox.Group>
        </>
      )}

      <Divider />
      <Title level={5}>{saleMode ? "Giá sau giảm" : "Khoảng giá"}</Title>
      <Space.Compact style={{ width: "100%", marginBottom: 12 }}>
        <InputNumber
          min={0}
          placeholder="Từ"
          value={filters.minPrice ?? undefined}
          formatter={(value) => `${value ?? ""}`}
          onChange={(value) => onChange({ minPrice: Number(value || 0) || null })}
          style={{ width: "50%" }}
        />
        <InputNumber
          min={0}
          placeholder="Đến"
          value={filters.maxPrice ?? undefined}
          formatter={(value) => `${value ?? ""}`}
          onChange={(value) => onChange({ maxPrice: Number(value || 0) || null })}
          style={{ width: "50%" }}
        />
      </Space.Compact>
      <Slider
        range
        min={100000}
        max={3000000}
        step={50000}
        value={[priceMin, priceMax]}
        onChange={([min, max]) => onChange({ minPrice: min, maxPrice: max })}
      />
      <Space style={{ justifyContent: "space-between", width: "100%" }}>
        <Text type="secondary">100.000 đ</Text>
        <Text type="secondary">3.000.000 đ</Text>
      </Space>

      <Divider />
      <Title level={5}>Kích cỡ</Title>
      <div className="filter-chip-group">
        {sizes.map((item) => {
          const value = getValue(item);
          return (
            <Button
              key={value}
              size="small"
              type={filters.size === value ? "primary" : "default"}
              onClick={() => onChange({ size: filters.size === value ? null : value })}
            >
              {getLabel(item)}
            </Button>
          );
        })}
      </div>

      <Divider />
      <Title level={5}>Màu sắc</Title>
      <div className="filter-chip-group">
        {colors.map((item) => {
          const value = getValue(item);
          return (
            <Button
              key={value}
              size="small"
              type={filters.color === value ? "primary" : "default"}
              onClick={() => onChange({ color: filters.color === value ? null : value })}
            >
              {getLabel(item)}
            </Button>
          );
        })}
      </div>

    </aside>
  );
};

export default FilterSidebar;
