export function sanitizeCpf(s = '') { return (s.match(/\d/g) || []).join(''); }

export function formatCpf(cpfDigits = '') {
  const s = sanitizeCpf(cpfDigits).padEnd(11, '_').slice(0, 11);
  return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9,11)}`;
}

export function isValidCpf(value = '') {
  const cpf = sanitizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais
  const calc = (factor) => {
    let sum = 0;
    for (let i = 0; i < factor - 1; i++) sum += +cpf[i] * (factor - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  const d1 = calc(10);
  const d2 = calc(11);
  return d1 === +cpf[9] && d2 === +cpf[10];
}
