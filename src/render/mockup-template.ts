import type { BusinessLead } from "../types/lead.js";
import { themeForLead, type CategoryTheme } from "./theme.js";

export const MOCKUP_WIDTH = 1280;
export const MOCKUP_HEIGHT = 800;

export interface MockupOptions {
  /**
   * Carimba a imagem como dado simulado. Ligado automaticamente para leads
   * vindos da fixture, para nunca confundir mockup de teste com lead real.
   */
  watermark?: boolean;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Domínio sugerido para o negócio, exibido na barra de endereço do mockup. */
export function suggestDomain(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 28);
  return `${slug || "meunegocio"}.com.br`;
}

/** Iniciais usadas no símbolo da marca (no máximo duas letras). */
function initials(name: string): string {
  const ignore = new Set(["de", "da", "do", "das", "dos", "e", "&", "-"]);
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0 && !ignore.has(word.toLowerCase()));
  const picked = words.slice(0, 2).map((word) => word[0]!.toUpperCase());
  return picked.join("") || name.slice(0, 2).toUpperCase();
}

/** Só o logradouro e o número, para caber na faixa de contato. */
function shortAddress(address?: string): string {
  if (!address) return "Região da Av. Paulista, São Paulo";
  return address.split(" - ")[0]!.trim();
}

function neighbourhood(address?: string): string {
  if (!address) return "São Paulo - SP";
  const parts = address.split(" - ");
  return parts[1]?.trim() ?? "São Paulo - SP";
}

