import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
  message,
  Empty,
} from "antd";
import { Line } from "@ant-design/charts";
import dayjs from "dayjs";
import { statisticsService } from "@/services/statistics.service";
import {
  OverviewStatistics,
  PageResponse,
  RevenueChartItem,
  TopProductItem,
} from "../statistics/statistics.model";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const RevenueStatisticPage = () => {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [overview, setOverview] = useState<OverviewStatistics>({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalProductsSold: 0,
    totalCustomers: 0,
  });

  const [topProducts, setTopProducts] = useState<PageResponse<TopProductItem>>({
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });

  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [revenueData, setRevenueData] = useState<RevenueChartItem[]>([]);
  const [hoveredRevenue, setHoveredRevenue] = useState<number | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string>("");

  const [query, setQuery] = useState({
    from: undefined as string | undefined,
    to: undefined as string | undefined,
    page: 0,
    size: 10,
  });

  const normalizePageResponse = (data: any): PageResponse<TopProductItem> => {
    return {
      content: Array.isArray(data?.content) ? data.content : [],
      page: Number(data?.page ?? 0),
      size: Number(data?.size ?? 10),
      totalElements: Number(data?.totalElements ?? 0),
      totalPages: Number(data?.totalPages ?? 0),
      last: Boolean(data?.last ?? true),
    };
  };

  const fetchData = async (
    customQuery = query,
    customGroupBy: "day" | "week" | "month" = groupBy,
  ) => {
    try {
      setLoading(true);

      const [overviewRes, topProductsRes, revenueRes] = await Promise.all([
        statisticsService.getOverview(customQuery),
        statisticsService.getTopProducts(customQuery),
        statisticsService.getRevenue(customGroupBy, customQuery),
      ]);

      const overviewData = (overviewRes as any)?.data ?? overviewRes ?? {};
      const topProductsData =
        (topProductsRes as any)?.data ?? topProductsRes ?? {};
      const revenueChartData = (revenueRes as any)?.data ?? revenueRes ?? [];

      setOverview({
        totalRevenue: Number(overviewData?.totalRevenue ?? 0),
        totalProfit: Number(overviewData?.totalProfit ?? 0),
        totalOrders: Number(overviewData?.totalOrders ?? 0),
        totalProductsSold: Number(overviewData?.totalProductsSold ?? 0),
        totalCustomers: Number(overviewData?.totalCustomers ?? 0),
      });

      setTopProducts(normalizePageResponse(topProductsData));
      setRevenueData(Array.isArray(revenueChartData) ? revenueChartData : []);
    } catch (error) {
      message.error("Không tải được dữ liệu thống kê");
      console.error("fetchData error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData(query, groupBy);
  }, [groupBy]);

  const handleSearch = (values: any) => {
    const range = values?.dateRange;

    const newQuery = {
      ...query,
      from: range?.[0] ? dayjs(range[0]).format("YYYY-MM-DD") : undefined,
      to: range?.[1] ? dayjs(range[1]).format("YYYY-MM-DD") : undefined,
      page: 0,
      size: Number(values?.size || 10),
    };

    setQuery(newQuery);
    fetchData(newQuery, groupBy);
  };

  const handleTableChange = (pagination: any) => {
    const newQuery = {
      ...query,
      page: Math.max(Number(pagination?.current || 1) - 1, 0),
      size: Number(pagination?.pageSize || 10),
    };

    setQuery(newQuery);
    fetchData(newQuery, groupBy);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const blobRes = await statisticsService.exportTopProductsExcel(query);
      const blobData = (blobRes as any)?.data ?? blobRes;

      downloadFile(
        new Blob([blobData], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "top-products.xlsx",
      );

      message.success("Xuất Excel thành công");
    } catch (error) {
      message.error("Xuất Excel thất bại");
      console.error(error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportLoading(true);
      const blobRes = await statisticsService.exportTopProductsPdf(query);
      const blobData = (blobRes as any)?.data ?? blobRes;

      downloadFile(
        new Blob([blobData], { type: "application/pdf" }),
        "top-products.pdf",
      );

      message.success("Xuất PDF thành công");
    } catch (error) {
      message.error("Xuất PDF thất bại");
      console.error(error);
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    `${Math.floor(Number(value || 0)).toLocaleString("vi-VN")} đ`;

  const shortLabel = (text: string, max = 16) => {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };

  const formatGroupLabel = (label: string) => {
    if (!label) return "-";

    if (groupBy === "day") {
      return dayjs(label).isValid() ? dayjs(label).format("DD/MM/YYYY") : label;
    }

    if (groupBy === "month") {
      return dayjs(`${label}-01`).isValid()
        ? dayjs(`${label}-01`).format("MM/YYYY")
        : label;
    }

    return dayjs(label).isValid()
      ? `Tuần từ ${dayjs(label).format("DD/MM/YYYY")}`
      : label;
  };

  const getHoverTitle = () => {
    if (hoveredRevenue === null || !hoveredLabel) {
      return "Bấm vào 1 điểm trên biểu đồ để xem doanh thu";
    }

    return `${formatGroupLabel(hoveredLabel)}: ${formatCurrency(hoveredRevenue)}`;
  };

  const revenueColumns = [
    {
      title: groupBy === "day" ? "Ngày" : groupBy === "week" ? "Tuần" : "Tháng",
      dataIndex: "label",
      key: "label",
      render: (value: string) => formatGroupLabel(value),
    },
    {
      title: "Số đơn",
      dataIndex: "totalOrders",
      key: "totalOrders",
      align: "right" as const,
      render: (value: number) => Number(value || 0),
    },
    {
      title: "Sản phẩm bán",
      dataIndex: "itemsSold",
      key: "itemsSold",
      align: "right" as const,
      render: (value: number) => Number(value || 0),
    },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      key: "revenue",
      align: "right" as const,
      render: (value: number) => formatCurrency(Number(value || 0)),
    },
    {
      title: "Lợi nhuận",
      dataIndex: "profit",
      key: "profit",
      align: "right" as const,
      render: (value: number) => formatCurrency(Number(value || 0)),
    },
  ];

  const topProductColumns = [
    {
      title: "STT",
      key: "index",
      width: 70,
      render: (_: any, __: any, index: number) =>
        (Number(query.page) || 0) * (Number(query.size) || 10) + index + 1,
    },
    {
      title: "Mã sản phẩm",
      dataIndex: "productCode",
      key: "productCode",
      render: (value: string) => value || "-",
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (value: string) => value || "-",
    },
    {
      title: "Thương hiệu",
      dataIndex: "brandName",
      key: "brandName",
      render: (value: string) => value || "-",
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      render: (value: string) => value || "-",
    },
    {
      title: "Số lượng bán",
      dataIndex: "totalSold",
      key: "totalSold",
      align: "right" as const,
      render: (value: number) => Number(value || 0),
    },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      key: "revenue",
      align: "right" as const,
      render: (value: number) => formatCurrency(Number(value || 0)),
    },
    {
      title: "Lợi nhuận",
      dataIndex: "profit",
      key: "profit",
      align: "right" as const,
      render: (value: number) => formatCurrency(Number(value || 0)),
    },
  ];

  const chartData = (revenueData || []).map((item) => ({
    rawLabel: item.label,
    label: formatGroupLabel(item.label),
    revenue: Number(item.revenue || 0),
  }));

  const lineConfig = {
    data: chartData,
    xField: "label",
    yField: "revenue",
    height: 360,
    autoFit: true,
    smooth: true,
    point: {
      size: 5,
      shape: "circle",
    },
    xAxis: {
      title: {
        text:
          groupBy === "day" ? "Ngày" : groupBy === "week" ? "Tuần" : "Tháng",
      },
      label: {
        autoRotate: false,
        autoHide: false,
        formatter: (value: string) => shortLabel(value, 18),
        style: {
          fontSize: 12,
        },
      },
    },
    yAxis: {
      title: {
        text: "Doanh thu",
      },
      label: {
        formatter: (value: string) => {
          const num = Number(value || 0);
          if (num >= 1_000_000_000) return `${num / 1_000_000_000} tỷ`;
          if (num >= 1_000_000) return `${num / 1_000_000} triệu`;
          if (num >= 1_000) return `${num / 1_000} nghìn`;
          return `${num}`;
        },
        style: {
          fontSize: 12,
        },
      },
      grid: {
        line: {
          style: {
            lineDash: [4, 4],
          },
        },
      },
    },
    meta: {
      revenue: {
        alias: "Doanh thu",
      },
      label: {
        alias:
          groupBy === "day" ? "Ngày" : groupBy === "week" ? "Tuần" : "Tháng",
      },
    },
    tooltip: {
      title: (datum: any) =>
        formatGroupLabel(String(datum?.rawLabel || datum?.label || "")),
      items: [
        (datum: any) => ({
          name: "Doanh thu",
          value: formatCurrency(Number(datum?.revenue || 0)),
        }),
      ],
    },
    lineStyle: {
      lineWidth: 3,
    },
  };

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        Thống kê doanh thu
      </Title>

      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Form layout="vertical" onFinish={handleSearch}>
          <Row gutter={16}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item label="Khoảng thời gian" name="dateRange">
                <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={4}>
              <Form.Item label="Kích thước trang" name="size" initialValue={10}>
                <InputNumber min={1} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col xs={24} lg={12}>
              <Form.Item label=" ">
                <Space wrap>
                  <Button type="primary" htmlType="submit">
                    Lọc dữ liệu
                  </Button>
                  <Button onClick={() => fetchData(query, groupBy)}>
                    Tải lại
                  </Button>
                  <Button loading={exportLoading} onClick={handleExportExcel}>
                    Xuất Excel
                  </Button>
                  <Button loading={exportLoading} onClick={handleExportPdf}>
                    Xuất PDF
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Space wrap>
                <Button
                  type={groupBy === "day" ? "primary" : "default"}
                  onClick={() => {
                    setHoveredRevenue(null);
                    setHoveredLabel("");
                    setGroupBy("day");
                  }}
                >
                  Theo ngày
                </Button>
                <Button
                  type={groupBy === "week" ? "primary" : "default"}
                  onClick={() => {
                    setHoveredRevenue(null);
                    setHoveredLabel("");
                    setGroupBy("week");
                  }}
                >
                  Theo tuần
                </Button>
                <Button
                  type={groupBy === "month" ? "primary" : "default"}
                  onClick={() => {
                    setHoveredRevenue(null);
                    setHoveredLabel("");
                    setGroupBy("month");
                  }}
                >
                  Theo tháng
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Doanh thu hoàn tất"
              value={Number(overview.totalRevenue || 0)}
              formatter={(value) => formatCurrency(Number(value || 0))}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng lợi nhuận"
              value={Number(overview.totalProfit || 0)}
              formatter={(value) => formatCurrency(Number(value || 0))}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng đơn hàng"
              value={Number(overview.totalOrders || 0)}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng sản phẩm bán"
              value={Number(overview.totalProductsSold || 0)}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng khách hàng"
              value={Number(overview.totalCustomers || 0)}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            Biểu đồ doanh thu theo thời gian
          </span>
        }
        extra={<Text type="secondary">{getHoverTitle()}</Text>}
        style={{ marginBottom: 16, borderRadius: 12 }}
      >
        {chartData.length > 0 ? (
          <div
            style={{
              overflowX: "auto",
              paddingTop: 8,
            }}
          >
            <div
              style={{
                minWidth: chartData.length > 6 ? chartData.length * 120 : 700,
              }}
            >
              <Line
                {...lineConfig}
                onReady={(plot: any) => {
                  const chart = plot?.chart || plot;

                  const handleClick = (evt: any) => {
                    const data =
                      evt?.data?.data ||
                      evt?.data?.datum ||
                      evt?.data?.record ||
                      evt?.data ||
                      {};

                    setHoveredRevenue(Number(data?.revenue || 0));
                    setHoveredLabel(
                      String(data?.rawLabel || data?.label || ""),
                    );
                  };

                  chart.on("element:click", handleClick);
                  chart.on("point:click", handleClick);
                }}
              />
            </div>
          </div>
        ) : (
          <Empty description="Không có dữ liệu biểu đồ" />
        )}
      </Card>

      <Card
        title={
          <span style={{ fontWeight: 600 }}>
            Chi tiết doanh thu theo{" "}
            {groupBy === "day" ? "ngày" : groupBy === "week" ? "tuần" : "tháng"}
          </span>
        }
        style={{ marginBottom: 16, borderRadius: 12 }}
      >
        <Table
          rowKey={(record) => `${record.label}-${groupBy}`}
          loading={loading}
          columns={revenueColumns}
          dataSource={revenueData}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "Không có dữ liệu chi tiết" }}
        />
      </Card>

      <Card
        title={<span style={{ fontWeight: 600 }}>Top sản phẩm bán chạy</span>}
        style={{ borderRadius: 12 }}
      >
        <Table
          rowKey="productId"
          loading={loading}
          columns={topProductColumns}
          dataSource={topProducts.content}
          pagination={{
            current: Number(topProducts.page || 0) + 1,
            pageSize: Number(topProducts.size || 10),
            total: Number(topProducts.totalElements || 0),
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          locale={{ emptyText: "Không có dữ liệu" }}
        />
      </Card>
    </div>
  );
};

export default RevenueStatisticPage;
