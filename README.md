# CHEERDMOTO Next.js Website

CHEERDMOTO 新站，包含 B2C 前台页面和中文管理后台。

## 本地开发

```bash
npm install
npm run dev
```

后台地址：

```text
/admin/login
```

## 常用命令

```bash
npm run build
npm run start
```

## 线上部署

项目部署在 Vercel。生产环境需要配置 `.env.example` 中列出的环境变量，尤其是后台登录、持久化存储、SMTP、支付和 Google Search Console。

## 后台模块

- 数据概览
- 商品管理、商品分类、商品属性与规格、库存管理
- 订单管理、支付与退款、发货与物流、退换货管理
- 客户管理、客户分组、购物车与弃购、优惠与促销、评价管理
- 新闻与博客、客户表单、访问分析、销售分析、SEO 数据
- 媒体库、数据同步、用户与权限、操作日志、系统设置

## 重要说明

后台会真实读取服务端订单、商品、访问、邮件、支付、退款、物流和 SEO 数据。尚未接入的能力会显示为待配置或待接入，不伪造经营数据。
