import { prisma } from "@/lib/prisma";

type IncidentInput = {
  ruleId: string;
  title: string;
  description: string;
  severity: string;
};

export async function openIncidentIfNotExists(input: IncidentInput) {
  const existing = await prisma.incident.findFirst({
    where: {
      rule_id: input.ruleId,
      status: { not: "resolved" },
    },
  });

  if (existing) return;

  await prisma.incident.create({
    data: {
      rule_id: input.ruleId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: "open",
    },
  });
}

export async function resolveIncident(ruleId: string) {
  await prisma.incident.updateMany({
    where: {
      rule_id: ruleId,
      status: { not: "resolved" },
    },
    data: {
      status: "resolved",
    },
  });
}
