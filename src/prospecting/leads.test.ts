import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyLead, selectLeads, toCsv, type PlaceRecord } from "./leads.js";

function place(overrides: Partial<PlaceRecord> = {}): PlaceRecord {
  return {
    id: Math.random().toString(36).slice(2),
    displayName: { text: "Comércio Teste" },
    nationalPhoneNumber: "(11) 99999-0000",
    ...overrides,
  };
}

describe("classifyLead", () => {
  it("flags places with no website at all", () => {
    assert.equal(classifyLead(place()), "sem_site");
  });

  it("flags the discontinued Google Business site builder", () => {
    assert.equal(classifyLead(place({ websiteUri: "https://padaria-x.business.site" })), "site_google_desativado");
    assert.equal(classifyLead(place({ websiteUri: "https://loja.negocio.site/" })), "site_google_desativado");
  });

  it("flags social and marketplace profiles used as a website", () => {
    for (const url of [
      "https://www.instagram.com/padariax",
      "https://facebook.com/padariax",
      "https://linktr.ee/padariax",
      "https://wa.me/5511999990000",
      "https://www.ifood.com.br/delivery/padariax",
    ]) {
      assert.equal(classifyLead(place({ websiteUri: url })), "so_rede_social", url);
    }
  });

  it("does not flag a real website", () => {
    assert.equal(classifyLead(place({ websiteUri: "https://padariax.com.br" })), undefined);
  });

  it("treats a malformed website value as no website", () => {
    assert.equal(classifyLead(place({ websiteUri: "nao-e-uma-url" })), "sem_site");
  });

  it("matches subdomains of social hosts", () => {
    assert.equal(classifyLead(place({ websiteUri: "https://pt-br.facebook.com/loja" })), "so_rede_social");
  });
});

describe("selectLeads", () => {
  it("drops permanently closed businesses", () => {
    const leads = selectLeads([place({ businessStatus: "CLOSED_PERMANENTLY" }), place()]);
    assert.equal(leads.length, 1);
  });

  it("drops temporarily closed businesses unless asked", () => {
    const input = [place({ businessStatus: "CLOSED_TEMPORARILY" })];
    assert.equal(selectLeads(input).length, 0);
    assert.equal(selectLeads(input, { includeClosedTemporarily: true }).length, 1);
  });

  it("dedupes repeated place ids across category fan-out", () => {
    const duplicated = place({ id: "same-id" });
    assert.equal(selectLeads([duplicated, { ...duplicated }]).length, 1);
  });

  it("excludes social-only leads when includeSocialOnly is false", () => {
    const input = [place({ websiteUri: "https://instagram.com/x" }), place()];
    assert.equal(selectLeads(input, { includeSocialOnly: false }).length, 1);
  });

  it("can require a public phone number", () => {
    const input = [place({ nationalPhoneNumber: undefined, internationalPhoneNumber: undefined }), place()];
    assert.equal(selectLeads(input, { requirePhone: true }).length, 1);
  });

  it("ranks contactable, well-reviewed businesses first", () => {
    const weak = place({ id: "weak", nationalPhoneNumber: undefined, internationalPhoneNumber: undefined });
    const strong = place({ id: "strong", userRatingCount: 250, rating: 4.8 });
    const leads = selectLeads([weak, strong]);
    assert.equal(leads[0]?.placeId, "strong");
  });

  it("omits currentUrl for places that never had a site", () => {
    const [lead] = selectLeads([place()]);
    assert.equal(lead?.currentUrl, undefined);
  });
});

describe("toCsv", () => {
  it("emits a header plus one row per lead", () => {
    const csv = toCsv(selectLeads([place({ displayName: { text: "Padaria A" } })]));
    const lines = csv.split("\n");
    assert.equal(lines.length, 2);
    assert.match(lines[0]!, /^nome,motivo,telefone/);
    assert.match(lines[1]!, /^Padaria A,/);
  });

  it("escapes commas and quotes in business names", () => {
    const csv = toCsv(selectLeads([place({ displayName: { text: 'Bar "do Zé", Ltda' } })]));
    assert.match(csv, /"Bar ""do Zé"", Ltda"/);
  });
});
