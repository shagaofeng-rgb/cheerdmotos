const countries: Record<string, string> = {
  PH: '菲律宾',
  ES: '西班牙',
  US: '美国',
  CN: '中国',
  HK: '中国香港',
  SG: '新加坡',
  MY: '马来西亚',
  TH: '泰国',
  ID: '印度尼西亚',
  AE: '阿联酋',
  SA: '沙特阿拉伯',
  AU: '澳大利亚',
  CA: '加拿大',
  GB: '英国',
  DE: '德国',
  FR: '法国',
  IT: '意大利',
  NL: '荷兰',
  Unknown: '未知',
  'United States': '美国',
  Philippines: '菲律宾'
};

const devices: Record<string, string> = {
  Desktop: '电脑',
  Mobile: '手机',
  Tablet: '平板',
  Unknown: '未知'
};

const browsers: Record<string, string> = {
  Other: '其他',
  Chrome: 'Chrome',
  Safari: 'Safari',
  Edge: 'Edge',
  Firefox: 'Firefox',
  Unknown: '未知'
};

const sources: Record<string, string> = {
  paid_social: '付费社媒',
  paid_search: '付费搜索',
  organic_social: '自然社媒',
  organic_search: '自然搜索',
  referral: '外部推荐',
  direct: '直接访问',
  email: '邮件',
  unknown: '未知来源'
};

const platforms: Record<string, string> = {
  meta: 'Meta 广告',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: '领英',
  google_ads: '谷歌广告',
  bing_ads: '微软广告',
  'Meta Ads': 'Meta 广告',
  LinkedIn: '领英',
  'Google Ads': '谷歌广告',
  'Microsoft Ads': '微软广告',
  TikTok: 'TikTok',
  Direct: '直接访问',
  Unknown: '未知平台'
};

const detailKeys: Record<string, string> = {
  source: '来源',
  medium: '媒介',
  campaign: '广告活动',
  term: '关键词',
  content: '内容',
  click_id: '点击 ID',
  referrer: '推荐域名'
};

const detailValues: Record<string, string> = {
  meta: 'Meta',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: '领英',
  google_ads: '谷歌广告',
  paid_social: '付费社媒',
  paid_search: '付费搜索',
  direct: '直接访问',
  fbclid: 'Facebook 点击 ID',
  gclid: 'Google 点击 ID',
  li_fat_id: 'LinkedIn 点击 ID'
};

export function zhCountry(value: string) {
  return countries[value] || value || '未知';
}

export function zhDeviceName(value: string) {
  return devices[value] || value || '未知';
}

export function zhBrowser(value: string) {
  return browsers[value] || value || '未知';
}

export function zhTrafficSource(value: string) {
  return sources[value] || value || '未知来源';
}

export function zhTrafficPlatform(value: string) {
  return platforms[value] || value || '未知平台';
}

export function zhSourceDetail(value: string) {
  if (!value || value === 'direct') return '直接访问';
  return value.split(' / ').map((part) => {
    const [rawKey, ...rest] = part.split('=');
    const rawValue = rest.join('=');
    const key = detailKeys[rawKey] || rawKey;
    const val = detailValues[rawValue] || rawValue;
    return rawValue ? `${key}=${val}` : (detailValues[part] || part);
  }).join(' / ');
}
