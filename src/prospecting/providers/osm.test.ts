import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectLeads } from "../leads.js";
import { buildQuery, mapElementToBusiness, searchBusinesses } from "./osm.js";

describe("buildQuery", () => {
  it("targets shops, crafts, offices, amenities and gyms around the point", () => {
    const query = buildQuery(-23.5613, -46.6565, 1500);
    assert.match(query, /\[out:json\]/);
    assert.match(query, /nwr\["shop"\]\(around:1500,-23\.5613,-46\.6565\);/);
    assert.match(query, /nwr\["craft"\]/);
    assert.match(query, /amenity.*restaurant\|cafe/);
    assert.match(query, /out center tags;/);
  });

  it("filters by name when a keyword is given", () => {
    assert.match(buildQuery(0, 0, 100, "padaria"), /\["name"~"padaria",i\]/);
  });

  it("strips quotes and backslashes so a keyword cannot break out of the query", () => {
    const query = buildQuery(0, 0, 100, 'pad"aria\\');
    assert.match(query, /\["name"~"padaria",i\]/);
  });
});

describe("mapElementToBusiness", () => {
  it("maps a typical siteless shop node", () => {
    const mapped = mapElementToBusiness({
      type: "node",
      id: 123,
      lat: -23.5,
      lon: -46.6,
      tags: {
        name: "Padaria do Zé",
        shop: "bakery",
        phone: "+55 11 3333-4444",
        "addr:street": "Rua Augusta",
        "addr:housenumber": "500",
        "addr:city": "São Paulo",
      },
    });

    assert.equal(mapped?.id, "node/123");
    assert.equal(mapped?.name, "Padaria do Zé");
    assert.equal(mapped?.phone, "+55 11 3333-4444");
    assert.equal(mapped?.category, "bakery");
    assert.equal(mapped?.address, "Rua Augusta, 500 - São Paulo");
    assert.equal(mapped?.website, undefined);
    assert.equal(mapped?.mapUri, "https://www.openstreetmap.org/node/123");
  });

  it("skips unnamed elements, which are not sellable leads", () => {
    assert.equal(mapElementToBusiness({ type: "node", id: 1, tags: { shop: "bakery" } }), undefined);
    assert.equal(mapElementToBusiness({ type: "node", id: 1 }), undefined);
  });

  it("reads the website from any of the common OSM tags", () => {
    const contact = mapElementToBusiness({
      type: "way",
      id: 9,
      center: { lat: 1, lon: 2 },
      tags: { name: "X", "contact:website": "https://x.com.br" },
    });
    assert.equal(contact?.website, "https://x.com.br");
  });

  it("collects social profiles declared as contact tags", () => {
    const mapped = mapElementToBusiness({
      type: "node",
      id: 7,
      lat: 1,
      lon: 2,
      tags: { name: "Salão", "contact:instagram": "https://instagram.com/salao" },
    });
    assert.deepEqual(mapped?.socialUrls, ["https://instagram.com/salao"]);
    assert.equal(selectLeads([mapped!])[0]?.reason, "so_rede_social");
  });

  it("treats contact:whatsapp as a phone, not as a stand-in website", () => {
    const mapped = mapElementToBusiness({
      type: "node",
      id: 11,
      lat: 1,
      lon: 2,
      tags: { name: "Lanchonete", "amenity": "fast_food", "contact:whatsapp": "+5511999990000" },
    });
    assert.equal(mapped?.phone, "+5511999990000");
    assert.equal(mapped?.socialUrls, undefined);
    assert.equal(selectLeads([mapped!])[0]?.reason, "sem_site");
  });

  it("marks disused shops as permanently closed", () => {
    const mapped = mapElementToBusiness({
      type: "node",
      id: 8,
      lat: 1,
      lon: 2,
      tags: { name: "Antiga Loja", "disused:shop": "bakery" },
    });
    assert.equal(mapped?.permanentlyClosed, true);
    assert.equal(selectLeads([mapped!]).length, 0);
  });

  it("uses way/relation center coordinates when there is no node position", () => {
    const mapped = mapElementToBusiness({
      type: "way",
      id: 42,
      center: { lat: -23.5, lon: -46.6 },
      tags: { name: "Mercado", shop: "supermarket" },
    });
    assert.equal(mapped?.mapUri, "https://www.openstreetmap.org/way/42");
  });
});

describe("searchBusinesses", () => {
  const okResponse = (elements: unknown[]) =>
    new Response(JSON.stringify({ elements }), { status: 200, headers: { "Content-Type": "application/json" } });

  it("falls back to the next mirror when one fails", async () => {
    const calls: string[] = [];
    const fetchMock = async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (calls.length === 1) return new Response("rate limited", { status: 429 });
      return okResponse([{ type: "node", id: 1, lat: 1, lon: 2, tags: { name: "Padaria", shop: "bakery" } }]);
    };

    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const outcome = await searchBusinesses({
        lat: 1,
        lng: 2,
        radiusMeters: 500,
        endpoints: ["https://a.example/api", "https://b.example/api"],
      });
      assert.equal(calls.length, 2);
      assert.equal(outcome.endpointUsed, "https://b.example/api");
      assert.equal(outcome.businesses.length, 1);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("throws a listing of every failed mirror when all are down", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
    try {
      await assert.rejects(
        () => searchBusinesses({ lat: 1, lng: 2, radiusMeters: 500, endpoints: ["https://a.example/api"] }),
        /Nenhum servidor Overpass respondeu[\s\S]*a\.example/,
      );
    } finally {
      globalThis.fetch = original;
    }
  });
});
