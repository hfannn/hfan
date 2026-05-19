import { Col, Divider, Layout, Row } from "antd";

const { Footer } = Layout;

const FooterBar = () => (
  <Footer className="app-footer">
    <Row gutter={[32, 24]} style={{ maxWidth: 1440, margin: "0 auto" }}>
      <Col xs={24} md={6}>
        <h3>Về S-Shop Online</h3>
        <p>
          S-Shop Online là cửa hàng chuyên cung cấp giày chính hãng, đa dạng mẫu mã,
          chất lượng đảm bảo và dịch vụ tận tâm.
        </p>
      </Col>

      <Col xs={24} md={6}>
        <h4>Địa chỉ cửa hàng</h4>
        <p>3 Tô Hiệu, Chiềng Lề, Sơn La</p>
      </Col>

      <Col xs={24} md={6}>
        <h4>Chính sách</h4>
       
        <p>
          <a href="#">Chính sách bảo hành</a>
        </p>
        <p>
          <a href="#">Chính sách vận chuyển</a>
        </p>
        <p>
          <a href="#">Chính sách bảo mật</a>
        </p>
      </Col>

      <Col xs={24} md={6}>
        <h4>Liên hệ</h4>
        <p>Hotline: 0839 225 7999</p>
        <p>Email: Shoeshop@sshop.vn</p>
        <p>8:00 - 22:00 tất cả các ngày</p>
      </Col>
    </Row>

    <Divider style={{ borderColor: "rgba(255, 255, 255, 0.18)" }} />

    <div style={{ color: "rgba(255, 255, 255, 0.48)", textAlign: "center" }}>
      © {new Date().getFullYear()} S-Shop Online. All rights reserved.
    </div>
  </Footer>
);

export default FooterBar;
