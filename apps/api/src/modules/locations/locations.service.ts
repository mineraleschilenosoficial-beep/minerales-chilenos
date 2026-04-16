import { Injectable } from "@nestjs/common";
import type { LocationCommunesQuery, LocationRegionsQuery } from "@minerales/contracts";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @description Lists active countries for location catalogs.
   * @returns Active countries ordered by name.
   */
  async listCountries() {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        code: true,
        name: true,
        dialCode: true,
        emoji: true
      }
    });

    return {
      total: countries.length,
      items: countries.map((country: Awaited<typeof countries>[number]) => ({
        code: country.code,
        name: country.name,
        dialCode: country.dialCode ?? undefined,
        emoji: country.emoji ?? undefined
      }))
    };
  }

  /**
   * @description Lists active regions filtered by country code.
   * @param query Region query containing country code.
   * @returns Active regions ordered by name.
   */
  async listRegions(query: LocationRegionsQuery) {
    const regions = await this.prisma.region.findMany({
      where: {
        isActive: true,
        countryCode: query.countryCode
      },
      orderBy: { name: "asc" },
      select: {
        code: true,
        name: true,
        countryCode: true
      }
    });

    return {
      total: regions.length,
      items: regions
    };
  }

  /**
   * @description Lists active communes for one region code.
   * @param query Commune query containing region code.
   * @returns Active communes ordered by name.
   */
  async listCommunes(query: LocationCommunesQuery) {
    const communes = await this.prisma.commune.findMany({
      where: {
        isActive: true,
        region: {
          code: query.regionCode
        }
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        identifier: true,
        region: {
          select: {
            code: true,
            countryCode: true
          }
        }
      }
    });

    return {
      total: communes.length,
      items: communes.map((commune: Awaited<typeof communes>[number]) => ({
        id: commune.id,
        name: commune.name,
        identifier: commune.identifier ?? undefined,
        regionCode: commune.region.code,
        countryCode: commune.region.countryCode
      }))
    };
  }
}
