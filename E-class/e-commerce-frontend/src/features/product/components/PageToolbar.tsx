import { Select, Space, Typography } from "antd";

const { Text } = Typography;

interface PageToolbarProps {
  shown: number;
  total: number;
  sort: string;
  pageSize: number;
  sortOptions: { value: string; label: string }[];
  onSortChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
}

const PageToolbar = ({
  shown,
  total,
  sort,
  pageSize,
  sortOptions,
  onSortChange,
  onPageSizeChange,
}: PageToolbarProps) => (
  <Space align="center" className="page-toolbar" wrap>
    <Text>
      Hiển thị {shown} trong tổng số {total} sản phẩm
    </Text>
    <Space>
      <Text>Sắp xếp:</Text>
      <Select
        value={sort}
        style={{ width: 150 }}
        options={sortOptions}
        onChange={onSortChange}
      />
      <Select
        value={pageSize}
        style={{ width: 120 }}
        options={[
          { value: 8, label: "8 / trang" },
          { value: 12, label: "12 / trang" },
          { value: 24, label: "24 / trang" },
        ]}
        onChange={onPageSizeChange}
      />
    </Space>
  </Space>
);

export default PageToolbar;
