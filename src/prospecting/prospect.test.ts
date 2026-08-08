import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { prospect } from "./prospect.js";

const NOMINATIM_RESPONSE = [
  { lat: "-23.5613", lon: "-46.6565", display_name: "Avenida Paulista, São Paulo, Brasil" },
];

function overpassElement(id: number, tags: Record<string, string>) {
  return { type: "node", id, lat: -23.56, lon: -46.65, tags };
}

/** Routes Nominatim vs Overpass by URL so prospect() runs its real code path. */
function stubNetwork(elements: unknown[]) {
  return mock.fn(async (input: string | URL | Request) => {
    const url = String(typeof input === "object" && "url" in input ? input.url : input);
    const body = url.includes("nominatim") ? NOMINATIM_RESPONSE : { elements };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("prospect via OpenStreetMap", () => {
  it("returns ranked leads and reports zero billable calls", async (t) => {
    const elements = [
      overpassElement(1, { name: "Padaria Sem Site", shop: "bakery", phone: "+55 11 3333-0001" }),
      overpassElement(2, { name: "Loja Com Site", shop: "clothes", website: "https://lojacomsite.com.br" }),
      overpassElement(3, { name: "Salão Insta", shop: "hairdresser", "contact:instagram": "https://instagram.com/salao" }),
      overpassElement(4, { name: "Pet Shop Google", shop: "pet", website: "https://petshop.business.site" }),
    ];

    const fetchMock = stubNetwork(elements);
    t.mock.method(globalThis, "fetch", fetchMock);

    const result = await prospect({ location: "Avenida Paulista", targetLeads: 10 });

    assert.equal(result.provider, "osm");
    assert.equal(result.billableCalls, 0);
    assert.equal(result.origin.formattedAddress, "Avenida Paulista, São Paulo, Brasil");

    const names = result.leads.map((lead) => lead.name);
    assert.ok(!names.includes("Loja Com Site"), "business with a real site must not be a lead");
    assert.equal(result.leads.length, 3);
    assert.equal(names[0], "Padaria Sem Site", "contactable lead should rank first");

    const reasons = Object.fromEntries(result.leads.map((lead) => [lead.name, lead.reason]));
    assert.equal(reasons["Padaria Sem Site"], "sem_site");
    assert.equal(reasons["Salão Insta"], "so_rede_social");
    assert.equal(reasons["Pet Shop Google"], "site_google_desativado");
  });

  it("caps the result at targetLeads and reports the target as reached", async (t) => {
    const elements = Array.from({ length: 25 }, (_, index) =>
      overpassElement(index + 1, { name: `Comércio ${index + 1}`, shop: "bakery", phone: "+55 11 90000-0000" }),
    );
    t.mock.method(globalThis, "fetch", stubNetwork(elements));

    const result = await prospect({ location: "Avenida Paulista", targetLeads: 10 });

    assert.equal(result.leads.length, 10);
    assert.equal(result.reachedTarget, true);
    assert.equal(result.scanned, 25);
  });

  it("flags when the target could not be met", async (t) => {
    t.mock.method(globalThis, "fetch", stubNetwork([overpassElement(1, { name: "Única", shop: "bakery" })]));

    const result = await prospect({ location: "Avenida Paulista", targetLeads: 10 });

    assert.equal(result.leads.length, 1);
    assert.equal(result.reachedTarget, false);
  });

  it("refuses the paid provider when no API key is configured", async () => {
    await assert.rejects(
      () => prospect({ provider: "google" }),
      /exige GOOGLE_MAPS_API_KEY/,
    );
  });
});
