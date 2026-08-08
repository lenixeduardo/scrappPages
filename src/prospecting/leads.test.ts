import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyLead, selectLeads, toCsv, type Business } from "./leads.js";

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Comércio Teste",
    phone: "(11) 99999-0000",
    ...overrides,
  };
}

describe("classifyLead", () => {
  it("flags businesses with no website at all", () => {
    assert.equal(classifyLead(business()), "sem_site");
  });

  it("flags the discontinued Google Business site builder", () => {
    assert.equal(classifyLead(business({ website: "https://padaria-x.business.site" })), "site_google_desativado");
    assert.equal(classifyLead(business({ website: "https://loja.negocio.site/" })), "site_google_desativado");
  });

  it("flags social and marketplace profiles used as a website", () => {
    for (const url of [
      "https://www.instagram.com/padariax",
      "https://facebook.com/padariax",
      "https://linktr.ee/padariax",
      "https://wa.me/5511999990000",
      "https://www.ifood.com.br/delivery/padariax",
    ]) {
      assert.equal(classifyLead(business({ website: url })), "so_rede_social", url);
    }
  });

  it("flags a business whose only web presence is a social tag", () => {
    assert.equal(
      classifyLead(business({ socialUrls: ["https://instagram.com/loja"] })),
      "so_rede_social",
    );
  });

  it("does not flag a real website", () => {
    assert.equal(classifyLead(business({ website: "https://padariax.com.br" })), undefined);
  });

  it("accepts schemeless websites, which OSM data commonly contains", () => {
    assert.equal(classifyLead(business({ website: "padariax.com.br" })), undefined);
    assert.equal(classifyLead(business({ website: "instagram.com/padariax" })), "so_rede_social");
  });

  it("treats a malformed website value as no website", () => {
    assert.equal(classifyLead(business({ website: "nao-e-uma-url" })), "sem_site");
  });

  it("matches subdomains of social hosts", () => {
    assert.equal(classifyLead(business({ website: "https://pt-br.facebook.com/loja" })), "so_rede_social");
  });
});

describe("selectLeads", () => {
  it("drops permanently closed businesses", () => {
    assert.equal(selectLeads([business({ permanentlyClosed: true }), business()]).length, 1);
  });

  it("drops temporarily closed businesses unless asked", () => {
    const input = [business({ temporarilyClosed: true })];
    assert.equal(selectLeads(input).length, 0);
    assert.equal(selectLeads(input, { includeClosedTemporarily: true }).length, 1);
  });

  it("drops unnamed records", () => {
    assert.equal(selectLeads([business({ name: "" })]).length, 0);
  });

  it("dedupes repeated ids across providers and pages", () => {
    const duplicated = business({ id: "same-id" });
    assert.equal(selectLeads([duplicated, { ...duplicated }]).length, 1);
  });

  it("excludes social-only leads when includeSocialOnly is false", () => {
    const input = [business({ website: "https://instagram.com/x" }), business()];
    assert.equal(selectLeads(input, { includeSocialOnly: false }).length, 1);
  });

  it("can require a public phone number", () => {
    const input = [business({ phone: undefined }), business()];
    assert.equal(selectLeads(input, { requirePhone: true }).length, 1);
  });

  it("ranks contactable, well-reviewed businesses first", () => {
    const weak = business({ id: "weak", phone: undefined });
    const strong = business({ id: "strong", reviews: 250, rating: 4.8 });
    assert.equal(selectLeads([weak, strong])[0]?.id, "strong");
  });

  it("omits currentUrl for businesses that never had any link", () => {
    assert.equal(selectLeads([business()])[0]?.currentUrl, undefined);
  });
});

describe("toCsv", () => {
  it("emits a header plus one row per lead", () => {
    const csv = toCsv(selectLeads([business({ name: "Padaria A" })]));
    const lines = csv.split("\n");
    assert.equal(lines.length, 2);
    assert.match(lines[0]!, /^nome,motivo,telefone/);
    assert.match(lines[1]!, /^Padaria A,/);
  });

  it("escapes commas and quotes in business names", () => {
    const csv = toCsv(selectLeads([business({ name: 'Bar "do Zé", Ltda' })]));
    assert.match(csv, /"Bar ""do Zé"", Ltda"/);
  });
});