function starsSvg(rating: number, color: string): string {
  const full = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < full;
    return `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }).join("");
}

function iconSvg(path: string, color: string, size: number, strokeWidth = 1.7): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}

/** `true` quando o texto sobre a superfície precisa ser claro (tema escuro). */
function isDarkTheme(theme: CategoryTheme): boolean {
  const hex = theme.palette.bg.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/**
 * Monta o HTML completo e autocontido do mockup de homepage para um lead.
 * Sem nenhuma requisição externa: fontes do sistema, ícones em SVG inline e
 * imagens desenhadas em CSS — o render funciona offline.
 */
export function buildMockupHtml(lead: BusinessLead, options: MockupOptions = {}): string {
  const theme = themeForLead(lead);
  const p = theme.palette;
  const dark = isDarkTheme(theme);
  const watermark = options.watermark ?? lead.source === "fixture";

  const name = escapeHtml(lead.name);
  const domain = suggestDomain(lead.name);
  const mark = escapeHtml(initials(lead.name));
  const phone = escapeHtml(lead.phone ?? "(11) 0000-0000");
  const address = escapeHtml(shortAddress(lead.formattedAddress));
  const district = escapeHtml(neighbourhood(lead.formattedAddress));

  const ratingBlock =
    lead.rating !== undefined
      ? `<div class="rating">
           <div class="stars">${starsSvg(lead.rating, "#F5A623")}</div>
           <strong>${lead.rating.toFixed(1)}</strong>
           <span>no Google${lead.userRatingsTotal ? ` · ${lead.userRatingsTotal} avaliações` : ""}</span>
         </div>`
      : "";

  const serviceCards = theme.services
    .map(
      (service, index) => `
        <article class="card">
          <span class="card-num">0${index + 1}</span>
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.text)}</p>
        </article>`,
    )
    .join("");

  const navLinks = theme.nav.map((item) => `<a>${escapeHtml(item)}</a>`).join("");

  const watermarkBlock = watermark
    ? `<div class="watermark">MOCKUP · DADOS SIMULADOS</div>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${name}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${MOCKUP_WIDTH}px;
    height: ${MOCKUP_HEIGHT}px;
    overflow: hidden;
    font-family: "Liberation Sans", "DejaVu Sans", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  body { background: #DFE3E8; display: flex; flex-direction: column; }

  /* ---- moldura de navegador, para o print ler como "site" ---- */
  .chrome {
    height: 40px; flex: 0 0 40px;
    background: ${dark ? "#23272C" : "#E9ECEF"};
    display: flex; align-items: center; gap: 12px; padding: 0 16px;
    border-bottom: 1px solid ${dark ? "#33383E" : "#D3D8DE"};
  }
  .dots { display: flex; gap: 7px; }
  .dots i { width: 11px; height: 11px; border-radius: 50%; display: block; }
  .url {
    flex: 1; height: 24px; border-radius: 12px;
    background: ${dark ? "#15181B" : "#FFFFFF"};
    color: ${dark ? "#9AA3AC" : "#5C6570"};
    font-size: 12px; display: flex; align-items: center; gap: 7px; padding: 0 12px;
    max-width: 520px; margin: 0 auto;
  }
  .url b { color: ${dark ? "#E6EAEE" : "#1C2128"}; font-weight: 600; }

  .site { flex: 1; background: ${p.bg}; color: ${p.ink}; display: flex; flex-direction: column; }

  /* ---- navegação ---- */
  nav {
    height: 68px; flex: 0 0 68px; padding: 0 44px;
    display: flex; align-items: center; gap: 18px;
    border-bottom: 1px solid ${dark ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.07)"};
  }
  .brand { display: flex; align-items: center; gap: 11px; margin-right: auto; min-width: 0; }
  .brand .mark {
    width: 38px; height: 38px; flex: 0 0 38px; border-radius: 11px;
    background: linear-gradient(135deg, ${p.heroFrom}, ${p.accent});
    color: ${p.onAccent}; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 15px; letter-spacing: .3px;
  }
  .brand .name {
    font-size: 17px; font-weight: 700; letter-spacing: -.2px; line-height: 1.15;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px;
  }
  .brand .kicker { font-size: 10.5px; color: ${p.muted}; letter-spacing: .8px; text-transform: uppercase; }
  nav a { font-size: 13.5px; color: ${p.muted}; font-weight: 500; }
  nav .btn-nav {
    font-size: 13px; font-weight: 600; padding: 9px 17px; border-radius: 8px;
    background: ${p.accent}; color: ${p.onAccent}; margin-left: 6px;
  }

  /* ---- hero ---- */
  .hero {
    flex: 0 0 342px; padding: 34px 44px 0; display: grid;
    grid-template-columns: 1.08fr .92fr; gap: 34px; align-items: start;
  }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)"};
    border: 1px solid ${dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.06)"};
    padding: 6px 13px 6px 10px; border-radius: 999px;
    font-size: 11.5px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase;
    color: ${p.accent};
  }
  h1 {
    margin-top: 16px; font-size: 40px; line-height: 1.08; letter-spacing: -1.1px;
    font-weight: 700; max-width: 16ch;
  }
  .sub { margin-top: 14px; font-size: 15px; line-height: 1.55; color: ${p.muted}; max-width: 46ch; }
  .actions { margin-top: 22px; display: flex; align-items: center; gap: 11px; }
  .btn {
    padding: 12px 20px; border-radius: 9px; font-size: 13.5px; font-weight: 600;
    background: ${p.accent}; color: ${p.onAccent};
    box-shadow: 0 8px 20px ${dark ? "rgba(0,0,0,.45)" : "rgba(0,0,0,.13)"};
  }
  .btn.ghost {
    background: transparent; color: ${p.ink}; box-shadow: none;
    border: 1.5px solid ${dark ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.16)"};
  }
  .rating { margin-top: 20px; display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: ${p.muted}; }
  .rating .stars { display: flex; gap: 2px; }
  .rating strong { color: ${p.ink}; font-size: 14px; }

  /* ---- painel visual do hero (100% CSS, sem imagem externa) ---- */
  .visual {
    position: relative; height: 288px; border-radius: 18px; overflow: hidden;
    background: linear-gradient(145deg, ${p.heroFrom}, ${p.heroTo});
    box-shadow: 0 22px 44px ${dark ? "rgba(0,0,0,.5)" : "rgba(15,23,42,.22)"};
  }
  .visual::before {
    content: ""; position: absolute; width: 300px; height: 300px; right: -90px; top: -110px;
    border-radius: 50%; background: rgba(255,255,255,.16);
  }
  .visual::after {
    content: ""; position: absolute; width: 210px; height: 210px; left: -70px; bottom: -90px;
    border-radius: 50%; background: rgba(0,0,0,.13);
  }
  .visual .glow {
    position: absolute; inset: 0;
    background: radial-gradient(120% 90% at 78% 12%, ${p.accent}59, transparent 62%);
  }
  .visual .glyph { position: absolute; right: 26px; top: 24px; opacity: .34; }
  .visual .label {
    position: absolute; left: 26px; top: 26px; color: rgba(255,255,255,.92);
    font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
  }
  .chips { position: absolute; left: 22px; right: 22px; bottom: 20px; display: grid; gap: 9px; }
  .chip {
    background: rgba(255,255,255,.95); border-radius: 11px; padding: 10px 13px;
    display: flex; align-items: center; gap: 11px;
    box-shadow: 0 5px 14px rgba(0,0,0,.14);
  }
  .chip .ico {
    width: 30px; height: 30px; flex: 0 0 30px; border-radius: 8px;
    background: ${p.accent}1F; display: flex; align-items: center; justify-content: center;
  }
  .chip .t { font-size: 9.5px; letter-spacing: .9px; text-transform: uppercase; color: #7A828C; font-weight: 700; }
  .chip .v { font-size: 12.5px; color: #14181D; font-weight: 600; line-height: 1.25;
             white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ---- serviços ---- */
  .services { flex: 1; padding: 24px 44px 0; }
  .services-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
  .services-head h2 { font-size: 17px; font-weight: 700; letter-spacing: -.3px; }
  .services-head span { font-size: 12.5px; color: ${p.muted}; }
  .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
  .card {
    background: ${p.surface}; border-radius: 14px; padding: 17px 18px;
    border: 1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(15,23,42,.07)"};
    box-shadow: 0 4px 14px ${dark ? "rgba(0,0,0,.35)" : "rgba(15,23,42,.05)"};
  }
  .card-num { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: ${p.accent}; }
  .card h3 { margin-top: 7px; font-size: 14.5px; font-weight: 700; letter-spacing: -.2px; color: ${dark ? "#F2F5F7" : p.ink}; }
  .card p { margin-top: 6px; font-size: 12.5px; line-height: 1.5; color: ${p.muted}; }

  /* ---- faixa de contato ---- */
  .contact {
    flex: 0 0 92px; margin-top: 22px; background: ${p.accent}; color: ${p.onAccent};
    padding: 0 44px; display: flex; align-items: center; gap: 34px;
  }
  .contact .item { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .contact .item .t { font-size: 9.5px; letter-spacing: 1px; text-transform: uppercase; opacity: .8; font-weight: 700; }
  .contact .item .v { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .contact .item.addr { max-width: 380px; }
  .contact .cta {
    margin-left: auto; background: ${p.onAccent}; color: ${p.accent};
    padding: 11px 19px; border-radius: 9px; font-size: 13px; font-weight: 700; white-space: nowrap;
  }

  .watermark {
    position: absolute; left: 74px; top: 11px; z-index: 5;
    background: rgba(190, 24, 24, .93); color: #fff; border-radius: 6px;
    font-size: 9.5px; font-weight: 700; letter-spacing: 1.1px;
    padding: 5px 10px; box-shadow: 0 3px 10px rgba(0,0,0,.3);
  }
</style>
</head>
<body>
  <div class="chrome">
    <div class="dots"><i style="background:#FF5F57"></i><i style="background:#FEBC2E"></i><i style="background:#28C840"></i></div>
    <div class="url">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#2BA24C" stroke-width="2"><path d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="5" y="11" width="14" height="9" rx="2"/></svg>
      <span>https://</span><b>${escapeHtml(domain)}</b>
    </div>
  </div>

  <div class="site">
    <nav>
      <div class="brand">
        <div class="mark">${mark}</div>
        <div>
          <div class="name">${name}</div>
          <div class="kicker">${escapeHtml(theme.label)}</div>
        </div>
      </div>
      ${navLinks}
      <span class="btn-nav">${escapeHtml(theme.primaryCta)}</span>
    </nav>

    <section class="hero">
      <div>
        <span class="eyebrow">${iconSvg(theme.icon, p.accent, 14, 1.8)} ${escapeHtml(theme.label)}</span>
        <h1>${escapeHtml(theme.headline)}</h1>
        <p class="sub">${escapeHtml(theme.subhead)}</p>
        <div class="actions">
          <span class="btn">${escapeHtml(theme.primaryCta)}</span>
          <span class="btn ghost">Como chegar</span>
        </div>
        ${ratingBlock}
      </div>

      <div class="visual">
        <div class="glow"></div>
        <div class="label">${escapeHtml(theme.label)}</div>
        <div class="glyph">${iconSvg(theme.icon, "rgba(255,255,255,.95)", 96, 1.15)}</div>
        <div class="chips">
          <div class="chip">
            <div class="ico">${iconSvg("M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z", p.accent, 16)}</div>
            <div><div class="t">Endereço</div><div class="v">${address}</div></div>
          </div>
          <div class="chip">
            <div class="ico">${iconSvg("M6.6 3h3l1.5 4-2.1 1.6a12 12 0 0 0 5.4 5.4L16 11.9l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.6 3Z", p.accent, 16)}</div>
            <div><div class="t">Telefone</div><div class="v">${phone}</div></div>
          </div>
          <div class="chip">
            <div class="ico">${iconSvg("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2", p.accent, 16)}</div>
            <div><div class="t">Atendimento</div><div class="v">Seg a sáb · 8h às 19h</div></div>
          </div>
        </div>
      </div>
    </section>

    <section class="services">
      <div class="services-head">
        <h2>Por que escolher a ${name}</h2>
        <span>${escapeHtml(theme.label)} · ${district}</span>
      </div>
      <div class="services-grid">${serviceCards}</div>
    </section>

    <section class="contact">
      <div class="item addr">
        ${iconSvg("M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z", p.onAccent, 20)}
        <div><div class="t">Onde estamos</div><div class="v">${address} · ${district}</div></div>
      </div>
      <div class="item">
        ${iconSvg("M6.6 3h3l1.5 4-2.1 1.6a12 12 0 0 0 5.4 5.4L16 11.9l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.6 3Z", p.onAccent, 20)}
        <div><div class="t">Telefone</div><div class="v">${phone}</div></div>
      </div>
      <div class="item">
        ${iconSvg("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2", p.onAccent, 20)}
        <div><div class="t">Horário</div><div class="v">Seg a sáb · 8h às 19h</div></div>
      </div>
      <span class="cta">${escapeHtml(theme.primaryCta)}</span>
    </section>
  </div>
  ${watermarkBlock}
</body>
</html>`;
}
