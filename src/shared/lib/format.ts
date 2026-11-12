const nf = new Intl.NumberFormat('ko-KR')

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** 부호 포함 숫자 (+1.2) */
export function formatSigned(value: number, fractionDigits = 1): string {
  const text = formatNumber(Math.abs(value), fractionDigits)
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

/** 십억 달러 단위 금액 */
export function formatBillions(value: number): string {
  if (Math.abs(value) >= 1000) return `$${formatNumber(value / 1000, 2)}T`
  return `$${nf.format(Math.round(value))}B`
}

/** 백만 명 단위 인구 */
export function formatPopulation(millions: number): string {
  if (millions >= 1) return `${formatNumber(millions, 1)}백만 명`
  return `${nf.format(Math.round(millions * 1000))}천 명`
}
