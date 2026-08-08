import { parseArgs } from "node:util";

import { config } from "../config.js";
import { formatLead, toCsv } from "../prospecting/leads.js";
import { prospect } from "../prospecting/prospect.js";

const { values } = parseArgs({
  options: {
    location: { type: "string" },
    keyword: { type: "string" },
    type: { type: "string" },
    radius: { type: "string" },
    leads: { type: "string" },
    scan: { type: "string" },
    csv: { type: "boolean" },
    json: { type: "boolean" },
  },
});

if (!config.googleMapsApiKey) {
  console.error(
    "GOOGLE_MAPS_API_KEY não configurada. Defina no .env ou no ambiente antes de rodar a prospecção.",
  );
  process.exit(1);
}

const result = await prospect(
  {
    location: values.location,
    keyword: values.keyword,
    type: values.type,
    radiusMeters: values.radius ? Number(values.radius) : undefined,
    targetLeads: values.leads ? Number(values.leads) : undefined,
    maxPlacesScanned: values.scan ? Number(values.scan) : undefined,
  },
  config.googleMapsApiKey,
);

if (values.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (values.csv) {
  console.log(toCsv(result.leads));
} else {
  console.log(
    `${result.leads.length} lead(s) em torno de "${result.origin.formattedAddress}" (raio ${result.radiusMeters}m).`,
  );
  console.log(`Analisados: ${result.scanned} | Categorias: ${result.queriesUsed.join(", ")}\n`);
  console.log(result.leads.map((lead, index) => formatLead(lead, index + 1)).join("\n\n"));
  if (!result.reachedTarget) {
    console.log(`\nMeta de ${result.targetLeads} leads não atingida — aumente --radius ou --scan.`);
  }
}
