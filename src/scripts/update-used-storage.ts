import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseSizeToBytes(size: string | null | undefined): bigint {
  if (!size) return 0n;
  const raw = String(size).trim().toLowerCase();

  // If it's a plain integer string (bytes)
  if (/^\d+$/.test(raw)) {
    try {
      return BigInt(raw);
    } catch {
      return 0n;
    }
  }

  // Try formats like "123 kb", "1.5 mb", etc.
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)$/i);
  if (match) {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const factorMap: Record<string, number> = {
      b: 1,
      kb: 1024,
      mb: 1024 ** 2,
      gb: 1024 ** 3,
      tb: 1024 ** 4,
    };
    const factor = factorMap[unit] ?? 1;
    const bytes = Math.floor(value * factor);
    try {
      return BigInt(bytes);
    } catch {
      return 0n;
    }
  }

  // Fallback: extract first number
  const num = raw.match(/\d+/)?.[0];
  if (num) {
    try {
      return BigInt(num);
    } catch {
      return 0n;
    }
  }

  return 0n;
}

async function recalculateOrganizationUsedStorage(): Promise<void> {
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });
  console.log(
    `Found ${organizations.length} organizations. Recalculating UsedStorage...`
  );

  let updatedCount = 0;

  for (const organization of organizations) {
    const files = await prisma.file.findMany({
      where: { organization_id: organization.id },
      select: { size: true },
    });

    let totalBytes = 0n;
    for (const f of files) {
      totalBytes += parseSizeToBytes(f.size as unknown as string);
    }

    const totalBytesNumber = Number(totalBytes);

    await prisma.organization.update({
      where: { id: organization.id },
      data: { UsedStorage: totalBytesNumber },
    });

    updatedCount += 1;
    console.log(
      `Organization ${organization.id} - ${
        organization.name ?? "(no name)"
      }: ${totalBytesNumber} bytes`
    );
  }

  console.log(`Updated UsedStorage for ${updatedCount} organizations.`);
}

recalculateOrganizationUsedStorage()
  .catch((err) => {
    console.error("Failed to recalculate UsedStorage:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
