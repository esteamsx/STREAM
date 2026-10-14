const WHITE = { fill: "#f6f3ea", stroke: "#2b2b30", detail: "#2b2b30" };
const BLACK = { fill: "#34343b", stroke: "#0f0f12", detail: "#e9e6dc" };

function shapes(type, c) {
  const s = `fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
  const d = `fill="none" stroke="${c.detail}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"`;
  switch (type) {
    case "p":
      return `<circle cx="22.5" cy="12.5" r="5.2" ${s}/>
        <path d="M16.5 33.5c0-6.5 2.4-10 6-12.2 3.6 2.2 6 5.7 6 12.2z" ${s}/>
        <rect x="11.5" y="33.5" width="22" height="4.6" rx="2" ${s}/>`;
    case "r":
      return `<path d="M12 38.5h21v-4.2H12z" ${s}/>
        <path d="M14.5 34.3 15.8 19.5h13.4l1.3 14.8z" ${s}/>
        <path d="M12.5 19.5v-9.2h4.2v3.2h3.9v-3.2h3.8v3.2h3.9v-3.2h4.2v9.2z" ${s}/>
        <path d="M16 24.5h13" ${d}/>`;
    case "n":
      return `<path d="M13 38.5h21v-4.2c0-6.800-1.800-9.300-5.300-12.500 2.800-.800 4.500-3.200 4.500-6.300 0-2.300-1.400-4.500-3.500-5.800l-.2-4-4.300 2.800c-3.800-.8-7.800 1.500-9.800 5.200L9.800 22.600l2.800 3.100 4.800-2.600c-1.500 3.100-4.400 5.600-4.400 11.200z" ${s}/>
        <circle cx="24.200" cy="14.800" r="1.300" fill="${c.detail}"/>
        <path d="M13.500 24.200 17 22.200" ${d}/>
        <path d="M27.500 17.500c1.500 1 2.300 2 2.800 3.500" ${d}/>`;
    case "b":
      return `<path d="M12 38.5h21v-4.2H12z" ${s}/>
        <path d="M16.200 34.300c0-5.800 1.600-9.800 6.300-12.800 4.700 3 6.300 7 6.300 12.800z" ${s}/>
        <path d="M22.500 6.800c-4 3.200-6.300 6.800-6.300 10.600 0 3.300 2.300 5.300 6.300 5.300s6.300-2 6.300-5.300c0-3.800-2.300-7.400-6.300-10.600z" ${s}/>
        <circle cx="22.500" cy="5.800" r="2.300" ${s}/>
        <path d="M19.800 17.400h5.400M22.500 14.700v5.400" ${d}/>`;
    case "q":
      return `<path d="M11 38.500h23v-4.200H11z" ${s}/>
        <path d="M12.500 34.300 9 16.500l7.600 8.200 2.500-12.500 3.400 11.500 3.400-11.500 2.500 12.500 7.600-8.200-3.500 17.800z" ${s}/>
        <circle cx="9" cy="14.500" r="2.200" ${s}/><circle cx="16.800" cy="10.200" r="2.200" ${s}/>
        <circle cx="22.500" cy="8.500" r="2.200" ${s}/><circle cx="28.200" cy="10.200" r="2.200" ${s}/><circle cx="36" cy="14.500" r="2.200" ${s}/>
        <path d="M14.500 30h16" ${d}/>`;
    case "k":
      return `<path d="M11 38.500h23v-4.200H11z" ${s}/>
        <path d="M13.500 34.300c-2.600-6-1.200-11.300 3.200-14.200 1.300-3 3.300-4.400 5.800-4.400s4.500 1.400 5.800 4.400c4.400 2.900 5.800 8.200 3.200 14.200z" ${s}/>
        <path d="M22.500 3.500v11.500M17.700 8.500h9.600" fill="none" stroke="${c.stroke}" stroke-width="4" stroke-linecap="round"/>
        <path d="M22.500 3.500v11.500M17.700 8.500h9.600" fill="none" stroke="${c.fill}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M15 28.500h15" ${d}/>`;
    default:
      return "";
  }
}

export function pieceSymbols() {
  let out = "";
  for (const [color, c] of [["w", WHITE], ["b", BLACK]]) {
    for (const t of ["p", "r", "n", "b", "q", "k"]) {
      out += `<symbol id="${color}${t}" viewBox="0 0 45 45">${shapes(t, c)}</symbol>`;
    }
  }
  return out;
}
