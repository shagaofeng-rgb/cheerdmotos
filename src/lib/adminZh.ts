export function zhPublishStatus(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    unpublished: '已下架',
    archived: '已归档',
    scheduled: '定时发布'
  };
  return map[status] || status || '未知';
}

export function zhOrderStatus(status: string) {
  const map: Record<string, string> = {
    pending_payment: '待付款',
    paid: '已付款',
    processing: '处理中',
    shipped: '已发货',
    delivered: '已送达',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
    partial_refunded: '部分退款',
    failed: '失败'
  };
  return map[status] || status || '未知';
}

export function zhPaymentStatus(status: string) {
  const map: Record<string, string> = {
    not_submitted: '未提交支付',
    pending: '支付处理中',
    processing: '网关处理中',
    success: '支付成功',
    failed: '支付失败',
    refunded: '已退款',
    partial_refunded: '部分退款'
  };
  return map[status] || status || '未知';
}

export function zhPaymentMethod(method: string) {
  const map: Record<string, string> = {
    qianhai_card: '前海信用卡',
    oceanpayment_card: 'Oceanpayment 信用卡',
    oceanpayment_google_pay: 'Oceanpayment Google Pay',
    oceanpayment_apple_pay: 'Oceanpayment Apple Pay',
    bank_transfer: '银行转账/T/T',
    manual_quote: '人工报价'
  };
  return map[method] || method || '未知';
}

export function zhShipmentStatus(status: string) {
  const map: Record<string, string> = {
    unshipped: '未发货',
    shipped: '已发货',
    in_transit: '运输中',
    delivered: '已送达',
    returned: '已退回'
  };
  return map[status] || status || '未知';
}

export function zhLeadStatus(status: string) {
  const map: Record<string, string> = {
    'New Lead': '新线索',
    'Contact Captured': '已留联系方式',
    'Order Created': '已创建订单',
    'Payment Pending': '待付款',
    Paid: '已付款',
    Abandoned: '弃单/未完成'
  };
  return map[status] || status || '未知';
}

export function zhEventType(type: string) {
  const map: Record<string, string> = {
    page_view: '页面访问',
    product_view: '商品详情访问',
    commerce_click: '商业按钮点击',
    checkout_start: '进入结账',
    checkout_submit: '提交结账',
    checkout_duplicate_submit: '重复提交拦截',
    begin_checkout: '开始结账',
    order_created: '创建订单',
    payment_started: '发起支付',
    payment_request_create: '生成支付请求',
    payment_success: '支付成功',
    payment_failed: '支付失败',
    shipment_saved: '物流保存',
    refund_created: '退款记录',
    authorization_action: '预授权操作',
    form_submit: '表单提交',
    contact_click: '联系按钮点击',
    contact_inquiry: '客户询盘'
  };
  return map[type] || type || '未知事件';
}

export function zhDevice(device: string) {
  const map: Record<string, string> = {
    Desktop: '电脑',
    Mobile: '手机',
    Tablet: '平板',
    Unknown: '未知'
  };
  return map[device] || device || '未知';
}
