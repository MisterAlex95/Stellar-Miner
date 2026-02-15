import Decimal from 'break_infinity.js';
import type { DecimalSource } from '../domain/bigNumber.js';

/** Cookie Clicker–style suffixes: 10^3=K, 10^6=M, 10^9=B, 10^12=T, then Qa, Qi, Sx, Sp, Oc, No, Dc, … */
const SUFFIXES = [
  'K', 'M', 'B', 'T',
  'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'Udc', 'Ddc', 'Tdc', 'Qadc', 'Qidc', 'Sxdc', 'Spdc', 'Ocdc', 'Nodc',
  'Vg', 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ocvg', 'Novg',
  'Tg', 'Utg', 'Dtg', 'Ttg', 'Qatg', 'Qitg', 'Sxtg', 'Sptg', 'Octg', 'Notg',
  'Qag', 'Uqag', 'Dqag', 'Tqag', 'Qaqag', 'Qiqag', 'Sxqag', 'Spqag', 'Ocqag', 'Noqag',
  'Qiqg', 'Uqiqg', 'Dqiqg', 'Tqiqg', 'Qaqiqg', 'Qiqiqg', 'Sxqiqg', 'Spqiqg', 'Ocqiqg', 'Noqiqg',
  'Sxg', 'Usxg', 'Dsxg', 'Tsxg', 'Qasxg', 'Qisxg', 'Sxsxg', 'Spsxg', 'Ocsxg', 'Nosxg',
  'Spg', 'Uspg', 'Dspg', 'Tspg', 'Qaspg', 'Qispg', 'Sxspg', 'Spspg', 'Ocspg', 'Nospg',
  'Ocg', 'Uocg', 'Docg', 'Tocg', 'Qaocg', 'Qiocg', 'Sxocg', 'Spocg', 'Ococg', 'Noocg',
  'Nog', 'Unog', 'Dnog', 'Tnog', 'Qanog', 'Qinog', 'Sxnog', 'Spnog', 'Ocnog', 'Nonog',
  'Ce', 'Uce', 'Dce', 'Tce', 'Qace', 'Qice', 'Sxce', 'Spce', 'Occe', 'Noce',
];

function formatDecimalCompact(d: Decimal): string {
  if (d.lte(0)) return '0';
  const log10 = d.exponent + Math.log10(Math.abs(d.mantissa));
  const exp = Math.floor(log10);
  if (exp < 3) {
    const num = d.toNumber();
    return Number.isFinite(num) ? Math.floor(num).toLocaleString() : d.toString();
  }
  const suffixIndex = Math.floor(exp / 3) - 1;
  if (suffixIndex < 0 || suffixIndex >= SUFFIXES.length) {
    if (exp <= 308) return d.toExponential(2);
    return d.toString();
  }
  const divisor = Decimal.pow10((suffixIndex + 1) * 3);
  const displayVal = d.div(divisor);
  const displayNum = displayVal.mantissa * Math.pow(10, displayVal.exponent);
  const fixed = displayNum >= 100 ? Math.floor(displayNum).toString() : displayNum.toFixed(1);
  return fixed + SUFFIXES[suffixIndex];
}

export function formatNumber(n: number | DecimalSource, compact: boolean = true): string {
  const d = n instanceof Decimal ? n : new Decimal(n);
  if (!compact) {
    const num = d.toNumber();
    return Number.isFinite(num) ? Math.floor(num).toLocaleString() : d.toString();
  }
  return formatDecimalCompact(d);
}
