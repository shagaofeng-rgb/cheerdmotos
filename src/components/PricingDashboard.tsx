'use client';

import {useMemo, useState} from 'react';
import type {PricingOrder, PricingProduct} from '@/lib/pricingStore';
import {calculatePricing, tierForQuantity, tierLabels} from '@/lib/pricingMath';

function money(value: number, currency = 'USD') {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}`;
}

export default function PricingDashboard({
  products,
  orders,
  exchangeRate,
  exchangeSource,
  exchangeUpdatedAt,
  exchangeFallback,
  currentAccount
}: {
  products: PricingProduct[];
  orders: PricingOrder[];
  exchangeRate: number;
  exchangeSource: string;
  exchangeUpdatedAt: string;
  exchangeFallback: boolean;
  currentAccount: string;
}) {
  const [productId, setProductId] = useState(products[0]?.id || 'xceed-electric-dirt-bike');
  const [quantity, setQuantity] = useState(1);
  const [saleUnitUsd, setSaleUnitUsd] = useState(products[0]?.retailUsd || 0);
  const [costUnitUsd, setCostUnitUsd] = useState(products[0]?.tiers.tier1 || 0);
  const [extraCostUsd, setExtraCostUsd] = useState(0);

  const product = products.find((item) => item.id === productId) || products[0];
  const activeTier = tierForQuantity(quantity);

  const totals = useMemo(() => {
    if (!product) {
      return {
        grossProfitUsd: 0,
        grossProfitCny: 0,
        salespersonCommissionUsd: 0,
        salespersonCommissionCny: 0,
        commissionPerUnit: 0,
        baseRate: 0,
        baseCommissionPerUnit: 0,
        midCommissionPerUnit: 0,
        topCommissionPerUnit: 0,
        midSpreadPerUnit: 0,
        topSpreadPerUnit: 0,
        floorUnitUsd: 0,
        fivePlusUnitUsd: 0
      };
    }
    return calculatePricing({
      productId,
      quantity,
      saleUnitUsd,
      costUnitUsd,
      extraCostUsd,
      exchangeRate,
      floorUnitUsd: product.tiers.tier4,
      fivePlusUnitUsd: product.tiers.tier2
    });
  }, [product, productId, saleUnitUsd, costUnitUsd, extraCostUsd, quantity, exchangeRate]);

  const perUnitProfitUsd = saleUnitUsd - costUnitUsd - extraCostUsd / Math.max(1, quantity);

  function selectProduct(nextId: string) {
    const next = products.find((item) => item.id === nextId);
    if (!next) return;
    const nextTier = tierForQuantity(quantity);
    setProductId(next.id);
    setSaleUnitUsd(next.retailUsd);
    setCostUnitUsd(next.tiers[nextTier]);
  }

  function updateQuantity(value: number) {
    const nextQty = Math.max(1, Math.floor(value || 1));
    setQuantity(nextQty);
    const nextTier = tierForQuantity(nextQty);
    if (product) setCostUnitUsd(product.tiers[nextTier]);
  }

  return (
    <div className="pricing-admin-page">
      <header className="pricing-admin-hero">
        <div>
          <p className="pricing-kicker">独立计价后台</p>
          <h1>冲浪板价格、汇率、佣金与成交订单计算</h1>
          <p>当前账号：{currentAccount}。佣金按 30 台以上最低底价基础佣金，加售价差额阶梯佣金自动计算。</p>
        </div>
        <form action="/api/pricing-admin/logout" method="post">
          <button className="pricing-ghost-button" type="submit">退出</button>
        </form>
      </header>

      <section className="pricing-admin-metrics">
        <article>
          <span>当日汇率</span>
          <strong>{exchangeRate.toFixed(4)}</strong>
          <small>{exchangeSource}{exchangeFallback ? '，请注意核对' : ''}</small>
        </article>
        <article>
          <span>成交订单</span>
          <strong>{orders.length}</strong>
          <small>独立存储，不混入网站订单后台</small>
        </article>
        <article>
          <span>已录入利润</span>
          <strong>{money(orders.reduce((sum, order) => sum + order.grossProfitUsd, 0))}</strong>
          <small>约 CNY {(orders.reduce((sum, order) => sum + order.grossProfitCny, 0)).toLocaleString(undefined, {maximumFractionDigits: 0})}</small>
        </article>
        <article>
          <span>销售佣金</span>
          <strong>{money(orders.reduce((sum, order) => sum + order.salespersonCommissionUsd, 0))}</strong>
          <small>X1/X1 PRO/卡丁船基础 1%，P1/P1 PRO 基础 2%</small>
        </article>
      </section>

      <section className="pricing-admin-grid">
        <form className="pricing-card pricing-calculator" action="/api/pricing-admin/orders" method="post">
          <div className="pricing-card-head">
            <div>
              <p className="pricing-kicker">成交录入</p>
              <h2>单台能挣多少钱</h2>
            </div>
            <span className="pricing-badge">{tierLabels[activeTier]}</span>
          </div>

          <input type="hidden" name="productName" value={product?.name || ''} />
          <input type="hidden" name="exchangeRate" value={exchangeRate} />

          <label>
            产品
            <select name="productId" value={productId} onChange={(event) => selectProduct(event.target.value)}>
              {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <div className="pricing-form-row">
            <label>
              数量
              <input name="quantity" type="number" min="1" value={quantity} onChange={(event) => updateQuantity(Number(event.target.value))} />
            </label>
            <label>
              成交单价 USD
              <input name="saleUnitUsd" type="number" min="0" step="0.01" value={saleUnitUsd} onChange={(event) => setSaleUnitUsd(Number(event.target.value))} />
            </label>
          </div>

          <div className="pricing-form-row">
            <label>
              成本单价 USD
              <input name="costUnitUsd" type="number" min="0" step="0.01" value={costUnitUsd} onChange={(event) => setCostUnitUsd(Number(event.target.value))} />
            </label>
            <label>
              额外成本 USD
              <input name="extraCostUsd" type="number" min="0" step="0.01" value={extraCostUsd} onChange={(event) => setExtraCostUsd(Number(event.target.value))} />
            </label>
          </div>

          <div className="pricing-result-panel">
            <div><span>单台毛利</span><strong>{money(perUnitProfitUsd)}</strong></div>
            <div><span>整单毛利</span><strong>{money(totals.grossProfitUsd)}</strong><small>CNY {totals.grossProfitCny.toLocaleString(undefined, {maximumFractionDigits: 0})}</small></div>
            <div><span>实际销售佣金</span><strong>{money(totals.salespersonCommissionUsd)}</strong><small>CNY {totals.salespersonCommissionCny.toLocaleString(undefined, {maximumFractionDigits: 0})}</small></div>
          </div>

          <div className="pricing-commission-box">
            <strong>佣金拆分</strong>
            <p>基础佣金：{money(totals.floorUnitUsd)} × {totals.baseRate}% = {money(totals.baseCommissionPerUnit)} / 台</p>
            <p>底价到 5 台以上价差：{money(totals.midSpreadPerUnit)} × 10% = {money(totals.midCommissionPerUnit)} / 台</p>
            <p>超过 5 台以上底价部分：{money(totals.topSpreadPerUnit)} × 20% = {money(totals.topCommissionPerUnit)} / 台</p>
            <p>合计：{money(totals.commissionPerUnit)} / 台 × {quantity} 台 = {money(totals.salespersonCommissionUsd)}</p>
          </div>

          <div className="pricing-form-row">
            <label>
              客户 / 订单备注
              <input name="customerName" placeholder="客户名称或订单编号" />
            </label>
            <label>
              国家
              <input name="country" placeholder="例如 USA / UAE" />
            </label>
          </div>
          <label>
            销售人员
            <input name="salesperson" placeholder="销售姓名" defaultValue={currentAccount} />
          </label>
          <label>
            备注
            <textarea name="note" rows={3} placeholder="成交条款、物流、付款方式等" />
          </label>

          <button className="pricing-primary-button" type="submit">保存成交订单</button>
        </form>

        <aside className="pricing-card">
          <div className="pricing-card-head">
            <div>
              <p className="pricing-kicker">价格阶梯</p>
              <h2>当前报价表</h2>
            </div>
          </div>
          <div className="pricing-table-wrap">
            <table className="pricing-table">
              <thead>
                <tr><th>产品</th><th>零售价</th><th>1-5</th><th>5-10</th><th>10-30</th><th>30+</th></tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{money(item.retailUsd)}</td>
                    <td>{money(item.tiers.tier1)}</td>
                    <td>{money(item.tiers.tier2)}</td>
                    <td>{money(item.tiers.tier3)}</td>
                    <td>{money(item.tiers.tier4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="pricing-rate-form" action="/api/pricing-admin/settings" method="post">
            <label>
              手动汇率覆盖（留空恢复实时汇率）
              <input name="manualExchangeRate" type="number" min="0" step="0.0001" placeholder={exchangeRate.toFixed(4)} />
            </label>
            <button className="pricing-secondary-button" type="submit">保存汇率设置</button>
            <small>更新时间：{exchangeUpdatedAt}</small>
          </form>
        </aside>
      </section>

      <section className="pricing-card">
        <div className="pricing-card-head">
          <div>
            <p className="pricing-kicker">订单记录</p>
            <h2>最近成交订单</h2>
          </div>
        </div>
        <div className="pricing-table-wrap">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>时间</th><th>客户</th><th>国家</th><th>产品</th><th>数量</th><th>成交单价</th><th>成本单价</th><th>整单毛利</th><th>销售佣金</th><th>销售</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? orders.slice(0, 30).map((order) => (
                <tr key={order.id}>
                  <td>{new Date(order.createdAt).toLocaleString('zh-CN', {hour12: false})}</td>
                  <td>{order.customerName || '-'}</td>
                  <td>{order.country || '-'}</td>
                  <td>{order.productName}</td>
                  <td>{order.quantity}</td>
                  <td>{money(order.saleUnitUsd)}</td>
                  <td>{money(order.costUnitUsd)}</td>
                  <td>{money(order.grossProfitUsd)} / CNY {order.grossProfitCny.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                  <td>{money(order.salespersonCommissionUsd)}</td>
                  <td>{order.salesperson || '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={10}>还没有录入成交订单。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
